import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { requireRol } from "../middleware/roles.js";
import { emitEvent, roomOrganizacion } from "../services/broadcast.js";
import { unidadesVisibles } from "../services/alcance.js";
import { auditarDesde } from "../services/auditoria.js";
import { actualizarConVersion, resolverVersion } from "../services/concurrencia.js";

// Delegaciones — RF-001 · CA-08 · CA-09.
//
// Ruta heredada de la Fase 2, endurecida en el Bloque A3. Le faltaban las tres
// garantías transversales del sistema y una del propio requisito:
//   · bloqueo optimista con `version` → 409 (CA-08, ADR-005);
//   · auditoría de todo write crítico (CA-09, RNF-008, ADR-006);
//   · RF-001 pide que una delegación **se desactive**, no que se borre: el
//     esquema ya tenía la columna `activo` y la ruta la ignoraba, borrando de
//     verdad. Con actividades, metas y tareas históricas colgando de ella, eso
//     falseaba los períodos ya cerrados.

export const unidadesRouter = Router();
unidadesRouter.use(requireAuth);

const versionSchema = z.object({ version: z.number().int().positive() });

const unidadSchema = z.object({
  nombre: z.string().min(1).max(120),
  responsableId: z.string().uuid().nullable().optional(),
  activo: z.boolean().optional(),
});

// Devuelve las unidades de la organización (sus nombres se necesitan para el
// semáforo consolidado, que todos pueden ver), pero marca con `puedeVerLibro`
// cuáles tienen el tubo accesible para este rol.
//
// Por defecto solo las vigentes: una delegación desactivada desaparece de los
// selectores pero sigue siendo legible en la historia (RF-001).
unidadesRouter.get("/", async (req, res) => {
  const incluirInactivas = req.query.incluirInactivas === "1";
  const [unidades, visibles] = await Promise.all([
    prisma.unidadTerritorial.findMany({
      where: {
        organizationId: req.auth!.organizationId,
        ...(incluirInactivas ? {} : { activo: true }),
      },
      include: { responsable: { select: { id: true, nombre: true, email: true } } },
      orderBy: { nombre: "asc" },
    }),
    unidadesVisibles(req.auth!),
  ]);
  res.json(
    unidades.map((u) => ({
      ...u,
      puedeVerLibro: visibles === null || visibles.includes(u.id),
    }))
  );
});

unidadesRouter.post("/", requireRol("admin", "supervisor"), async (req, res) => {
  const parsed = unidadSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Datos inválidos", detalle: parsed.error.issues });
  const auth = req.auth!;

  const unidad = await prisma.unidadTerritorial.create({
    data: { ...parsed.data, organizationId: auth.organizationId },
  });

  await auditarDesde(auth, req)({
    accion: "crear",
    entidad: "unidad",
    entidadId: unidad.id,
    valorNuevo: unidad,
  });
  emitEvent(roomOrganizacion(unidad.organizationId), "unidad:creada", unidad);
  res.status(201).json(unidad);
});

unidadesRouter.patch("/:id", requireRol("admin", "supervisor"), async (req, res) => {
  const parsed = unidadSchema.partial().extend(versionSchema.shape).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Datos inválidos", detalle: parsed.error.issues });
  const auth = req.auth!;
  const id = String(req.params.id);

  // 404 y no 403 si es de otro tenant: no revelar existencia (HU-1.2).
  const anterior = await prisma.unidadTerritorial.findFirst({
    where: { id, organizationId: auth.organizationId },
  });
  if (!anterior) return res.status(404).json({ error: "No encontrado" });

  const { version, ...cambios } = parsed.data;
  const resultado = await actualizarConVersion({
    actualizar: async () =>
      (
        await prisma.unidadTerritorial.updateMany({
          where: { id, organizationId: auth.organizationId, version },
          data: { ...cambios, version: { increment: 1 } },
        })
      ).count,
    releer: () =>
      prisma.unidadTerritorial.findFirst({
        where: { id, organizationId: auth.organizationId },
        include: { responsable: { select: { id: true, nombre: true, email: true } } },
      }),
  });
  const unidad = resolverVersion(res, resultado, "la delegación");
  if (!unidad) return;

  await auditarDesde(auth, req)({
    accion: "actualizar",
    entidad: "unidad",
    entidadId: unidad.id,
    valorAnterior: anterior,
    valorNuevo: unidad,
  });
  emitEvent(roomOrganizacion(unidad.organizationId), "unidad:actualizada", unidad);
  res.json(unidad);
});

// DELETE /unidades/:id — **desactiva**, no borra (RF-001). El verbo se conserva
// porque es lo que significa para quien la usa: la delegación deja de estar
// disponible. Lo que no puede pasar es que se lleve consigo su historia.
unidadesRouter.delete("/:id", requireRol("admin", "supervisor"), async (req, res) => {
  const auth = req.auth!;
  const existente = await prisma.unidadTerritorial.findFirst({
    where: { id: String(req.params.id), organizationId: auth.organizationId },
  });
  if (!existente) return res.status(404).json({ error: "No encontrado" });
  if (!existente.activo) return res.status(204).end(); // idempotente

  const unidad = await prisma.unidadTerritorial.update({
    where: { id: existente.id },
    data: { activo: false, version: { increment: 1 } },
  });

  await auditarDesde(auth, req)({
    accion: "eliminar",
    entidad: "unidad",
    entidadId: unidad.id,
    valorAnterior: existente,
    valorNuevo: unidad,
  });
  emitEvent(roomOrganizacion(existente.organizationId), "unidad:eliminada", { id: existente.id });
  res.status(204).end();
});
