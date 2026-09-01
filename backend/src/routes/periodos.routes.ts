import { Router } from "express";
import { z } from "zod";
import type { Periodo } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { requireRol } from "../middleware/roles.js";
import { emitEvent, roomOrganizacion } from "../services/broadcast.js";
import { auditarDesde } from "../services/auditoria.js";
import { actualizarConVersion, resolverVersion } from "../services/concurrencia.js";
import { aIso, desdeIso, diasDelPeriodo, diasTranscurridos } from "../lib/fechas.js";

// Períodos — RF-005 · RN-013 · CA-10 · HU-28.
//
// Va primero de todo el bloque porque sin período abierto no se registra nada.
//
// Los días NO se codifican (§13.1 del PDF prohíbe fijar 90/91): se calculan
// desde las fechas configuradas con lib/fechas.ts, y "hoy" lo pone el servidor.
//
// Quién puede qué:
//   crear / editar / cerrar → admin y supervisor (Administrador y Coordinador)
//   REABRIR                 → solo admin, con motivo obligatorio y auditado
//                             (RN-013: "salvo reapertura autorizada y auditada")

export const periodosRouter = Router();
periodosRouter.use(requireAuth);

const ISO_DIA = /^\d{4}-\d{2}-\d{2}$/;

const periodoSchema = z.object({
  nombre: z.string().min(1).max(120),
  fechaInicio: z.string().regex(ISO_DIA, "Formato ISO 8601: 2026-07-01"),
  fechaTermino: z.string().regex(ISO_DIA, "Formato ISO 8601: 2026-09-30"),
});

const versionSchema = z.object({ version: z.number().int().positive() });

/** El período con sus días calculados. Nunca se guarda un total de días. */
function conDias(p: Periodo) {
  const diasTotales = diasDelPeriodo(p.fechaInicio, p.fechaTermino);
  const transcurridos = diasTranscurridos(p.fechaInicio, p.fechaTermino);
  return {
    ...p,
    fechaInicio: aIso(p.fechaInicio),
    fechaTermino: aIso(p.fechaTermino),
    diasTotales,
    diasTranscurridos: transcurridos,
    // RN-007: la base del objetivo al día, antes de descontar ausencias
    porcentajeTranscurrido: diasTotales > 0 ? Math.round((transcurridos / diasTotales) * 1000) / 10 : 0,
  };
}

/**
 * RF-010 (coherencia): dos períodos de la misma organización no pueden
 * solaparse — si lo hicieran, una actividad podría caer en dos períodos y el
 * avance se contaría dos veces.
 */
async function haySolapamiento(
  organizationId: string,
  inicio: Date,
  termino: Date,
  excluirId?: string
): Promise<Periodo | null> {
  return prisma.periodo.findFirst({
    where: {
      organizationId,
      ...(excluirId ? { NOT: { id: excluirId } } : {}),
      fechaInicio: { lte: termino },
      fechaTermino: { gte: inicio },
    },
  });
}

// GET /periodos[?estado=abierto] — visible para todos los roles: saber en qué
// período se está trabajando no es información reservada.
periodosRouter.get("/", async (req, res) => {
  const estado = req.query.estado === "abierto" || req.query.estado === "cerrado" ? req.query.estado : undefined;
  const periodos = await prisma.periodo.findMany({
    where: { organizationId: req.auth!.organizationId, ...(estado ? { estado } : {}) },
    orderBy: { fechaInicio: "desc" },
  });
  res.json(periodos.map(conDias));
});

periodosRouter.get("/:id", async (req, res) => {
  const periodo = await prisma.periodo.findFirst({
    where: { id: String(req.params.id), organizationId: req.auth!.organizationId },
  });
  if (!periodo) return res.status(404).json({ error: "No encontrado" });
  res.json(conDias(periodo));
});

periodosRouter.post("/", requireRol("admin", "supervisor"), async (req, res) => {
  const parsed = periodoSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Datos inválidos", detalle: parsed.error.issues });
  const auth = req.auth!;
  const inicio = desdeIso(parsed.data.fechaInicio);
  const termino = desdeIso(parsed.data.fechaTermino);

  if (termino < inicio) {
    return res.status(422).json({ error: "La fecha de término no puede ser anterior a la de inicio" });
  }
  const duplicado = await prisma.periodo.findFirst({
    where: { organizationId: auth.organizationId, nombre: parsed.data.nombre },
    select: { id: true },
  });
  if (duplicado) return res.status(422).json({ error: "Ya existe un período con ese nombre" });

  const solapado = await haySolapamiento(auth.organizationId, inicio, termino);
  if (solapado) {
    return res.status(422).json({
      error: `Las fechas se solapan con el período "${solapado.nombre}" (${aIso(solapado.fechaInicio)} a ${aIso(solapado.fechaTermino)})`,
    });
  }

  const periodo = await prisma.periodo.create({
    data: {
      organizationId: auth.organizationId,
      nombre: parsed.data.nombre,
      fechaInicio: inicio,
      fechaTermino: termino,
    },
  });

  await auditarDesde(auth, req)({ accion: "crear", entidad: "periodo", entidadId: periodo.id, valorNuevo: periodo });
  emitEvent(roomOrganizacion(auth.organizationId), "periodo:creado", conDias(periodo));
  res.status(201).json(conDias(periodo));
});

// PATCH /periodos/:id — exige `version` (ADR-005). Un período CERRADO no se
// modifica: primero hay que reabrirlo, y eso queda auditado (RN-013, CA-10).
periodosRouter.patch("/:id", requireRol("admin", "supervisor"), async (req, res) => {
  const parsed = periodoSchema.partial().extend(versionSchema.shape).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Datos inválidos", detalle: parsed.error.issues });
  const auth = req.auth!;
  const id = String(req.params.id);

  const anterior = await prisma.periodo.findFirst({ where: { id, organizationId: auth.organizationId } });
  if (!anterior) return res.status(404).json({ error: "No encontrado" });
  if (anterior.estado === "cerrado") {
    return res.status(422).json({
      error: "Un período cerrado no se modifica (RN-013). Debe reabrirse con motivo antes de editarlo.",
    });
  }

  const inicio = parsed.data.fechaInicio ? desdeIso(parsed.data.fechaInicio) : anterior.fechaInicio;
  const termino = parsed.data.fechaTermino ? desdeIso(parsed.data.fechaTermino) : anterior.fechaTermino;
  if (termino < inicio) {
    return res.status(422).json({ error: "La fecha de término no puede ser anterior a la de inicio" });
  }
  const solapado = await haySolapamiento(auth.organizationId, inicio, termino, id);
  if (solapado) {
    return res.status(422).json({ error: `Las fechas se solapan con el período "${solapado.nombre}"` });
  }

  const resultado = await actualizarConVersion({
    actualizar: async () =>
      (
        await prisma.periodo.updateMany({
          where: { id, organizationId: auth.organizationId, version: parsed.data.version },
          data: {
            ...(parsed.data.nombre ? { nombre: parsed.data.nombre } : {}),
            fechaInicio: inicio,
            fechaTermino: termino,
            version: { increment: 1 },
          },
        })
      ).count,
    releer: () => prisma.periodo.findFirst({ where: { id, organizationId: auth.organizationId } }),
  });
  const periodo = resolverVersion(res, resultado, "el período");
  if (!periodo) return;

  await auditarDesde(auth, req)({
    accion: "actualizar",
    entidad: "periodo",
    entidadId: periodo.id,
    valorAnterior: anterior,
    valorNuevo: periodo,
  });
  emitEvent(roomOrganizacion(auth.organizationId), "periodo:actualizado", conDias(periodo));
  res.json(conDias(periodo));
});

// POST /periodos/:id/cierre — congela los resultados (RN-013, CA-10, HU-28).
periodosRouter.post("/:id/cierre", requireRol("admin", "supervisor"), async (req, res) => {
  const parsed = versionSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Falta la versión del registro" });
  const auth = req.auth!;
  const id = String(req.params.id);

  const anterior = await prisma.periodo.findFirst({ where: { id, organizationId: auth.organizationId } });
  if (!anterior) return res.status(404).json({ error: "No encontrado" });
  if (anterior.estado === "cerrado") return res.status(422).json({ error: "El período ya está cerrado" });

  const resultado = await actualizarConVersion({
    actualizar: async () =>
      (
        await prisma.periodo.updateMany({
          where: { id, organizationId: auth.organizationId, version: parsed.data.version, estado: "abierto" },
          data: {
            estado: "cerrado",
            cerradoEn: new Date(),
            cerradoPorId: auth.userId,
            version: { increment: 1 },
          },
        })
      ).count,
    releer: () => prisma.periodo.findFirst({ where: { id, organizationId: auth.organizationId } }),
  });
  const periodo = resolverVersion(res, resultado, "el período");
  if (!periodo) return;

  await auditarDesde(auth, req)({
    accion: "cerrar_periodo",
    entidad: "periodo",
    entidadId: periodo.id,
    valorAnterior: anterior,
    valorNuevo: periodo,
  });
  emitEvent(roomOrganizacion(auth.organizationId), "periodo:cerrado", conDias(periodo));
  res.json(conDias(periodo));
});

// POST /periodos/:id/reapertura — RN-013: autorizada (solo admin) y auditada,
// con motivo obligatorio. El motivo queda en la bitácora, no en el período:
// la auditoría es de solo inserción y no se puede alterar después (ADR-006).
periodosRouter.post("/:id/reapertura", requireRol("admin"), async (req, res) => {
  const parsed = versionSchema.extend({ motivo: z.string().min(10).max(500) }).safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Se requiere versión y un motivo de al menos 10 caracteres" });
  }
  const auth = req.auth!;
  const id = String(req.params.id);

  const anterior = await prisma.periodo.findFirst({ where: { id, organizationId: auth.organizationId } });
  if (!anterior) return res.status(404).json({ error: "No encontrado" });
  if (anterior.estado === "abierto") return res.status(422).json({ error: "El período ya está abierto" });

  const resultado = await actualizarConVersion({
    actualizar: async () =>
      (
        await prisma.periodo.updateMany({
          where: { id, organizationId: auth.organizationId, version: parsed.data.version, estado: "cerrado" },
          data: { estado: "abierto", cerradoEn: null, cerradoPorId: null, version: { increment: 1 } },
        })
      ).count,
    releer: () => prisma.periodo.findFirst({ where: { id, organizationId: auth.organizationId } }),
  });
  const periodo = resolverVersion(res, resultado, "el período");
  if (!periodo) return;

  await auditarDesde(auth, req)({
    accion: "reabrir_periodo",
    entidad: "periodo",
    entidadId: periodo.id,
    valorAnterior: anterior,
    valorNuevo: { ...periodo, motivoReapertura: parsed.data.motivo },
  });
  emitEvent(roomOrganizacion(auth.organizationId), "periodo:reabierto", conDias(periodo));
  res.json(conDias(periodo));
});
