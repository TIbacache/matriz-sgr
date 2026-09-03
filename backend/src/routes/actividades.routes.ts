import express, { Router } from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { env } from "../config/env.js";
import { requireAuth, type AuthPayload } from "../middleware/auth.js";
import { emitEvent, roomOrganizacion, roomUnidad } from "../services/broadcast.js";
import { auditarDesde } from "../services/auditoria.js";
import { actualizarConVersion, resolverVersion } from "../services/concurrencia.js";
import { unidadesVisibles } from "../services/alcance.js";
import { generarCodigo } from "../services/codigos.js";
import { CLAVES, obtenerParametro } from "../services/parametros.js";
import { formatosPermitidos, guardarArchivo, rutaRelativa } from "../services/almacenamiento.js";
import { aIso, desdeIso } from "../lib/fechas.js";
import { normalizarRut } from "../lib/rut.js";
import { normalizarTelefono } from "../lib/telefono.js";
import { proyectar, valorDeCatalogo, type FilaAtencion } from "../services/atencion-social.js";
import { cabeceraSchema } from "./atenciones-sociales.routes.js";

// Registro de actividades — RF-009 · RF-010 · RF-011 · RF-012 · HU-01 · HU-09.
//
// Es el corazón del sistema: actividad → código → evidencia → validación →
// puntaje. Cada paso deja rastro.
//
// Reglas que este módulo hace cumplir:
// - Sin período ABIERTO no se registra nada, y la fecha debe caer dentro del
//   período (RF-005, RN-013).
// - El ítem debe pertenecer al cargo del funcionario: no se puede sumar a una
//   función que no se le mide (RF-003, RF-010 "coherencia").
// - El código lo genera el servidor y es inmutable (RF-011, trigger en base).
// - Una actividad con validación APROBADA no se edita: se anula con motivo y
//   se registra otra (ADR-006, petición literal del cliente).
// - Todo write audita (RNF-008) y emite su evento (Documento Maestro §9).

export const actividadesRouter = Router();
actividadesRouter.use(requireAuth);

const ISO_DIA = /^\d{4}-\d{2}-\d{2}$/;
const versionSchema = z.object({ version: z.number().int().positive() });

const personaSchema = z.object({
  rut: z.string().max(20).nullable().optional(),
  nombres: z.string().min(1).max(120),
  apellidoPaterno: z.string().min(1).max(120),
  apellidoMaterno: z.string().max(120).nullable().optional(),
  telefono: z.string().max(20).nullable().optional(),
  direccion: z.string().max(200).nullable().optional(),
  sector: z.string().max(120).nullable().optional(),
});

const actividadSchema = z.object({
  periodoId: z.string().uuid(),
  fecha: z.string().regex(ISO_DIA, "Formato ISO 8601: 2026-07-13"),
  descripcion: z.string().min(3).max(1000),
  accion: z.string().max(1000).nullable().optional(),
  itemId: z.string().uuid().nullable().optional(),
  /** Registrar a nombre de otra persona: solo admin, supervisor o la jefatura. */
  funcionarioId: z.string().uuid().optional(),
  personaUsuariaId: z.string().uuid().nullable().optional(),
  persona: personaSchema.optional(),
  contactoNombre: z.string().max(160).nullable().optional(),
  contactoFono: z.string().max(20).nullable().optional(),
  ingresoATubo: z.boolean().optional(),
  tareaId: z.string().uuid().nullable().optional(),
});

const incluir = {
  item: { select: { id: true, nombre: true, tipo: true, direccion: true } },
  funcionario: { select: { id: true, nombre: true } },
  unidad: { select: { id: true, nombre: true } },
  personaUsuaria: { select: { id: true, rut: true, nombres: true, apellidoPaterno: true, apellidoMaterno: true } },
  evidencias: {
    select: {
      id: true,
      archivoNombre: true,
      mimeType: true,
      tamanoBytes: true,
      createdAt: true,
      subidaPorId: true,
      validaciones: { orderBy: { createdAt: "desc" }, take: 5 },
    },
  },
} satisfies Prisma.ActividadInclude;

/** Columnas de la atención social que viajan dentro de la actividad (planilla §4). */
const incluirAtencion = {
  select: {
    id: true,
    tipoAtencion: true,
    subAtencion: true,
    requiereVisita: true,
    observacion: true,
    primeraGestion: true,
    fechaProgramadaVisita: true,
    segundaGestion: true,
    fechaVisita: true,
    fechaEntregaInforme: true,
    terceraGestion: true,
    fechaEntregaBeneficio: true,
    version: true,
    createdAt: true,
    updatedAt: true,
    actividadId: true,
  },
} satisfies Prisma.Actividad$atencionSocialArgs;

/**
 * La atención social viaja SIEMPRE con la misma forma —la de `proyectar()`—
 * venga del alta, del avance de una gestión o de dentro de una actividad. Dos
 * formas del mismo concepto obligan a la pantalla a saber de dónde vino cada
 * una, y ahí es donde aparecen los "a veces sí y a veces no".
 */
function conAtencion<T extends object>(a: T) {
  // Si la clave no viene, es porque este rol no accede al detalle social
  // (`incluirPara`): entonces se OMITE, que no es lo mismo que traerla nula.
  if (!("atencionSocial" in a)) return a;
  const atencion = (a as { atencionSocial?: FilaAtencion | null }).atencionSocial;
  return { ...a, atencionSocial: atencion ? proyectar(atencion) : null };
}

/**
 * ADR-012: el detalle social **no viaja** a los roles que no pueden verlo, ni
 * siquiera de rebote dentro de una actividad. Hoy `unidadesVisibles` ya les
 * deja el listado vacío, pero la regla no puede depender de eso: si mañana un
 * rol de consulta tuviera delegación asignada, la sensibilidad del dato no
 * cambiaría.
 */
function incluirPara(rol: string) {
  if (rol === "verificador" || rol === "consulta") return incluir;
  return { ...incluir, atencionSocial: incluirAtencion };
}

/**
 * Quién puede tocar una actividad: su autor, la jefatura de esa delegación y
 * el nivel central. El verificador NO edita registros — solo valida evidencias
 * (segregación de funciones, RNF-005).
 */
async function puedeEditarActividad(
  auth: AuthPayload,
  actividad: { funcionarioId: string; unidadTerritorialId: string }
): Promise<boolean> {
  if (auth.rol === "admin" || auth.rol === "supervisor") return true;
  if (actividad.funcionarioId === auth.userId) return true;
  if (auth.rol === "gerente") {
    const unidad = await prisma.unidadTerritorial.findFirst({
      where: { id: actividad.unidadTerritorialId, responsableId: auth.userId },
      select: { id: true },
    });
    return unidad !== null;
  }
  return false;
}

/** RN-009: una actividad con validación aprobada ya sumó y no se toca. */
async function tieneValidacionAprobada(actividadId: string): Promise<boolean> {
  const aprobada = await prisma.validacion.findFirst({
    where: { decision: "aprobada", evidencia: { actividadId } },
    select: { id: true },
  });
  return aprobada !== null;
}

/** Resuelve o crea el vecino atendido, con RUT único por organización (ADR-008). */
async function resolverPersonaUsuaria(
  organizationId: string,
  datos: z.infer<typeof actividadSchema>
): Promise<{ id: string | null; error?: string }> {
  if (datos.personaUsuariaId) {
    const existente = await prisma.personaUsuaria.findFirst({
      where: { id: datos.personaUsuariaId, organizationId },
      select: { id: true },
    });
    if (!existente) return { id: null, error: "Persona usuaria no encontrada" };
    return { id: existente.id };
  }
  if (!datos.persona) return { id: null };

  const p = datos.persona;
  let rut: string | null = null;
  if (p.rut) {
    rut = normalizarRut(p.rut);
    if (!rut) return { id: null, error: `RUT inválido: ${p.rut}` };
    const yaExiste = await prisma.personaUsuaria.findFirst({
      where: { organizationId, rut },
      select: { id: true },
    });
    if (yaExiste) return { id: yaExiste.id };
  }
  let telefono: string | null = null;
  if (p.telefono) {
    telefono = normalizarTelefono(p.telefono);
    if (!telefono) return { id: null, error: `Teléfono inválido: ${p.telefono}` };
  }
  const creada = await prisma.personaUsuaria.create({
    data: {
      organizationId,
      rut,
      nombres: p.nombres,
      apellidoPaterno: p.apellidoPaterno,
      apellidoMaterno: p.apellidoMaterno ?? null,
      telefono,
      direccion: p.direccion ?? null,
      sector: p.sector ?? null,
    },
  });
  return { id: creada.id };
}

/**
 * ADR-008 · CA-04: si la misma persona ya fue atendida en OTRA delegación, se
 * avisa. Es el control que el cliente pidió (el niño que pidió el mismo regalo
 * en cinco delegaciones): el libro sigue siendo privado, pero la duplicidad se
 * detecta.
 */
async function alertaTrazabilidad(
  organizationId: string,
  personaUsuariaId: string | null,
  unidadActual: string
): Promise<{ mensaje: string; delegaciones: string[] } | null> {
  if (!personaUsuariaId) return null;
  const otras = await prisma.actividad.findMany({
    where: {
      organizationId,
      personaUsuariaId,
      anulada: false,
      unidadTerritorialId: { not: unidadActual },
    },
    select: { unidad: { select: { nombre: true } } },
    take: 50,
  });
  const delegaciones = [...new Set(otras.map((a) => a.unidad.nombre))];
  if (delegaciones.length === 0) return null;
  return {
    mensaje: `Esta persona ya registra atenciones en: ${delegaciones.join(", ")}`,
    delegaciones,
  };
}

// GET /actividades — el libro personal, privado por delegación (regla 9).
// Filtros de RF-032: período, funcionario, ítem, delegación, rango de fechas.
actividadesRouter.get("/", async (req, res) => {
  const auth = req.auth!;
  const q = req.query;
  const unidadId = typeof q.unidad === "string" ? q.unidad : undefined;
  const visibles = await unidadesVisibles(auth);
  if (unidadId && visibles !== null && !visibles.includes(unidadId)) {
    return res.status(404).json({ error: "No encontrado" });
  }

  const limite = Math.min(Number(q.limite ?? 50) || 50, 200);
  const desplazamiento = Math.max(Number(q.desde ?? 0) || 0, 0);

  const where = {
    organizationId: auth.organizationId,
    ...(unidadId
      ? { unidadTerritorialId: unidadId }
      : visibles !== null
        ? { unidadTerritorialId: { in: visibles } }
        : {}),
    ...(typeof q.periodo === "string" ? { periodoId: q.periodo } : {}),
    ...(typeof q.funcionario === "string" ? { funcionarioId: q.funcionario } : {}),
    ...(typeof q.item === "string" ? { itemId: q.item } : {}),
    ...(q.anuladas === "1" ? {} : { anulada: false }),
    ...(typeof q.fechaDesde === "string" && ISO_DIA.test(q.fechaDesde)
      ? { fecha: { gte: desdeIso(q.fechaDesde) } }
      : {}),
    ...(typeof q.fechaHasta === "string" && ISO_DIA.test(q.fechaHasta)
      ? { fecha: { lte: desdeIso(q.fechaHasta) } }
      : {}),
  };

  const [total, actividades] = await Promise.all([
    prisma.actividad.count({ where }),
    prisma.actividad.findMany({
      where,
      include: incluirPara(auth.rol),
      orderBy: [{ fecha: "desc" }, { codigo: "desc" }],
      take: limite,
      skip: desplazamiento,
    }),
  ]);
  res.json({ total, limite, desde: desplazamiento, actividades: actividades.map(conAtencion) });
});

actividadesRouter.get("/:id", async (req, res) => {
  const auth = req.auth!;
  const actividad = await prisma.actividad.findFirst({
    where: { id: String(req.params.id), organizationId: auth.organizationId },
    include: incluirPara(auth.rol),
  });
  if (!actividad) return res.status(404).json({ error: "No encontrado" });
  const visibles = await unidadesVisibles(auth);
  if (visibles !== null && !visibles.includes(actividad.unidadTerritorialId)) {
    return res.status(404).json({ error: "No encontrado" });
  }
  res.json(conAtencion(actividad));
});

// POST /actividades — HU-01. La delegación NO viene del cliente: se deriva de
// la membresía del funcionario, para que nadie registre en un libro ajeno.
actividadesRouter.post("/", async (req, res) => {
  const parsed = actividadSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Datos inválidos", detalle: parsed.error.issues });
  const auth = req.auth!;
  const datos = parsed.data;

  // Registrar a nombre de otra persona requiere jefatura o nivel central.
  const funcionarioId = datos.funcionarioId ?? auth.userId;
  if (funcionarioId !== auth.userId && !["admin", "supervisor", "gerente"].includes(auth.rol)) {
    return res.status(403).json({ error: "No puede registrar actividades de otra persona" });
  }
  if (auth.rol === "consulta" || auth.rol === "verificador") {
    return res.status(403).json({ error: "Sin permisos para registrar actividades" });
  }

  const [periodo, miembro] = await Promise.all([
    prisma.periodo.findFirst({ where: { id: datos.periodoId, organizationId: auth.organizationId } }),
    prisma.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId: auth.organizationId, userId: funcionarioId } },
      include: { cargoRef: true },
    }),
  ]);
  if (!periodo) return res.status(404).json({ error: "Período no encontrado" });
  if (!miembro) return res.status(404).json({ error: "Funcionario no encontrado en la organización" });
  if (periodo.estado !== "abierto") {
    return res.status(422).json({ error: "El período está cerrado: no admite nuevos registros (RN-013)" });
  }
  if (!miembro.unidadTerritorialId) {
    return res.status(422).json({ error: "El funcionario no tiene delegación asignada" });
  }
  if (auth.rol === "gerente" && funcionarioId !== auth.userId) {
    const suUnidad = await prisma.unidadTerritorial.findFirst({
      where: { id: miembro.unidadTerritorialId, responsableId: auth.userId },
      select: { id: true },
    });
    if (!suUnidad) return res.status(403).json({ error: "Solo puede registrar en su delegación" });
  }

  // RF-010: la fecha debe caer dentro del período configurado.
  const fecha = desdeIso(datos.fecha);
  if (fecha < periodo.fechaInicio || fecha > periodo.fechaTermino) {
    return res.status(422).json({
      error: `La fecha ${datos.fecha} está fuera del período "${periodo.nombre}" (${aIso(periodo.fechaInicio)} a ${aIso(periodo.fechaTermino)})`,
    });
  }

  // RF-003: el ítem debe ser uno de los que se le miden a ese cargo.
  if (datos.itemId) {
    const item = await prisma.itemMedicion.findFirst({
      where: { id: datos.itemId, organizationId: auth.organizationId },
      select: { id: true, cargoId: true, activo: true, nombre: true },
    });
    if (!item) return res.status(404).json({ error: "Ítem de medición no encontrado" });
    if (!item.activo) return res.status(422).json({ error: `El ítem "${item.nombre}" está desactivado` });
    if (item.cargoId !== miembro.cargoId) {
      return res.status(422).json({
        error: `El ítem "${item.nombre}" no corresponde al cargo del funcionario (${miembro.cargoRef?.nombre ?? "sin cargo"})`,
      });
    }
  }

  if (datos.contactoFono && !normalizarTelefono(datos.contactoFono)) {
    return res.status(422).json({ error: `Teléfono de contacto inválido: ${datos.contactoFono}` });
  }
  if (datos.tareaId) {
    const tarea = await prisma.tarea.findFirst({
      where: { id: datos.tareaId, organizationId: auth.organizationId },
      select: { id: true },
    });
    if (!tarea) return res.status(404).json({ error: "Compromiso del tubo no encontrado" });
  }

  const persona = await resolverPersonaUsuaria(auth.organizationId, datos);
  if (persona.error) return res.status(422).json({ error: persona.error });

  // RF-011 / ADR-004: el código lo genera el servidor, con bloqueo por
  // (organización, prefijo, día) para que dos registros simultáneos no
  // obtengan el mismo correlativo (RF-034, CA-08).
  const codigo = await generarCodigo(
    auth.organizationId,
    miembro.cargoRef?.area ?? miembro.cargo,
    fecha
  );

  const actividad = await prisma.actividad.create({
    data: {
      organizationId: auth.organizationId,
      periodoId: periodo.id,
      unidadTerritorialId: miembro.unidadTerritorialId,
      funcionarioId,
      itemId: datos.itemId ?? null,
      codigo,
      fecha,
      descripcion: datos.descripcion,
      accion: datos.accion ?? null,
      personaUsuariaId: persona.id,
      contactoNombre: datos.contactoNombre ?? null,
      contactoFono: datos.contactoFono ? normalizarTelefono(datos.contactoFono) : null,
      ingresoATubo: datos.ingresoATubo ?? false,
      tareaId: datos.tareaId ?? null,
    },
    include: incluir,
  });

  await auditarDesde(auth, req)({
    accion: "crear",
    entidad: "actividad",
    entidadId: actividad.id,
    valorNuevo: actividad,
  });
  emitEvent(roomUnidad(actividad.unidadTerritorialId), "actividad:creada", actividad);

  const alerta = await alertaTrazabilidad(auth.organizationId, persona.id, actividad.unidadTerritorialId);
  res.status(201).json({ ...actividad, alertaTrazabilidad: alerta });
});

// PATCH /actividades/:id — corrección ANTES de validar. Exige `version`.
// El código nunca está entre los campos editables (RF-011).
actividadesRouter.patch("/:id", async (req, res) => {
  const parsed = actividadSchema
    .pick({
      fecha: true,
      descripcion: true,
      accion: true,
      itemId: true,
      contactoNombre: true,
      contactoFono: true,
      ingresoATubo: true,
    })
    .partial()
    .extend(versionSchema.shape)
    .safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Datos inválidos", detalle: parsed.error.issues });
  const auth = req.auth!;
  const id = String(req.params.id);

  const anterior = await prisma.actividad.findFirst({
    where: { id, organizationId: auth.organizationId },
    include: { periodo: true },
  });
  if (!anterior) return res.status(404).json({ error: "No encontrado" });
  if (!(await puedeEditarActividad(auth, anterior))) {
    return res.status(403).json({ error: "Sin permisos sobre esta actividad" });
  }
  if (anterior.anulada) return res.status(422).json({ error: "La actividad está anulada" });
  if (anterior.periodo.estado !== "abierto") {
    return res.status(422).json({ error: "El período está cerrado (RN-013)" });
  }
  if (await tieneValidacionAprobada(id)) {
    return res.status(422).json({
      error: "La actividad tiene evidencia aprobada y ya sumó al avance: no se edita, se anula con motivo y se registra una nueva (ADR-006)",
      accionSugerida: "POST /actividades/:id/anulacion",
    });
  }

  const { version, fecha, itemId, contactoFono, ...resto } = parsed.data;

  if (fecha) {
    const nueva = desdeIso(fecha);
    if (nueva < anterior.periodo.fechaInicio || nueva > anterior.periodo.fechaTermino) {
      return res.status(422).json({ error: `La fecha ${fecha} está fuera del período` });
    }
  }
  if (itemId) {
    const miembro = await prisma.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId: auth.organizationId, userId: anterior.funcionarioId } },
      select: { cargoId: true },
    });
    const item = await prisma.itemMedicion.findFirst({
      where: { id: itemId, organizationId: auth.organizationId },
      select: { id: true, cargoId: true, nombre: true, activo: true },
    });
    if (!item) return res.status(404).json({ error: "Ítem de medición no encontrado" });
    if (!item.activo || item.cargoId !== miembro?.cargoId) {
      return res.status(422).json({ error: `El ítem "${item.nombre}" no corresponde al cargo del funcionario` });
    }
  }
  if (contactoFono && !normalizarTelefono(contactoFono)) {
    return res.status(422).json({ error: `Teléfono de contacto inválido: ${contactoFono}` });
  }

  const resultado = await actualizarConVersion({
    actualizar: async () =>
      (
        await prisma.actividad.updateMany({
          where: { id, organizationId: auth.organizationId, version },
          data: {
            ...resto,
            ...(fecha ? { fecha: desdeIso(fecha) } : {}),
            ...(itemId ? { itemId } : {}),
            ...(contactoFono !== undefined
              ? { contactoFono: contactoFono ? normalizarTelefono(contactoFono) : null }
              : {}),
            version: { increment: 1 },
          },
        })
      ).count,
    releer: () => prisma.actividad.findFirst({ where: { id, organizationId: auth.organizationId }, include: incluir }),
  });
  const actividad = resolverVersion(res, resultado, "la actividad");
  if (!actividad) return;

  await auditarDesde(auth, req)({
    accion: "actualizar",
    entidad: "actividad",
    entidadId: actividad.id,
    valorAnterior: anterior,
    valorNuevo: actividad,
  });
  emitEvent(roomUnidad(actividad.unidadTerritorialId), "actividad:actualizada", actividad);
  res.json(actividad);
});

// POST /actividades/:id/anulacion — ADR-006. El cliente lo pidió con estas
// palabras: "cuando la persona hace algún ingreso, después no pueda borrarlo".
// No se borra: se anula con motivo, deja de sumar y queda en la bitácora.
actividadesRouter.post("/:id/anulacion", async (req, res) => {
  const parsed = versionSchema.extend({ motivo: z.string().min(5).max(500) }).safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Se requiere versión y un motivo de al menos 5 caracteres" });
  }
  const auth = req.auth!;
  const id = String(req.params.id);

  const anterior = await prisma.actividad.findFirst({
    where: { id, organizationId: auth.organizationId },
    include: { periodo: true },
  });
  if (!anterior) return res.status(404).json({ error: "No encontrado" });
  if (!(await puedeEditarActividad(auth, anterior))) {
    return res.status(403).json({ error: "Sin permisos sobre esta actividad" });
  }
  if (anterior.anulada) return res.status(422).json({ error: "La actividad ya está anulada" });
  if (anterior.periodo.estado !== "abierto") {
    return res.status(422).json({ error: "El período está cerrado (RN-013)" });
  }

  const resultado = await actualizarConVersion({
    actualizar: async () =>
      (
        await prisma.actividad.updateMany({
          where: { id, organizationId: auth.organizationId, version: parsed.data.version, anulada: false },
          data: { anulada: true, motivoAnulacion: parsed.data.motivo, version: { increment: 1 } },
        })
      ).count,
    releer: () => prisma.actividad.findFirst({ where: { id, organizationId: auth.organizationId }, include: incluir }),
  });
  const actividad = resolverVersion(res, resultado, "la actividad");
  if (!actividad) return;

  await auditarDesde(auth, req)({
    accion: "eliminar", // baja lógica: la fila permanece, deja de sumar
    entidad: "actividad",
    entidadId: actividad.id,
    valorAnterior: anterior,
    valorNuevo: actividad,
  });
  emitEvent(roomUnidad(actividad.unidadTerritorialId), "actividad:anulada", actividad);
  res.json(actividad);
});

// POST /actividades/:id/atencion-social — RF-015 · RN-012 · CA-04 · HU-03.
//
// El detalle social de una actividad ya registrada, 1:1 con ella. Se crea aquí
// —y no en su propio POST con `actividadId` en el cuerpo— por lo mismo que las
// evidencias: la atención no existe sin su actividad, y colgarla de la URL hace
// imposible crear una huérfana o apuntarla a la actividad de otra delegación.
//
// La primera gestión puede venir en el alta, porque atender a la persona YA es
// la primera gestión en la planilla del cliente. Las otras dos se avanzan por
// `POST /atenciones-sociales/:id/gestiones`.
actividadesRouter.post("/:id/atencion-social", async (req, res) => {
  const parsed = cabeceraSchema
    .extend({
      primeraGestion: z.string().min(1).max(120).optional(),
      fechaProgramadaVisita: z.string().regex(ISO_DIA).nullable().optional(),
    })
    .safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Datos inválidos", detalle: parsed.error.issues });
  const auth = req.auth!;
  const id = String(req.params.id);

  if (["verificador", "consulta"].includes(auth.rol)) {
    return res.status(403).json({ error: "Sin permisos para registrar atenciones sociales" });
  }

  const actividad = await prisma.actividad.findFirst({
    where: { id, organizationId: auth.organizationId },
    include: { periodo: { select: { estado: true } }, atencionSocial: { select: { id: true } } },
  });
  if (!actividad) return res.status(404).json({ error: "No encontrado" });
  const visibles = await unidadesVisibles(auth);
  if (visibles !== null && !visibles.includes(actividad.unidadTerritorialId)) {
    return res.status(404).json({ error: "No encontrado" });
  }
  if (!(await puedeEditarActividad(auth, actividad))) {
    return res.status(403).json({ error: "Sin permisos sobre esta actividad" });
  }
  if (actividad.anulada) return res.status(422).json({ error: "La actividad está anulada" });
  if (actividad.periodo.estado !== "abierto") {
    return res.status(422).json({ error: "El período está cerrado (RN-013)" });
  }
  // 1:1 con la actividad: una segunda atención no es un avance, es un
  // duplicado. Las gestiones son el mecanismo para que el caso siga.
  if (actividad.atencionSocial) {
    return res.status(409).json({
      error: "Esta actividad ya tiene su atención social. Para que el caso avance, registra una gestión",
      atencionSocialId: actividad.atencionSocial.id,
    });
  }
  // RN-012 · CA-04: sin la persona identificada no hay caso social que seguir
  // ni duplicidad que detectar entre delegaciones (ADR-008).
  if (!actividad.personaUsuariaId) {
    return res.status(422).json({
      error: "Una atención social se registra a nombre de un vecino: la actividad no tiene persona usuaria asociada",
    });
  }

  const datos = parsed.data;
  if (!(await valorDeCatalogo(auth.organizationId, "tipo_atencion", datos.tipoAtencion))) {
    return res.status(422).json({ error: `"${datos.tipoAtencion}" no es un tipo de atención vigente (RF-004)` });
  }
  if (datos.subAtencion && !(await valorDeCatalogo(auth.organizationId, "sub_atencion", datos.subAtencion))) {
    return res.status(422).json({ error: `"${datos.subAtencion}" no es una sub-atención vigente (RF-004)` });
  }
  if (datos.primeraGestion && !(await valorDeCatalogo(auth.organizationId, "gestion_1", datos.primeraGestion))) {
    return res.status(422).json({ error: `"${datos.primeraGestion}" no es una primera gestión vigente (RF-004)` });
  }
  if (datos.fechaProgramadaVisita && !datos.primeraGestion) {
    return res.status(422).json({
      error: "La fecha programada de visita pertenece a la primera gestión: regístrala junto con ella",
    });
  }

  const atencion = await prisma.atencionSocial.create({
    data: {
      organizationId: auth.organizationId,
      actividadId: actividad.id,
      tipoAtencion: datos.tipoAtencion,
      subAtencion: datos.subAtencion ?? null,
      requiereVisita: datos.requiereVisita ?? false,
      observacion: datos.observacion ?? null,
      primeraGestion: datos.primeraGestion ?? null,
      fechaProgramadaVisita: datos.fechaProgramadaVisita ? desdeIso(datos.fechaProgramadaVisita) : null,
    },
  });

  await auditarDesde(auth, req)({
    accion: "crear",
    entidad: "atencion_social",
    entidadId: atencion.id,
    valorNuevo: atencion,
  });
  emitEvent(roomUnidad(actividad.unidadTerritorialId), "atencion_social:creada", {
    ...proyectar(atencion),
    unidadTerritorialId: actividad.unidadTerritorialId,
  });
  res.status(201).json(proyectar(atencion));
});

// POST /actividades/:id/evidencias — RF-012 · RNF-017 · HU-09.
//
// El cuerpo es el ARCHIVO CRUDO (Content-Type = su tipo MIME). Se eligió así
// en vez de multipart para no agregar una dependencia (regla 13, costo cero) y
// porque el nombre que envía el cliente no se usa jamás para escribir en disco:
// la ruta se deriva del código inmutable de la actividad. El nombre original se
// guarda saneado, solo como metadato para mostrarlo.
//
// Formatos → catálogo `formato_evidencia`; tamaño máximo → parámetro
// `evidencia_tamano_max_mb`. Ninguno está escrito en el código (ADR-007).
actividadesRouter.post(
  "/:id/evidencias",
  express.raw({ type: () => true, limit: env.limiteSubidaHttp }),
  async (req, res) => {
    const auth = req.auth!;
    const id = String(req.params.id);
    const contenido = req.body as Buffer;

    if (!Buffer.isBuffer(contenido) || contenido.length === 0) {
      return res.status(400).json({ error: "El cuerpo debe ser el archivo de la evidencia" });
    }
    const mimeType = String(req.headers["content-type"] ?? "").split(";")[0]!.trim().toLowerCase();

    const actividad = await prisma.actividad.findFirst({
      where: { id, organizationId: auth.organizationId },
      include: { periodo: { select: { estado: true } }, _count: { select: { evidencias: true } } },
    });
    if (!actividad) return res.status(404).json({ error: "No encontrado" });
    if (!(await puedeEditarActividad(auth, actividad))) {
      return res.status(403).json({ error: "Sin permisos sobre esta actividad" });
    }
    if (actividad.anulada) return res.status(422).json({ error: "La actividad está anulada" });
    if (actividad.periodo.estado !== "abierto") {
      return res.status(422).json({ error: "El período está cerrado (RN-013)" });
    }

    const [permitidos, maxMb] = await Promise.all([
      formatosPermitidos(auth.organizationId),
      obtenerParametro(auth.organizationId, CLAVES.evidenciaTamanoMaxMb, actividad.periodoId),
    ]);
    if (!permitidos.includes(mimeType)) {
      return res.status(415).json({
        error: `Formato no permitido: ${mimeType || "(sin Content-Type)"}`,
        formatosPermitidos: permitidos,
      });
    }
    const maxBytes = maxMb * 1024 * 1024;
    if (contenido.length > maxBytes) {
      return res.status(413).json({
        error: `La evidencia pesa ${(contenido.length / 1024 / 1024).toFixed(1)} MB y el máximo configurado es ${maxMb} MB`,
      });
    }

    const secuencia = actividad._count.evidencias + 1;
    const relativa = rutaRelativa(auth.organizationId, actividad.codigo, secuencia, mimeType);
    await guardarArchivo(relativa, contenido);

    // Nombre original solo como metadato, saneado: nunca toca el disco. Se
    // quitan separadores y se colapsan los puntos, para que ni siquiera al
    // MOSTRARLO quede un "../.." que confunda o sirva de señuelo.
    const enviado = typeof req.query.nombre === "string" ? req.query.nombre : "";
    const nombreMostrado =
      enviado
        .replace(/[^\p{L}\p{N}._ -]/gu, "")
        .replace(/\.{2,}/g, ".")
        .replace(/^[.\s]+/, "")
        .trim()
        .slice(0, 120) || relativa.split("/").pop()!;

    const evidencia = await prisma.evidencia.create({
      data: {
        organizationId: auth.organizationId,
        actividadId: actividad.id,
        archivoNombre: nombreMostrado,
        archivoRuta: relativa,
        mimeType,
        tamanoBytes: contenido.length,
        subidaPorId: auth.userId,
      },
    });

    await auditarDesde(auth, req)({
      accion: "crear",
      entidad: "evidencia",
      entidadId: evidencia.id,
      valorNuevo: { ...evidencia, codigoActividad: actividad.codigo },
    });
    emitEvent(roomUnidad(actividad.unidadTerritorialId), "evidencia:creada", evidencia);
    // La bandeja del verificador es transversal: se avisa a toda la organización.
    emitEvent(roomOrganizacion(auth.organizationId), "evidencia:pendiente", {
      evidenciaId: evidencia.id,
      actividadId: actividad.id,
      codigo: actividad.codigo,
    });
    res.status(201).json({ ...evidencia, codigoActividad: actividad.codigo });
  }
);
