import { Router } from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { auditarDesde } from "../services/auditoria.js";
import { emitEvent, roomOrganizacion } from "../services/broadcast.js";
import { actualizarConVersion, resolverVersion } from "../services/concurrencia.js";
import { normalizarRut } from "../lib/rut.js";
import { formatearTelefono, normalizarTelefono } from "../lib/telefono.js";
import { nombreCompleto } from "../lib/persona.js";
import {
  alcanceDetallado,
  aPersonaResumen,
  detectarDuplicidad,
  historialDePersona,
  puedeVerFichaVecino,
  ventanaDuplicidad,
} from "../services/vecinos.js";

// Ficha del vecino — ADR-008 · ADR-012 · RF-032 · CA-04 · HU-03 · HU-29.
//
// La pantalla con más datos personales del sistema. Tres endpoints y una regla
// que los atraviesa: **finalidad, proporcionalidad y mínimo privilegio**
// (Leyes 19.628 y 21.719; trazabilidad del acceso, Ley 21.663).
//
//   GET   /vecinos?q=            buscar por RUT o por nombre
//   GET   /vecinos/:id           ficha: historial cruzando delegaciones + aviso
//   PATCH /vecinos/:id           corregir los datos de la persona (versión → 409)
//
// Qué se decidió y por qué (detalle en ADR-012):
// - **Quién busca**: admin, supervisor, gerente y usuario. El verificador queda
//   fuera por segregación de funciones (RNF-005: valida evidencias, no necesita
//   la identidad del vecino) y el rol de consulta porque el PDF §3 lo define
//   sobre "tableros e informes", que son agregados. Consulta abierta nº 12.
// - **Qué se ve**: la lista de resultados NO trae teléfono ni dirección — para
//   elegir a alguien basta el nombre, el RUT y en cuántas delegaciones registra
//   atenciones. El dato de contacto aparece solo al abrir la ficha, que es
//   donde existe la finalidad de usarlo.
// - **Qué se audita**: abrir una ficha, no cada tecleo del buscador. Auditar la
//   búsqueda incremental llenaría la bitácora de ruido y no diría nada; la
//   consulta de una persona identificada sí es el hecho que la ley quiere
//   trazable (acción `consultar`).

export const vecinosRouter = Router();
vecinosRouter.use(requireAuth);

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Mínimo de caracteres para buscar: menos que esto devuelve media base. */
const MIN_BUSQUEDA = 3;

const patchSchema = z
  .object({
    nombres: z.string().min(1).max(120).optional(),
    apellidoPaterno: z.string().min(1).max(120).optional(),
    apellidoMaterno: z.string().max(120).nullable().optional(),
    rut: z.string().max(20).nullable().optional(),
    telefono: z.string().max(20).nullable().optional(),
    direccion: z.string().max(200).nullable().optional(),
    sector: z.string().max(120).nullable().optional(),
    version: z.number().int().positive(),
  })
  .strict();

function sinAcceso(rol: string) {
  return {
    error:
      `El perfil «${rol}» no accede a la ficha del vecino. Contiene datos personales ` +
      `identificados y su uso está limitado a quien atiende o supervisa la atención ` +
      `(Leyes 19.628 y 21.719; RNF-005 mínimo privilegio).`,
  };
}

// ---------------------------------------------------------------------------
// GET /vecinos?q=<rut o nombre>&limite=
// RF-032: la búsqueda por texto y por RUT que faltaba.
// ---------------------------------------------------------------------------
vecinosRouter.get("/", async (req, res) => {
  const auth = req.auth!;
  if (!puedeVerFichaVecino(auth)) return res.status(403).json(sinAcceso(auth.rol));

  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  const limite = Math.min(Number(req.query.limite ?? 20) || 20, 50);
  if (q.length < MIN_BUSQUEDA) {
    return res.json({
      q,
      total: 0,
      minimo: MIN_BUSQUEDA,
      criterio: null,
      personas: [],
    });
  }

  // Un RUT se reconoce por su dígito verificador, no por su forma: así
  // "13.111.222-K", "13111222-K" y "13111222K" son la misma búsqueda exacta
  // (ADR-001), y cualquier otra cosa se trata como nombre.
  const rut = normalizarRut(q);
  let encontradas: {
    id: string;
    rut: string | null;
    nombres: string;
    apellidoPaterno: string;
    apellidoMaterno: string | null;
  }[];

  if (rut) {
    const p = await prisma.personaUsuaria.findFirst({
      where: { organizationId: auth.organizationId, rut },
      select: { id: true, rut: true, nombres: true, apellidoPaterno: true, apellidoMaterno: true },
    });
    encontradas = p ? [p] : [];
  } else {
    // ADR-003: se busca sobre la MISMA expresión que indexa la migración
    // (nombres || ' ' || paterno || ' ' || materno), en minúsculas. El índice
    // `personas_usuarias_nombre_busqueda` es `lower(expresión) text_pattern_ops`,
    // así que el prefijo lo resuelve por índice; el "contiene" es un respaldo
    // para cuando la persona escribe el apellido primero. Se ordena poniendo
    // delante lo que calza por prefijo, que es lo que casi siempre se busca.
    const patronPrefijo = `${q.toLowerCase()}%`;
    const patronContiene = `%${q.toLowerCase()}%`;
    encontradas = await prisma.$queryRaw<
      { id: string; rut: string | null; nombres: string; apellidoPaterno: string; apellidoMaterno: string | null }[]
    >(Prisma.sql`
      SELECT id,
             rut,
             nombres,
             apellido_paterno AS "apellidoPaterno",
             apellido_materno AS "apellidoMaterno"
        FROM personas_usuarias
       WHERE organization_id = ${auth.organizationId}
         AND lower(nombres || ' ' || apellido_paterno || ' ' || COALESCE(apellido_materno, ''))
             LIKE ${patronContiene}
       ORDER BY (lower(nombres || ' ' || apellido_paterno || ' ' || COALESCE(apellido_materno, ''))
                 LIKE ${patronPrefijo}) DESC,
                apellido_paterno ASC,
                nombres ASC
       LIMIT ${limite}
    `);
  }

  // En cuántas delegaciones registra atenciones: es el dato que convierte la
  // lista en un control y no en una agenda. No revela nada del libro ajeno.
  const ids = encontradas.map((p) => p.id);
  const [porActividad, porTarea] = ids.length
    ? await Promise.all([
        prisma.actividad.findMany({
          where: { organizationId: auth.organizationId, personaUsuariaId: { in: ids }, anulada: false },
          select: { personaUsuariaId: true, unidadTerritorialId: true },
        }),
        prisma.tarea.findMany({
          where: { organizationId: auth.organizationId, personaUsuariaId: { in: ids } },
          select: { personaUsuariaId: true, unidadTerritorialId: true },
        }),
      ])
    : [[], []];

  const conteo = new Map<string, { atenciones: number; delegaciones: Set<string> }>();
  for (const fila of [...porActividad, ...porTarea]) {
    if (!fila.personaUsuariaId) continue;
    const acc = conteo.get(fila.personaUsuariaId) ?? { atenciones: 0, delegaciones: new Set<string>() };
    acc.atenciones += 1;
    acc.delegaciones.add(fila.unidadTerritorialId);
    conteo.set(fila.personaUsuariaId, acc);
  }

  res.json({
    q,
    criterio: rut ? "rut" : "nombre",
    total: encontradas.length,
    minimo: MIN_BUSQUEDA,
    personas: encontradas.map((p) => ({
      ...aPersonaResumen(p),
      atenciones: conteo.get(p.id)?.atenciones ?? 0,
      delegaciones: conteo.get(p.id)?.delegaciones.size ?? 0,
    })),
  });
});

// ---------------------------------------------------------------------------
// GET /vecinos/:id — la ficha: historial cruzando delegaciones y aviso ámbar.
// ADR-008 · CA-04.
// ---------------------------------------------------------------------------
vecinosRouter.get("/:id", async (req, res) => {
  const auth = req.auth!;
  if (!puedeVerFichaVecino(auth)) return res.status(403).json(sinAcceso(auth.rol));

  const id = String(req.params.id);
  // Identificador mal formado → 400; de otro tenant → 404. Son cosas distintas
  // y responder lo mismo a ambas confunde al cliente y al que depura.
  if (!UUID.test(id)) return res.status(400).json({ error: "Identificador inválido" });

  const persona = await prisma.personaUsuaria.findFirst({
    where: { id, organizationId: auth.organizationId },
  });
  if (!persona) return res.status(404).json({ error: "No encontrado" });

  const visibles = await alcanceDetallado(auth);
  const [hechos, ventana] = await Promise.all([
    historialDePersona(auth.organizationId, persona.id, visibles),
    ventanaDuplicidad(auth.organizationId),
  ]);
  const aviso = detectarDuplicidad(hechos, ventana.dias, ventana.confirmada);

  const delegaciones = new Map<string, string>();
  for (const h of hechos) delegaciones.set(h.delegacion.id, h.delegacion.nombre);
  const fechas = hechos.map((h) => h.fecha).filter((f): f is string => f !== null).sort();

  // Ley 21.663 y 19.628: el ACCESO a datos personales identificados se registra,
  // no solo su modificación. Sin await: la bitácora no debe demorar la ficha
  // (auditoría nunca lanza; si falla, queda en el log del servidor).
  void auditarDesde(auth, req)({
    accion: "consultar",
    entidad: "PersonaUsuaria",
    entidadId: persona.id,
    valorNuevo: {
      rut: persona.rut,
      nombre: nombreCompleto(persona),
      hechos: hechos.length,
      delegaciones: delegaciones.size,
      avisoDuplicidad: aviso !== null,
      alcance: visibles === null ? "todas" : visibles.length,
    },
  });

  res.json({
    persona: {
      ...aPersonaResumen(persona),
      telefono: persona.telefono,
      // El formato de pantalla lo escribe el helper, no el componente: misma
      // regla que el RUT y el nombre (ADR-001, ADR-003).
      telefonoFormateado: formatearTelefono(persona.telefono),
      direccion: persona.direccion,
      sector: persona.sector,
      version: persona.version,
    },
    // La pantalla debe poder decir "hay 3 atenciones que no puedes ver en
    // detalle" en vez de dejar filas mudas sin explicación (DESIGN §7).
    alcance: {
      completo: visibles === null,
      delegacionesDetalladas: visibles,
      hechosReducidos: hechos.filter((h) => !h.detallado).length,
    },
    resumen: {
      atenciones: hechos.length,
      delegaciones: delegaciones.size,
      nombresDelegaciones: [...delegaciones.values()].sort(),
      primera: fechas[0] ?? null,
      ultima: fechas[fechas.length - 1] ?? null,
    },
    aviso,
    historial: hechos,
  });
});

// ---------------------------------------------------------------------------
// PATCH /vecinos/:id — corregir los datos de la persona.
//
// No es un extra: la rectificación de datos personales inexactos es un derecho
// del titular (Ley 19.628 art. 6, Ley 21.719). Sin esto, un RUT o un teléfono
// mal tecleado queda para siempre y arrastra el historial equivocado.
//
// Quién: el nivel central siempre; la jefatura y el funcionario solo si la
// persona fue atendida en una de SUS delegaciones (necesidad de conocer).
// ---------------------------------------------------------------------------
vecinosRouter.patch("/:id", async (req, res) => {
  const auth = req.auth!;
  if (!puedeVerFichaVecino(auth)) return res.status(403).json(sinAcceso(auth.rol));

  const id = String(req.params.id);
  if (!UUID.test(id)) return res.status(400).json({ error: "Identificador inválido" });

  const parseo = patchSchema.safeParse(req.body);
  if (!parseo.success) {
    return res.status(400).json({ error: "Datos inválidos", detalle: parseo.error.flatten() });
  }
  const { version, ...cambios } = parseo.data;

  const actual = await prisma.personaUsuaria.findFirst({
    where: { id, organizationId: auth.organizationId },
  });
  if (!actual) return res.status(404).json({ error: "No encontrado" });

  const visibles = await alcanceDetallado(auth);
  if (visibles !== null) {
    const atendidaAqui = await prisma.actividad.findFirst({
      where: {
        organizationId: auth.organizationId,
        personaUsuariaId: id,
        unidadTerritorialId: { in: visibles },
      },
      select: { id: true },
    });
    const comprometidaAqui = atendidaAqui
      ? null
      : await prisma.tarea.findFirst({
          where: {
            organizationId: auth.organizationId,
            personaUsuariaId: id,
            unidadTerritorialId: { in: visibles },
          },
          select: { id: true },
        });
    if (!atendidaAqui && !comprometidaAqui) {
      return res.status(403).json({
        error:
          "Solo corrige los datos de un vecino quien lo atendió en su delegación, " +
          "o el nivel central. Si el dato está mal, pídelo por la delegación que registró la atención.",
      });
    }
  }

  const datos: Prisma.PersonaUsuariaUpdateInput = {};
  if (cambios.nombres !== undefined) datos.nombres = cambios.nombres;
  if (cambios.apellidoPaterno !== undefined) datos.apellidoPaterno = cambios.apellidoPaterno;
  if (cambios.apellidoMaterno !== undefined) datos.apellidoMaterno = cambios.apellidoMaterno;
  if (cambios.direccion !== undefined) datos.direccion = cambios.direccion;
  if (cambios.sector !== undefined) datos.sector = cambios.sector;

  if (cambios.rut !== undefined) {
    if (cambios.rut === null || cambios.rut === "") {
      datos.rut = null;
    } else {
      const rut = normalizarRut(cambios.rut);
      if (!rut) return res.status(400).json({ error: `RUT inválido: ${cambios.rut}` });
      // ADR-008: el RUT es único por organización. Reasignarlo a alguien que ya
      // existe fusionaría dos historiales sin que nadie lo pida.
      const ocupado = await prisma.personaUsuaria.findFirst({
        where: { organizationId: auth.organizationId, rut, id: { not: id } },
        select: { id: true },
      });
      if (ocupado) {
        return res.status(409).json({
          error: "Ese RUT ya pertenece a otra persona usuaria de esta organización.",
          personaId: ocupado.id,
        });
      }
      datos.rut = rut;
    }
  }

  if (cambios.telefono !== undefined) {
    if (cambios.telefono === null || cambios.telefono === "") {
      datos.telefono = null;
    } else {
      const telefono = normalizarTelefono(cambios.telefono);
      if (!telefono) return res.status(400).json({ error: `Teléfono inválido: ${cambios.telefono}` });
      datos.telefono = telefono;
    }
  }

  const resultado = await actualizarConVersion({
    actualizar: async () => {
      const r = await prisma.personaUsuaria.updateMany({
        where: { id, organizationId: auth.organizationId, version },
        data: { ...(datos as Prisma.PersonaUsuariaUpdateManyMutationInput), version: { increment: 1 } },
      });
      return r.count;
    },
    releer: () => prisma.personaUsuaria.findFirst({ where: { id, organizationId: auth.organizationId } }),
  });
  const actualizada = resolverVersion(res, resultado, "los datos de este vecino");
  if (!actualizada) return;

  await auditarDesde(auth, req)({
    accion: "actualizar",
    entidad: "PersonaUsuaria",
    entidadId: actualizada.id,
    valorAnterior: actual,
    valorNuevo: actualizada,
  });

  // Los datos de la persona cruzan delegaciones: el evento es de organización,
  // no de unidad (un endpoint mudo es un bug, regla 5).
  emitEvent(roomOrganizacion(auth.organizationId), "vecino:actualizado", {
    id: actualizada.id,
    nombre: nombreCompleto(actualizada),
  });

  res.json({
    ...aPersonaResumen(actualizada),
    telefono: actualizada.telefono,
    telefonoFormateado: formatearTelefono(actualizada.telefono),
    direccion: actualizada.direccion,
    sector: actualizada.sector,
    version: actualizada.version,
  });
});
