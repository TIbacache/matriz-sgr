import { Router } from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { requireAuth, type AuthPayload } from "../middleware/auth.js";
import { requireRol } from "../middleware/roles.js";
import { emitEvent, roomUnidad } from "../services/broadcast.js";
import { unidadesVisibles } from "../services/alcance.js";
import { auditarDesde } from "../services/auditoria.js";
import { actualizarConVersion, resolverVersion } from "../services/concurrencia.js";

// Agenda colectiva, "el tubo" — EP-04 · RF-016 a RF-021 · CA-08 · CA-09.
//
// Ruta heredada de la Fase 2, endurecida en el Bloque A3. El tubo es la
// pantalla más concurrida del sistema —varias personas arrastrando tarjetas en
// el mismo libro, en vivo— y era justo la que sobrescribía en silencio: el
// PATCH del drag & drop no comparaba versión, así que dos movimientos
// simultáneos dejaban ganar al último sin que nadie se enterara (CA-08).

export const tareasRouter = Router();
tareasRouter.use(requireAuth);

const versionSchema = z.object({ version: z.number().int().positive() });

/**
 * Lo que viaja con cada tarea. El vecino enlazado va con su RUT porque es lo
 * que identifica el caso al mirarlo desde el tubo; el resto de su ficha se
 * consulta en `/vecinos`, donde el acceso está acotado y auditado (ADR-012).
 */
const incluirTarea = {
  responsable: { select: { id: true, nombre: true } },
  categoria: { select: { id: true, nombre: true } },
  personaUsuaria: {
    select: { id: true, rut: true, nombres: true, apellidoPaterno: true, apellidoMaterno: true },
  },
} satisfies Prisma.TareaInclude;

const tareaSchema = z.object({
  titulo: z.string().min(1).max(200),
  descripcion: z.string().max(2000).nullable().optional(),
  unidadTerritorialId: z.string().uuid(),
  categoriaId: z.string().uuid(),
  estado: z.string().min(1).max(50).optional(),
  fechaCompromiso: z.coerce.date().nullable().optional(),
  responsableId: z.string().uuid().nullable().optional(),

  // --- La solicitud, columnas reales del tubo (planilla §6) — RF-016, RF-017.
  // Estaban en el esquema desde el modelo v2 y solo las llenaba el seed: por
  // eso un compromiso creado desde la aplicación no llegaba a la ficha del
  // vecino, aunque `services/vecinos.ts` sí sabía leerlo.
  /** INT/EXT: `true` = la pidió un vecino; `false` = trabajo interno. */
  interesExterno: z.boolean().optional(),
  fechaSolicitud: z.coerce.date().nullable().optional(),
  /** Texto libre a propósito: puede ser una junta de vecinos, no una persona. */
  solicitante: z.string().max(160).nullable().optional(),
  /**
   * Vínculo OPCIONAL con la ficha del vecino (ADR-008). Es lo que hace que el
   * compromiso aparezca en su historial junto a las atenciones. Opcional
   * porque forzarlo convertiría el tubo en un registro de personas que la ley
   * no pide (finalidad y proporcionalidad, Leyes 19.628 / 21.719).
   */
  personaUsuariaId: z.string().uuid().nullable().optional(),
  territorio: z.string().max(120).nullable().optional(),
  areaApoyo: z.string().max(120).nullable().optional(),
  observaciones: z.string().max(2000).nullable().optional(),
});

/**
 * RF-004: territorio y área de apoyo salen de `CatalogoItem` y solo se aceptan
 * los VIGENTES. Nunca de una lista en el código: cambiar un desplegable es
 * tarea de administración, no un despliegue (RNF-015, ADR-007).
 */
async function catalogoInvalido(
  organizationId: string,
  datos: { territorio?: string | null; areaApoyo?: string | null }
): Promise<string | null> {
  for (const [campo, catalogo] of [
    ["territorio", "territorio"],
    ["areaApoyo", "area_apoyo"],
  ] as const) {
    const valor = datos[campo];
    if (!valor) continue;
    const existe = await prisma.catalogoItem.findFirst({
      where: { organizationId, catalogo, valor, vigente: true },
      select: { id: true },
    });
    if (!existe) return `"${valor}" no es un valor vigente del catálogo ${catalogo} (RF-004)`;
  }
  return null;
}

/**
 * RF-016 · RF-017: una solicitud EXTERNA la pidió alguien de fuera, así que
 * tiene que decir quién. Sin solicitante, el compromiso queda sin trazabilidad
 * de origen y "interno o externo" deja de significar nada.
 *
 * ⚠ En una corrección la regla solo aplica si el cuerpo TOCA `interesExterno`
 * o `solicitante`. `Tarea.interesExterno` tiene `@default(true)` desde el
 * modelo v2, así que todas las tareas anteriores a este bloque son "externas"
 * sin solicitante: exigírselo al corregirlas dejaría el tubo entero
 * bloqueado —ni siquiera se podría arrastrar una tarjeta— por un campo que no
 * existía cuando se crearon. La regla vale hacia adelante, no hacia atrás.
 */
function solicitudIncompleta(
  resultado: { interesExterno?: boolean; solicitante?: string | null },
  cuerpo: { interesExterno?: boolean; solicitante?: string | null } = resultado
): string | null {
  const tocaLaSolicitud = "interesExterno" in cuerpo || "solicitante" in cuerpo;
  if (!tocaLaSolicitud) return null;
  if (resultado.interesExterno === true && !resultado.solicitante?.trim()) {
    return "Una solicitud externa debe indicar quién la pidió (RF-017)";
  }
  return null;
}

// Alcance de edición según matriz de permisos (Documento Maestro §4):
// admin/supervisor → toda la organización; gerente → solo su delegación
// (unidad de la que es responsable); usuario → solo sus propias tareas.
async function puedeEditar(
  auth: AuthPayload,
  tarea: { responsableId: string | null; unidadTerritorialId: string }
): Promise<boolean> {
  if (auth.rol === "admin" || auth.rol === "supervisor") return true;
  if (auth.rol === "gerente") {
    const unidad = await prisma.unidadTerritorial.findFirst({
      where: { id: tarea.unidadTerritorialId, responsableId: auth.userId },
      select: { id: true },
    });
    return unidad !== null;
  }
  return tarea.responsableId === auth.userId; // rol usuario
}

/**
 * ADR-008 · CA-04: la misma persona con compromisos o atenciones en OTRA
 * delegación. Es el mismo control que aplica `actividades.routes.ts`; aquí se
 * mira en los dos libros —el tubo y el registro— porque un vecino puede haber
 * pedido lo mismo por una vía en una delegación y por la otra en otra.
 */
async function alertaTrazabilidadDelTubo(
  organizationId: string,
  personaUsuariaId: string | null,
  unidadActual: string
): Promise<{ mensaje: string; delegaciones: string[] } | null> {
  if (!personaUsuariaId) return null;
  const [tareas, actividades] = await Promise.all([
    prisma.tarea.findMany({
      where: { organizationId, personaUsuariaId, unidadTerritorialId: { not: unidadActual } },
      select: { unidad: { select: { nombre: true } } },
      take: 50,
    }),
    prisma.actividad.findMany({
      where: { organizationId, personaUsuariaId, anulada: false, unidadTerritorialId: { not: unidadActual } },
      select: { unidad: { select: { nombre: true } } },
      take: 50,
    }),
  ]);
  const delegaciones = [...new Set([...tareas, ...actividades].map((t) => t.unidad.nombre))];
  if (delegaciones.length === 0) return null;
  return {
    mensaje: `Esta persona ya registra atenciones o compromisos en: ${delegaciones.join(", ")}`,
    delegaciones,
  };
}

// GET /tareas?unidad=<id> — también es el mecanismo de RECUPERACIÓN tras
// reconexión de Socket.io (HU-3.4): el cliente recarga el estado completo.
// El libro es privado por delegación: un gerente/funcionario solo ve el tubo
// de la suya (ver services/alcance.ts).
tareasRouter.get("/", async (req, res) => {
  const unidadId = typeof req.query.unidad === "string" ? req.query.unidad : undefined;
  const visibles = await unidadesVisibles(req.auth!);
  if (unidadId && visibles !== null && !visibles.includes(unidadId)) {
    return res.status(404).json({ error: "No encontrado" });
  }
  const tareas = await prisma.tarea.findMany({
    where: {
      organizationId: req.auth!.organizationId,
      ...(unidadId
        ? { unidadTerritorialId: unidadId }
        : visibles !== null
          ? { unidadTerritorialId: { in: visibles } }
          : {}),
    },
    include: incluirTarea,
    orderBy: [{ estado: "asc" }, { fechaCompromiso: "asc" }],
  });
  res.json(tareas);
});

tareasRouter.post("/", requireRol("admin", "supervisor", "gerente"), async (req, res) => {
  const parsed = tareaSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Datos inválidos" });
  const auth = req.auth!;

  // La unidad y la categoría deben existir DENTRO del tenant del token.
  const [unidad, categoria] = await Promise.all([
    prisma.unidadTerritorial.findFirst({
      where: { id: parsed.data.unidadTerritorialId, organizationId: auth.organizationId },
    }),
    prisma.categoriaGestion.findFirst({
      where: { id: parsed.data.categoriaId, organizationId: auth.organizationId },
      select: { id: true },
    }),
  ]);
  if (!unidad || !categoria) return res.status(404).json({ error: "Unidad o categoría no encontrada" });
  if (auth.rol === "gerente" && unidad.responsableId !== auth.userId) {
    return res.status(403).json({ error: "Solo puede crear tareas en su delegación" });
  }

  const faltante = solicitudIncompleta(parsed.data);
  if (faltante) return res.status(422).json({ error: faltante });
  const catalogoMalo = await catalogoInvalido(auth.organizationId, parsed.data);
  if (catalogoMalo) return res.status(422).json({ error: catalogoMalo });
  if (parsed.data.personaUsuariaId) {
    const persona = await prisma.personaUsuaria.findFirst({
      where: { id: parsed.data.personaUsuariaId, organizationId: auth.organizationId },
      select: { id: true },
    });
    if (!persona) return res.status(404).json({ error: "Persona usuaria no encontrada" });
  }

  const tarea = await prisma.tarea.create({
    data: { ...parsed.data, organizationId: auth.organizationId },
    include: incluirTarea,
  });
  await auditarDesde(auth, req)({
    accion: "crear",
    entidad: "tarea",
    entidadId: tarea.id,
    valorNuevo: tarea,
  });
  emitEvent(roomUnidad(tarea.unidadTerritorialId), "tarea:creada", tarea);

  // ADR-008 · CA-04: si el vecino ya fue atendido en otra delegación, se avisa
  // aquí igual que al registrar una actividad. El compromiso del tubo y la
  // atención social son dos hechos de la MISMA persona, y el control solo sirve
  // si avisa en los dos sitios donde se registra algo a su nombre.
  const alerta = await alertaTrazabilidadDelTubo(
    auth.organizationId,
    tarea.personaUsuariaId,
    tarea.unidadTerritorialId
  );
  res.status(201).json({ ...tarea, alertaTrazabilidad: alerta });
});

// PATCH /tareas/:id — lo dispara el drag & drop del kanban (HU-3.1).
// Exige `version`: mover una tarjeta es un write como cualquier otro y dos
// personas pueden estar mirando el mismo libro (CA-08).
tareasRouter.patch("/:id", async (req, res) => {
  const parsed = tareaSchema.partial().extend(versionSchema.shape).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Datos inválidos", detalle: parsed.error.issues });
  const auth = req.auth!;

  const existente = await prisma.tarea.findFirst({
    where: { id: req.params.id, organizationId: auth.organizationId },
  });
  if (!existente) return res.status(404).json({ error: "No encontrado" });
  if (!(await puedeEditar(auth, existente))) {
    return res.status(403).json({ error: "Sin permisos sobre esta tarea" });
  }
  // Mover una tarea de unidad exige permisos también en la unidad destino.
  if (
    parsed.data.unidadTerritorialId &&
    parsed.data.unidadTerritorialId !== existente.unidadTerritorialId
  ) {
    const destinoOk = await puedeEditar(auth, {
      responsableId: existente.responsableId,
      unidadTerritorialId: parsed.data.unidadTerritorialId,
    });
    if (!destinoOk) return res.status(403).json({ error: "Sin permisos en la unidad destino" });
  }

  const { version, ...cambios } = parsed.data;
  // Se valida sobre el resultado de la fusión: cambiar `interesExterno` a true
  // sin mandar solicitante debe fallar aunque el cuerpo no lo traiga.
  const faltante = solicitudIncompleta({ ...existente, ...cambios }, cambios);
  if (faltante) return res.status(422).json({ error: faltante });
  const catalogoMalo = await catalogoInvalido(auth.organizationId, cambios);
  if (catalogoMalo) return res.status(422).json({ error: catalogoMalo });
  if (cambios.personaUsuariaId) {
    const persona = await prisma.personaUsuaria.findFirst({
      where: { id: cambios.personaUsuariaId, organizationId: auth.organizationId },
      select: { id: true },
    });
    if (!persona) return res.status(404).json({ error: "Persona usuaria no encontrada" });
  }

  const resultado = await actualizarConVersion({
    actualizar: async () =>
      (
        await prisma.tarea.updateMany({
          where: { id: existente.id, organizationId: auth.organizationId, version },
          data: { ...cambios, version: { increment: 1 } },
        })
      ).count,
    releer: () =>
      prisma.tarea.findFirst({
        where: { id: existente.id, organizationId: auth.organizationId },
        include: incluirTarea,
      }),
  });
  const tarea = resolverVersion(res, resultado, "esta tarea");
  if (!tarea) return;

  await auditarDesde(auth, req)({
    // Mover una tarjeta es un cambio de estado, no una edición cualquiera:
    // la bitácora lo distingue para poder reconstruir el recorrido del tubo.
    accion: cambios.estado && cambios.estado !== existente.estado ? "cambiar_estado" : "actualizar",
    entidad: "tarea",
    entidadId: tarea.id,
    valorAnterior: existente,
    valorNuevo: tarea,
  });
  emitEvent(roomUnidad(tarea.unidadTerritorialId), "tarea:actualizada", tarea);
  if (tarea.unidadTerritorialId !== existente.unidadTerritorialId) {
    // La unidad de origen también debe enterarse de que la tarea se fue.
    emitEvent(roomUnidad(existente.unidadTerritorialId), "tarea:eliminada", { id: tarea.id });
  }
  res.json(tarea);
});

tareasRouter.delete("/:id", async (req, res) => {
  const auth = req.auth!;
  const existente = await prisma.tarea.findFirst({
    where: { id: req.params.id, organizationId: auth.organizationId },
  });
  if (!existente) return res.status(404).json({ error: "No encontrado" });
  if (auth.rol === "usuario" || !(await puedeEditar(auth, existente))) {
    return res.status(403).json({ error: "Sin permisos sobre esta tarea" });
  }

  await prisma.tarea.delete({ where: { id: existente.id } });

  // Se audita DESPUÉS de borrar y con el registro completo: la bitácora es lo
  // único que queda de la tarea (RNF-008, ADR-006).
  await auditarDesde(auth, req)({
    accion: "eliminar",
    entidad: "tarea",
    entidadId: existente.id,
    valorAnterior: existente,
  });
  emitEvent(roomUnidad(existente.unidadTerritorialId), "tarea:eliminada", { id: existente.id });
  res.status(204).end();
});
