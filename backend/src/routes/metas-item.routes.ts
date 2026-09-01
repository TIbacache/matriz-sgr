import { Router } from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { requireAuth, type AuthPayload } from "../middleware/auth.js";
import { requireRol } from "../middleware/roles.js";
import { emitEvent, roomOrganizacion, roomUnidad } from "../services/broadcast.js";
import { auditarDesde } from "../services/auditoria.js";
import { actualizarConVersion, resolverVersion } from "../services/concurrencia.js";
import { unidadesVisibles } from "../services/alcance.js";

// Metas y ponderadores por FUNCIONARIO — RF-006 · RF-007 · RN-001 · RN-002 ·
// HU-05 · ADR-005 · ADR-006.
//
// Es la pieza que faltaba entre `cargo → ítems` y el cálculo: sin ella las
// metas solo entraban por el seed. La entidad `MetaItem` ya existía en el
// modelo v2 (migración `modelo_v2_especificacion_oficial`) con su índice único
// (periodo, ítem, funcionario) y sus CHECK de meta > 0 y ponderador en rango;
// aquí se le abre la puerta, no se crea nada nuevo.
//
// ⚠ La ruta es `/metas-item` y NO `/metas`: esa la ocupa el modelo v1, que mide
// unidad × categoría × trimestre. Son dos cosas distintas y mezclarlas dejaría
// dos verdades sobre la misma palabra.
//
// Reglas que este módulo hace cumplir:
// - RN-001: los ponderadores de un funcionario en un período suman 100%. El
//   alta unitaria rechaza SUPERAR el 100% (se cargan de a una, igual que las
//   metas v1 — decisión 4 de Fase 2) e informa siempre cuánto falta; la carga
//   en lote (`PUT`) sí exige el 100% exacto, y es la operación que permite
//   dejar a una persona configurada de una vez.
// - RN-002: meta > 0. Un ítem con meta 0 no es medible y el motor lo cuenta
//   como 0% para siempre.
// - RF-003: el ítem debe pertenecer al cargo del funcionario. Ponerle una meta
//   de un ítem que no se le mide es la forma silenciosa de falsear un puntaje.
// - RN-013: un período cerrado no admite cambios de metas. RF-007 pide que las
//   metas "rijan desde el período": el versionado es exactamente eso — la meta
//   cuelga de `periodoId`, así que reconfigurar el trimestre siguiente jamás
//   toca el cerrado.
// - Todo write audita (RNF-008) y emite su evento (Documento Maestro §9).

export const metasItemRouter = Router();
metasItemRouter.use(requireAuth);

/**
 * RN-001: tolerancia al comparar la suma con el 100%.
 *
 * No es un valor de negocio configurable (el 100% lo fija la regla, no el
 * cliente): es el ULP de la columna `ponderador Decimal(5,4)`. Existe para que
 * repartos con decimales periódicos (tres ítems a 33,33%) no queden bloqueados
 * por el último dígito que la base puede representar.
 */
const TOLERANCIA_PONDERADOR = 0.0001;

const versionSchema = z.object({ version: z.number().int().positive() });

// El ponderador viaja como fracción 0..1 (0.25 = 25%), igual que en `/metas`
// del modelo v1 y que en la columna. Los mensajes de error lo dicen también en
// porcentaje, que es como lo piensa quien configura.
const metaBaseSchema = z.object({
  metaValor: z.number().positive("La meta debe ser mayor que 0 (RN-002)"),
  ponderador: z
    .number()
    .gt(0, "El ponderador debe ser mayor que 0")
    .max(1, "El ponderador es una fracción de 0 a 1 (0.25 = 25%)"),
});

const metaCrearSchema = metaBaseSchema.extend({
  periodoId: z.string().uuid(),
  itemId: z.string().uuid(),
  funcionarioId: z.string().uuid(),
});

const metaLoteSchema = z.object({
  periodoId: z.string().uuid(),
  funcionarioId: z.string().uuid(),
  metas: z
    .array(
      metaBaseSchema.extend({
        itemId: z.string().uuid(),
        // Obligatoria para las metas que YA existen: sin ella el conjunto se
        // sobrescribiría a ciegas (CA-08). Las nuevas no la llevan.
        version: z.number().int().positive().optional(),
      })
    )
    .min(1),
});

/** Aborta la transacción del `PUT` cuando una meta cambió bajo los pies. */
class ConflictoDeVersion extends Error {}

const incluir = {
  item: {
    select: { id: true, nombre: true, tipo: true, direccion: true, activo: true, cargoId: true },
  },
  funcionario: { select: { id: true, nombre: true } },
  periodo: { select: { id: true, nombre: true, estado: true } },
} satisfies Prisma.MetaItemInclude;

const pct = (fraccion: number) => `${Math.round(fraccion * 1000) / 10}%`;

// ------------------------------------------------------------- HELPERS ---

/**
 * RN-001: suma de ponderadores del funcionario en el período. `excluirId`
 * permite recalcular como quedaría al editar una meta ya existente sin
 * contarla dos veces.
 */
async function resumenPonderadores(
  organizationId: string,
  periodoId: string,
  funcionarioId: string,
  excluirId?: string
): Promise<{ suma: number; metas: number }> {
  const filas = await prisma.metaItem.findMany({
    where: {
      organizationId,
      periodoId,
      funcionarioId,
      ...(excluirId ? { id: { not: excluirId } } : {}),
    },
    select: { ponderador: true },
  });
  const suma = filas.reduce((s, f) => s + f.ponderador.toNumber(), 0);
  return { suma: Math.round(suma * 10_000) / 10_000, metas: filas.length };
}

/**
 * Contexto compartido por todas las escrituras: período abierto del tenant,
 * funcionario que es miembro y su cargo. Devuelve la respuesta ya resuelta
 * cuando algo falla, para que el controlador solo haga `if ("error" in ctx)`.
 */
async function contextoEscritura(
  organizationId: string,
  periodoId: string,
  funcionarioId: string
): Promise<
  | { error: { status: number; cuerpo: Record<string, unknown> } }
  | { periodo: { id: string; nombre: string }; cargoId: string | null; unidadTerritorialId: string | null }
> {
  const [periodo, miembro] = await Promise.all([
    prisma.periodo.findFirst({ where: { id: periodoId, organizationId } }),
    prisma.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId, userId: funcionarioId } },
      select: { cargoId: true, unidadTerritorialId: true },
    }),
  ]);
  // Multi-tenant: lo ajeno no existe (404), nunca 403.
  if (!periodo) return { error: { status: 404, cuerpo: { error: "Período no encontrado" } } };
  if (!miembro) {
    return { error: { status: 404, cuerpo: { error: "Funcionario no encontrado en la organización" } } };
  }
  if (periodo.estado !== "abierto") {
    return {
      error: {
        status: 422,
        cuerpo: {
          error: `El período "${periodo.nombre}" está cerrado: sus metas ya no se modifican (RN-013). Configura el período siguiente.`,
        },
      },
    };
  }
  return { periodo, cargoId: miembro.cargoId, unidadTerritorialId: miembro.unidadTerritorialId };
}

/**
 * RF-003: el ítem debe existir en el tenant, estar activo y pertenecer al cargo
 * del funcionario. Es la coherencia "cargo → ítems → metas" que hace al sistema
 * configurable sin tocar código.
 */
async function validarItemDelCargo(
  organizationId: string,
  itemId: string,
  cargoId: string | null
): Promise<{ status: number; cuerpo: Record<string, unknown> } | null> {
  const item = await prisma.itemMedicion.findFirst({
    where: { id: itemId, organizationId },
    select: { id: true, nombre: true, activo: true, cargoId: true, cargo: { select: { nombre: true } } },
  });
  if (!item) return { status: 404, cuerpo: { error: "Ítem de medición no encontrado" } };
  if (!cargoId) {
    return {
      status: 422,
      cuerpo: {
        error:
          "El funcionario no tiene cargo asignado: sin cargo no se sabe qué ítems se le miden (RF-003). Asígnaselo antes de configurar metas.",
      },
    };
  }
  if (item.cargoId !== cargoId) {
    return {
      status: 422,
      cuerpo: {
        error: `El ítem "${item.nombre}" pertenece al cargo "${item.cargo.nombre}", que no es el del funcionario (RF-003)`,
      },
    };
  }
  if (!item.activo) {
    return {
      status: 422,
      cuerpo: { error: `El ítem "${item.nombre}" está desactivado: no se le pueden fijar metas nuevas` },
    };
  }
  return null;
}

/**
 * No se borra una meta cuyo ítem ya acumuló avance validado: hacerlo dejaría
 * puntaje aprobado sin dónde sumar y el total cambiaría sin rastro visible
 * (RN-009, CA-01 — una aprobación no se revierte).
 */
async function tieneAvanceValidado(
  organizationId: string,
  periodoId: string,
  funcionarioId: string,
  itemId: string
): Promise<boolean> {
  const actividad = await prisma.actividad.findFirst({
    where: {
      organizationId,
      periodoId,
      funcionarioId,
      itemId,
      anulada: false,
      evidencias: { some: { validaciones: { some: { decision: "aprobada" } } } },
    },
    select: { id: true },
  });
  return actividad !== null;
}

/**
 * Regla 9: el libro es privado por delegación. Las metas de una persona son
 * parte de su libro, así que se ven las de las delegaciones visibles para el
 * rol — más las propias siempre, porque nadie puede quedar sin ver lo que se
 * le mide (RF-008). Devuelve null cuando el rol ve toda la organización.
 */
async function funcionariosVisibles(auth: AuthPayload): Promise<string[] | null> {
  const unidades = await unidadesVisibles(auth);
  if (unidades === null) return null;
  const miembros = await prisma.organizationMember.findMany({
    where: { organizationId: auth.organizationId, unidadTerritorialId: { in: unidades } },
    select: { userId: true },
  });
  return [...new Set([...miembros.map((m) => m.userId), auth.userId])];
}

// ---------------------------------------------------------------- LECTURA ---

// GET /metas-item?periodo=&funcionario=&item=
//
// Devuelve las metas y, junto a ellas, el `resumen` por funcionario con la suma
// de ponderadores y si cumple RN-001: la pantalla de configuración necesita
// decir "falta 15%" antes de guardar, no después.
metasItemRouter.get("/", async (req, res) => {
  const auth = req.auth!;
  const periodoId = typeof req.query.periodo === "string" ? req.query.periodo : undefined;
  const funcionarioId = typeof req.query.funcionario === "string" ? req.query.funcionario : undefined;
  const itemId = typeof req.query.item === "string" ? req.query.item : undefined;

  const visibles = await funcionariosVisibles(auth);
  if (funcionarioId && visibles !== null && !visibles.includes(funcionarioId)) {
    // Delegación ajena: 404, no 403 (regla 8).
    return res.status(404).json({ error: "Funcionario no encontrado" });
  }

  const metas = await prisma.metaItem.findMany({
    where: {
      organizationId: auth.organizationId,
      ...(periodoId ? { periodoId } : {}),
      ...(itemId ? { itemId } : {}),
      ...(funcionarioId ? { funcionarioId } : visibles === null ? {} : { funcionarioId: { in: visibles } }),
    },
    include: incluir,
    orderBy: [{ funcionario: { nombre: "asc" } }, { item: { orden: "asc" } }],
  });

  // Resumen por (período, funcionario): es lo que hace verificable RN-001.
  const porClave = new Map<string, { periodoId: string; funcionarioId: string; nombre: string; suma: number; metas: number }>();
  for (const m of metas) {
    const clave = `${m.periodoId}|${m.funcionarioId}`;
    const acc =
      porClave.get(clave) ??
      { periodoId: m.periodoId, funcionarioId: m.funcionarioId, nombre: m.funcionario.nombre, suma: 0, metas: 0 };
    acc.suma += m.ponderador.toNumber();
    acc.metas += 1;
    porClave.set(clave, acc);
  }

  res.json({
    total: metas.length,
    metas,
    resumen: [...porClave.values()].map((r) => {
      const suma = Math.round(r.suma * 10_000) / 10_000;
      return {
        ...r,
        suma,
        sumaPonderadores: suma,
        // RN-001 explícito: la UI no tiene que redescubrir la regla.
        cumpleRN001: Math.abs(suma - 1) <= TOLERANCIA_PONDERADOR,
        faltante: Math.round((1 - suma) * 10_000) / 10_000,
      };
    }),
  });
});

// -------------------------------------------------------------- ESCRITURA ---

// POST /metas-item — alta unitaria.
metasItemRouter.post("/", requireRol("admin", "supervisor"), async (req, res) => {
  const parsed = metaCrearSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Datos inválidos", detalle: parsed.error.issues });
  const auth = req.auth!;
  const { periodoId, itemId, funcionarioId, metaValor, ponderador } = parsed.data;

  const ctx = await contextoEscritura(auth.organizationId, periodoId, funcionarioId);
  if ("error" in ctx) return res.status(ctx.error.status).json(ctx.error.cuerpo);

  const problemaItem = await validarItemDelCargo(auth.organizationId, itemId, ctx.cargoId);
  if (problemaItem) return res.status(problemaItem.status).json(problemaItem.cuerpo);

  const duplicada = await prisma.metaItem.findUnique({
    where: { periodoId_itemId_funcionarioId: { periodoId, itemId, funcionarioId } },
    select: { id: true },
  });
  if (duplicada) {
    return res.status(422).json({
      error: "Esa persona ya tiene una meta para ese ítem en este período: edítala en vez de crear otra",
      metaId: duplicada.id,
    });
  }

  // RN-001: se rechaza SUPERAR el 100%; quedarse corto se informa, porque las
  // metas se cargan de a una y el conjunto se completa después.
  const previo = await resumenPonderadores(auth.organizationId, periodoId, funcionarioId);
  const suma = Math.round((previo.suma + ponderador) * 10_000) / 10_000;
  if (suma > 1 + TOLERANCIA_PONDERADOR) {
    return res.status(422).json({
      error: `Los ponderadores de un funcionario no pueden superar el 100% (RN-001): ya tiene ${pct(previo.suma)} y esta meta suma ${pct(ponderador)}`,
      sumaPonderadores: previo.suma,
      disponible: Math.round((1 - previo.suma) * 10_000) / 10_000,
    });
  }

  const meta = await prisma.metaItem.create({
    data: {
      organizationId: auth.organizationId,
      periodoId,
      itemId,
      funcionarioId,
      metaValor: new Prisma.Decimal(metaValor),
      ponderador: new Prisma.Decimal(ponderador),
    },
    include: incluir,
  });

  await auditarDesde(auth, req)({ accion: "crear", entidad: "meta_item", entidadId: meta.id, valorNuevo: meta });
  // `periodoId` y `funcionarioId` van en la raíz de TODAS las cargas de
  // `meta_item:*`: es lo único que el oyente necesita para saber si le toca
  // releer, y tenerlo en unas sí y en otras no obligaría a inspeccionar el tipo
  // de evento antes de leerlo.
  const carga = {
    periodoId,
    funcionarioId,
    meta,
    sumaPonderadores: suma,
    cumpleRN001: Math.abs(suma - 1) <= TOLERANCIA_PONDERADOR,
  };
  if (ctx.unidadTerritorialId) emitEvent(roomUnidad(ctx.unidadTerritorialId), "meta_item:creada", carga);
  // Cambiar una meta mueve el puntaje de esa persona: el tablero debe releer.
  emitEvent(roomOrganizacion(auth.organizationId), "cumplimiento:cambiado", { periodoId, funcionarioId });
  res.status(201).json(carga);
});

// PATCH /metas-item/:id — solo meta y ponderador; período, ítem y funcionario
// identifican la fila y moverlos sería crear otra meta, no editar esta.
metasItemRouter.patch("/:id", requireRol("admin", "supervisor"), async (req, res) => {
  const parsed = metaBaseSchema.partial().extend(versionSchema.shape).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Datos inválidos", detalle: parsed.error.issues });
  const auth = req.auth!;
  const id = String(req.params.id);

  const anterior = await prisma.metaItem.findFirst({
    where: { id, organizationId: auth.organizationId },
    include: incluir,
  });
  if (!anterior) return res.status(404).json({ error: "No encontrado" });

  const ctx = await contextoEscritura(auth.organizationId, anterior.periodoId, anterior.funcionarioId);
  if ("error" in ctx) return res.status(ctx.error.status).json(ctx.error.cuerpo);

  const { version, ...cambios } = parsed.data;
  const nuevoPonderador = cambios.ponderador ?? anterior.ponderador.toNumber();
  const resto = await resumenPonderadores(auth.organizationId, anterior.periodoId, anterior.funcionarioId, id);
  const suma = Math.round((resto.suma + nuevoPonderador) * 10_000) / 10_000;
  if (suma > 1 + TOLERANCIA_PONDERADOR) {
    return res.status(422).json({
      error: `Los ponderadores de un funcionario no pueden superar el 100% (RN-001): el resto de sus ítems ya suma ${pct(resto.suma)}`,
      sumaPonderadores: resto.suma,
      disponible: Math.round((1 - resto.suma) * 10_000) / 10_000,
    });
  }

  const resultado = await actualizarConVersion({
    actualizar: async () =>
      (
        await prisma.metaItem.updateMany({
          where: { id, organizationId: auth.organizationId, version },
          data: {
            ...(cambios.metaValor !== undefined ? { metaValor: new Prisma.Decimal(cambios.metaValor) } : {}),
            ...(cambios.ponderador !== undefined ? { ponderador: new Prisma.Decimal(cambios.ponderador) } : {}),
            version: { increment: 1 },
          },
        })
      ).count,
    releer: () => prisma.metaItem.findFirst({ where: { id, organizationId: auth.organizationId }, include: incluir }),
  });
  const meta = resolverVersion(res, resultado, "la meta");
  if (!meta) return;

  await auditarDesde(auth, req)({
    accion: "actualizar",
    entidad: "meta_item",
    entidadId: meta.id,
    valorAnterior: anterior,
    valorNuevo: meta,
  });
  const carga = {
    periodoId: anterior.periodoId,
    funcionarioId: anterior.funcionarioId,
    meta,
    sumaPonderadores: suma,
    cumpleRN001: Math.abs(suma - 1) <= TOLERANCIA_PONDERADOR,
  };
  if (ctx.unidadTerritorialId) emitEvent(roomUnidad(ctx.unidadTerritorialId), "meta_item:actualizada", carga);
  emitEvent(roomOrganizacion(auth.organizationId), "cumplimiento:cambiado", {
    periodoId: anterior.periodoId,
    funcionarioId: anterior.funcionarioId,
  });
  res.json(carga);
});

// DELETE /metas-item/:id — quitar un ítem del conjunto de una persona.
//
// A diferencia de cargos e ítems, una meta SÍ se borra: no es historia, es
// configuración del período, y si no pudiera quitarse el ponderador quedaría
// ocupado para siempre y RN-001 sería inalcanzable. Lo que sí se protege es la
// meta que ya acumuló avance aprobado.
metasItemRouter.delete("/:id", requireRol("admin", "supervisor"), async (req, res) => {
  const auth = req.auth!;
  const id = String(req.params.id);

  const meta = await prisma.metaItem.findFirst({
    where: { id, organizationId: auth.organizationId },
    include: incluir,
  });
  if (!meta) return res.status(404).json({ error: "No encontrado" });

  const ctx = await contextoEscritura(auth.organizationId, meta.periodoId, meta.funcionarioId);
  if ("error" in ctx) return res.status(ctx.error.status).json(ctx.error.cuerpo);

  if (await tieneAvanceValidado(auth.organizationId, meta.periodoId, meta.funcionarioId, meta.itemId)) {
    return res.status(422).json({
      error: `El ítem "${meta.item.nombre}" ya tiene actividades aprobadas en este período: quitar su meta borraría puntaje ya validado (RN-009). Ajusta su meta o su ponderador.`,
      accionSugerida: `PATCH /metas-item/${meta.id}`,
    });
  }

  await prisma.metaItem.delete({ where: { id: meta.id } });

  await auditarDesde(auth, req)({
    accion: "eliminar",
    entidad: "meta_item",
    entidadId: meta.id,
    valorAnterior: meta,
  });
  const resto = await resumenPonderadores(auth.organizationId, meta.periodoId, meta.funcionarioId);
  const carga = {
    id: meta.id,
    periodoId: meta.periodoId,
    funcionarioId: meta.funcionarioId,
    sumaPonderadores: resto.suma,
    cumpleRN001: Math.abs(resto.suma - 1) <= TOLERANCIA_PONDERADOR,
  };
  if (ctx.unidadTerritorialId) emitEvent(roomUnidad(ctx.unidadTerritorialId), "meta_item:eliminada", carga);
  emitEvent(roomOrganizacion(auth.organizationId), "cumplimiento:cambiado", {
    periodoId: meta.periodoId,
    funcionarioId: meta.funcionarioId,
  });
  res.json(carga);
});

// PUT /metas-item — configuración COMPLETA de un funcionario en un período.
//
// Es la operación real de "configurar a alguien": llega el conjunto entero de
// sus ítems y **exige el 100% exacto** (RN-001). El alta unitaria permite
// quedarse corta porque se carga de a una; aquí no hay excusa, el conjunto está
// completo. Todo ocurre en una transacción: o queda cuadrado, o no cambia nada.
//
// Cada meta que ya existía debe traer su `version`: reemplazar el conjunto sin
// compararlas dejaría que dos personas configurando al mismo funcionario se
// pisaran en silencio, que es justo lo que CA-08 prohíbe.
metasItemRouter.put("/", requireRol("admin", "supervisor"), async (req, res) => {
  const parsed = metaLoteSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Datos inválidos", detalle: parsed.error.issues });
  const auth = req.auth!;
  const { periodoId, funcionarioId, metas } = parsed.data;

  const ctx = await contextoEscritura(auth.organizationId, periodoId, funcionarioId);
  if ("error" in ctx) return res.status(ctx.error.status).json(ctx.error.cuerpo);

  const itemsRepetidos = metas.length !== new Set(metas.map((m) => m.itemId)).size;
  if (itemsRepetidos) {
    return res.status(422).json({ error: "Hay ítems repetidos en la carga: cada ítem lleva una sola meta" });
  }

  for (const m of metas) {
    const problema = await validarItemDelCargo(auth.organizationId, m.itemId, ctx.cargoId);
    if (problema) return res.status(problema.status).json(problema.cuerpo);
  }

  // RN-001 en su forma fuerte: el conjunto completo debe sumar 100%.
  const suma = Math.round(metas.reduce((s, m) => s + m.ponderador, 0) * 10_000) / 10_000;
  if (Math.abs(suma - 1) > TOLERANCIA_PONDERADOR) {
    return res.status(422).json({
      error: `Los ponderadores del funcionario deben sumar 100% (RN-001) y suman ${pct(suma)}`,
      sumaPonderadores: suma,
      faltante: Math.round((1 - suma) * 10_000) / 10_000,
    });
  }

  const anteriores = await prisma.metaItem.findMany({
    where: { organizationId: auth.organizationId, periodoId, funcionarioId },
    include: incluir,
  });

  // Misma protección que el DELETE: no se quita de la configuración un ítem que
  // ya acumuló avance aprobado (RN-009).
  const itemsEntrantes = new Set(metas.map((m) => m.itemId));
  for (const previa of anteriores) {
    if (itemsEntrantes.has(previa.itemId)) continue;
    if (await tieneAvanceValidado(auth.organizationId, periodoId, funcionarioId, previa.itemId)) {
      return res.status(422).json({
        error: `La carga deja fuera el ítem "${previa.item.nombre}", que ya tiene actividades aprobadas en este período: eso borraría puntaje ya validado (RN-009)`,
      });
    }
  }

  // CA-08 · ADR-005: el conjunto tampoco se sobrescribe a ciegas. Cada meta que
  // ya existe debe llegar con la `version` sobre la que se editó; si no coincide,
  // otra persona reconfiguró a este funcionario mientras tanto.
  const previas = new Map(anteriores.map((a) => [a.itemId, a]));
  const sinVersion = metas.filter((m) => previas.has(m.itemId) && m.version === undefined);
  if (sinVersion.length > 0) {
    return res.status(409).json({
      error:
        "Faltan las versiones de las metas que ya existían: recarga la configuración vigente antes de guardar (CA-08)",
      metas: anteriores,
    });
  }

  let resultado;
  try {
    resultado = await prisma.$transaction(async (tx) => {
      await tx.metaItem.deleteMany({
        where: {
          organizationId: auth.organizationId,
          periodoId,
          funcionarioId,
          itemId: { notIn: [...itemsEntrantes] },
        },
      });
      for (const m of metas) {
        const previa = previas.get(m.itemId);
        const datos = {
          metaValor: new Prisma.Decimal(m.metaValor),
          ponderador: new Prisma.Decimal(m.ponderador),
        };
        if (previa) {
          // La comparación va DENTRO de la transacción, no solo en la
          // validación de arriba: entre una y otra puede colarse otra escritura.
          const afectadas = await tx.metaItem.updateMany({
            where: { id: previa.id, organizationId: auth.organizationId, version: m.version },
            data: { ...datos, version: { increment: 1 } },
          });
          if (afectadas.count === 0) throw new ConflictoDeVersion();
        } else {
          await tx.metaItem.create({
            data: { organizationId: auth.organizationId, periodoId, itemId: m.itemId, funcionarioId, ...datos },
          });
        }
      }
      return tx.metaItem.findMany({
        where: { organizationId: auth.organizationId, periodoId, funcionarioId },
        include: incluir,
        orderBy: { item: { orden: "asc" } },
      });
    });
  } catch (err) {
    if (!(err instanceof ConflictoDeVersion)) throw err;
    // La transacción se deshizo entera: nada quedó a medias.
    const vigentes = await prisma.metaItem.findMany({
      where: { organizationId: auth.organizationId, periodoId, funcionarioId },
      include: incluir,
      orderBy: { item: { orden: "asc" } },
    });
    return res.status(409).json({
      error:
        "Otra persona reconfiguró las metas de este funcionario mientras editabas. Revisa lo vigente antes de guardar.",
      metas: vigentes,
    });
  }

  await auditarDesde(auth, req)({
    accion: "actualizar",
    entidad: "meta_item_conjunto",
    entidadId: `${periodoId}|${funcionarioId}`,
    valorAnterior: anteriores,
    valorNuevo: resultado,
  });
  const carga = { periodoId, funcionarioId, metas: resultado, sumaPonderadores: suma, cumpleRN001: true };
  if (ctx.unidadTerritorialId) emitEvent(roomUnidad(ctx.unidadTerritorialId), "meta_item:actualizada", carga);
  emitEvent(roomOrganizacion(auth.organizationId), "cumplimiento:cambiado", { periodoId, funcionarioId });
  res.json(carga);
});
