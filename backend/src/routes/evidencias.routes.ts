import { Router } from "express";
import { z } from "zod";
import { Prisma, type DecisionValidacion } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { requireRol } from "../middleware/roles.js";
import { emitEvent, roomOrganizacion, roomUnidad } from "../services/broadcast.js";
import { auditarDesde } from "../services/auditoria.js";
import { unidadesParaVerificacion } from "../services/alcance.js";
import { leerArchivo } from "../services/almacenamiento.js";

// Evidencias y validación — RF-012 · RF-013 · RF-014 · RN-009 · CA-01 · CA-02
// · HU-09 · HU-10 · HU-11.
//
// La subida vive en actividades.routes.ts (`POST /actividades/:id/evidencias`)
// porque la evidencia es un subrecurso de la actividad. Aquí está el otro lado:
// la BANDEJA del verificador y su decisión.
//
// Tres decisiones, no dos (RF-013): aprobar, rechazar o solicitar corrección.
// Solo `aprobada` otorga el punto (RN-009), y la observación es obligatoria
// cuando no se aprueba, para que el funcionario sepa qué corregir (CA-02).

export const evidenciasRouter = Router();
evidenciasRouter.use(requireAuth);

/** Decisiones que cierran el ciclo: tenerlas es "ya revisada". */
const DECIDIDAS: DecisionValidacion[] = ["aprobada", "rechazada", "correccion_solicitada"];

const validacionSchema = z
  .object({
    decision: z.enum(["aprobada", "rechazada", "correccion_solicitada"]),
    observacion: z.string().max(1000).nullable().optional(),
  })
  .refine((v) => v.decision === "aprobada" || (v.observacion?.trim().length ?? 0) >= 5, {
    message: "Rechazar o solicitar corrección exige una observación (RF-013, CA-02)",
    path: ["observacion"],
  });

const incluirEvidencia = {
  actividad: {
    select: {
      id: true,
      codigo: true,
      fecha: true,
      descripcion: true,
      anulada: true,
      funcionarioId: true,
      unidadTerritorialId: true,
      periodoId: true,
      funcionario: { select: { id: true, nombre: true } },
      unidad: { select: { id: true, nombre: true } },
      item: { select: { id: true, nombre: true } },
    },
  },
  subidaPor: { select: { id: true, nombre: true } },
  validaciones: {
    orderBy: { createdAt: "desc" },
    include: { verificador: { select: { id: true, nombre: true } } },
  },
} satisfies Prisma.EvidenciaInclude;

/**
 * GET /evidencias — bandeja del verificador (HU-11).
 * ?estado=pendiente | aprobada | rechazada | correccion_solicitada
 * ?periodo= ?unidad= ?limite= ?desde=
 *
 * "Pendiente" es no tener ninguna decisión tomada: cubre tanto la evidencia
 * recién subida como las filas en estado `pendiente` que quedaron del cargado
 * inicial de datos.
 */
evidenciasRouter.get("/", async (req, res) => {
  const auth = req.auth!;
  const q = req.query;
  const unidadId = typeof q.unidad === "string" ? q.unidad : undefined;
  const visibles = await unidadesParaVerificacion(auth);
  if (unidadId && visibles !== null && !visibles.includes(unidadId)) {
    return res.status(404).json({ error: "No encontrado" });
  }

  const estado = typeof q.estado === "string" ? q.estado : "pendiente";
  const limite = Math.min(Number(q.limite ?? 50) || 50, 200);
  const desplazamiento = Math.max(Number(q.desde ?? 0) || 0, 0);

  const where: Prisma.EvidenciaWhereInput = {
    organizationId: auth.organizationId,
    actividad: {
      anulada: false,
      ...(typeof q.periodo === "string" ? { periodoId: q.periodo } : {}),
      ...(unidadId
        ? { unidadTerritorialId: unidadId }
        : visibles !== null
          ? { unidadTerritorialId: { in: visibles } }
          : {}),
    },
    ...(estado === "pendiente"
      ? { validaciones: { none: { decision: { in: DECIDIDAS } } } }
      : DECIDIDAS.includes(estado as DecisionValidacion)
        ? { validaciones: { some: { decision: estado as DecisionValidacion } } }
        : {}),
  };

  const [total, evidencias] = await Promise.all([
    prisma.evidencia.count({ where }),
    prisma.evidencia.findMany({
      where,
      include: incluirEvidencia,
      // Lo PENDIENTE es una cola: primero lo que lleva más tiempo esperando.
      // Lo ya decidido es un historial: primero lo más reciente, que es lo que
      // alguien busca cuando revisa qué se resolvió.
      orderBy: { createdAt: estado === "pendiente" ? "asc" : "desc" },
      take: limite,
      skip: desplazamiento,
    }),
  ]);
  res.json({ total, limite, desde: desplazamiento, estado, evidencias });
});

evidenciasRouter.get("/:id", async (req, res) => {
  const auth = req.auth!;
  const evidencia = await prisma.evidencia.findFirst({
    where: { id: String(req.params.id), organizationId: auth.organizationId },
    include: incluirEvidencia,
  });
  if (!evidencia) return res.status(404).json({ error: "No encontrado" });
  const visibles = await unidadesParaVerificacion(auth);
  if (visibles !== null && !visibles.includes(evidencia.actividad.unidadTerritorialId)) {
    return res.status(404).json({ error: "No encontrado" });
  }
  res.json(evidencia);
});

// GET /evidencias/:id/archivo — RNF-017 (acceso controlado): el archivo NO se
// sirve como estático; se entrega solo a quien puede ver esa delegación o
// tiene función de verificación, y se registra su tipo real.
evidenciasRouter.get("/:id/archivo", async (req, res) => {
  const auth = req.auth!;
  const evidencia = await prisma.evidencia.findFirst({
    where: { id: String(req.params.id), organizationId: auth.organizationId },
    include: { actividad: { select: { unidadTerritorialId: true } } },
  });
  if (!evidencia) return res.status(404).json({ error: "No encontrado" });
  const visibles = await unidadesParaVerificacion(auth);
  if (visibles !== null && !visibles.includes(evidencia.actividad.unidadTerritorialId)) {
    return res.status(404).json({ error: "No encontrado" });
  }

  try {
    const contenido = await leerArchivo(evidencia.archivoRuta);
    res.setHeader("Content-Type", evidencia.mimeType);
    res.setHeader("Content-Length", String(contenido.length));
    // `inline` con nombre saneado: el navegador nunca ve una ruta del servidor.
    res.setHeader("Content-Disposition", `inline; filename="${evidencia.archivoNombre}"`);
    res.send(contenido);
  } catch {
    res.status(410).json({ error: "El archivo de la evidencia no está disponible en el almacén" });
  }
});

// POST /evidencias/:id/validacion — RF-013 · RF-014 · HU-11.
//
// Segregación de funciones (RNF-005): nadie valida su propia evidencia ni su
// propia actividad, aunque tenga el rol. Es la garantía de que el "1" que suma
// al puntaje lo pone otra persona.
evidenciasRouter.post(
  "/:id/validacion",
  requireRol("verificador", "supervisor", "admin"),
  async (req, res) => {
    const parsed = validacionSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Datos inválidos", detalle: parsed.error.issues });
    const auth = req.auth!;
    const id = String(req.params.id);

    const evidencia = await prisma.evidencia.findFirst({
      where: { id, organizationId: auth.organizationId },
      include: {
        actividad: { include: { periodo: { select: { estado: true, nombre: true } } } },
        validaciones: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    });
    if (!evidencia) return res.status(404).json({ error: "No encontrado" });

    if (evidencia.subidaPorId === auth.userId || evidencia.actividad.funcionarioId === auth.userId) {
      return res.status(403).json({
        error: "No se puede validar la propia evidencia (segregación de funciones, RNF-005)",
      });
    }
    if (evidencia.actividad.anulada) {
      return res.status(422).json({ error: "La actividad está anulada: su evidencia no se valida" });
    }
    if (evidencia.actividad.periodo.estado !== "abierto") {
      return res.status(422).json({
        error: `El período "${evidencia.actividad.periodo.nombre}" está cerrado: no admite validaciones (RN-013)`,
      });
    }
    // CA-01: una aprobación es definitiva y suma UNA sola vez. Cambiarla
    // alteraría un puntaje ya contabilizado; para eso está la anulación.
    if (evidencia.validaciones[0]?.decision === "aprobada") {
      return res.status(422).json({
        error: "La evidencia ya fue aprobada y su punto ya está contabilizado (CA-01)",
      });
    }

    const validacion = await prisma.validacion.create({
      data: {
        organizationId: auth.organizationId,
        evidenciaId: evidencia.id,
        verificadorId: auth.userId,
        decision: parsed.data.decision,
        observacion: parsed.data.observacion?.trim() || null,
        decididaEn: new Date(),
      },
      include: { verificador: { select: { id: true, nombre: true } } },
    });

    await auditarDesde(auth, req)({
      accion: "validar",
      entidad: "evidencia",
      entidadId: evidencia.id,
      valorAnterior: evidencia.validaciones[0] ?? null,
      valorNuevo: { ...validacion, codigoActividad: evidencia.actividad.codigo },
    });

    const carga = {
      validacion,
      evidenciaId: evidencia.id,
      actividadId: evidencia.actividadId,
      codigo: evidencia.actividad.codigo,
    };
    emitEvent(roomUnidad(evidencia.actividad.unidadTerritorialId), "validacion:registrada", carga);
    // CA-01: solo lo aprobado mueve el avance; el tablero se refresca al oírlo.
    if (parsed.data.decision === "aprobada") {
      emitEvent(roomOrganizacion(auth.organizationId), "cumplimiento:cambiado", {
        periodoId: evidencia.actividad.periodoId,
        funcionarioId: evidencia.actividad.funcionarioId,
      });
    }
    res.status(201).json(carga);
  }
);
