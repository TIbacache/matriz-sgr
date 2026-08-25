import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth, type AuthPayload } from "../middleware/auth.js";
import { requireRol } from "../middleware/roles.js";
import { emitEvent, roomUnidad } from "../services/broadcast.js";

export const tareasRouter = Router();
tareasRouter.use(requireAuth);

const tareaSchema = z.object({
  titulo: z.string().min(1).max(200),
  descripcion: z.string().max(2000).nullable().optional(),
  unidadTerritorialId: z.string().uuid(),
  categoriaId: z.string().uuid(),
  estado: z.string().min(1).max(50).optional(),
  fechaCompromiso: z.coerce.date().nullable().optional(),
  responsableId: z.string().uuid().nullable().optional(),
});

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

// GET /tareas?unidad=<id> — también es el mecanismo de RECUPERACIÓN tras
// reconexión de Socket.io (HU-3.4): el cliente recarga el estado completo.
tareasRouter.get("/", async (req, res) => {
  const unidadId = typeof req.query.unidad === "string" ? req.query.unidad : undefined;
  const tareas = await prisma.tarea.findMany({
    where: {
      organizationId: req.auth!.organizationId,
      ...(unidadId ? { unidadTerritorialId: unidadId } : {}),
    },
    include: {
      responsable: { select: { id: true, nombre: true } },
      categoria: { select: { id: true, nombre: true } },
    },
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

  const tarea = await prisma.tarea.create({
    data: { ...parsed.data, organizationId: auth.organizationId },
    include: {
      responsable: { select: { id: true, nombre: true } },
      categoria: { select: { id: true, nombre: true } },
    },
  });
  emitEvent(roomUnidad(tarea.unidadTerritorialId), "tarea:creada", tarea);
  res.status(201).json(tarea);
});

// PATCH /tareas/:id — lo dispara el drag & drop del kanban (HU-3.1).
tareasRouter.patch("/:id", async (req, res) => {
  const parsed = tareaSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Datos inválidos" });
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

  const tarea = await prisma.tarea.update({
    where: { id: existente.id },
    data: parsed.data,
    include: {
      responsable: { select: { id: true, nombre: true } },
      categoria: { select: { id: true, nombre: true } },
    },
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
  emitEvent(roomUnidad(existente.unidadTerritorialId), "tarea:eliminada", { id: existente.id });
  res.status(204).end();
});
