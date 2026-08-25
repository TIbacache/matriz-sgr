import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { requireRol } from "../middleware/roles.js";
import { emitEvent, roomOrganizacion } from "../services/broadcast.js";

export const unidadesRouter = Router();
unidadesRouter.use(requireAuth);

const unidadSchema = z.object({
  nombre: z.string().min(1).max(120),
  responsableId: z.string().uuid().nullable().optional(),
});

unidadesRouter.get("/", async (req, res) => {
  const unidades = await prisma.unidadTerritorial.findMany({
    where: { organizationId: req.auth!.organizationId },
    include: { responsable: { select: { id: true, nombre: true, email: true } } },
    orderBy: { nombre: "asc" },
  });
  res.json(unidades);
});

unidadesRouter.post("/", requireRol("admin", "supervisor"), async (req, res) => {
  const parsed = unidadSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Datos inválidos" });

  const unidad = await prisma.unidadTerritorial.create({
    data: { ...parsed.data, organizationId: req.auth!.organizationId },
  });
  emitEvent(roomOrganizacion(unidad.organizationId), "unidad:creada", unidad);
  res.status(201).json(unidad);
});

unidadesRouter.patch("/:id", requireRol("admin", "supervisor"), async (req, res) => {
  const parsed = unidadSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Datos inválidos" });

  // 404 y no 403 si es de otro tenant: no revelar existencia (HU-1.2).
  const existente = await prisma.unidadTerritorial.findFirst({
    where: { id: String(req.params.id), organizationId: req.auth!.organizationId },
  });
  if (!existente) return res.status(404).json({ error: "No encontrado" });

  const unidad = await prisma.unidadTerritorial.update({
    where: { id: existente.id },
    data: parsed.data,
  });
  emitEvent(roomOrganizacion(unidad.organizationId), "unidad:actualizada", unidad);
  res.json(unidad);
});

unidadesRouter.delete("/:id", requireRol("admin", "supervisor"), async (req, res) => {
  const existente = await prisma.unidadTerritorial.findFirst({
    where: { id: String(req.params.id), organizationId: req.auth!.organizationId },
  });
  if (!existente) return res.status(404).json({ error: "No encontrado" });

  await prisma.unidadTerritorial.delete({ where: { id: existente.id } });
  emitEvent(roomOrganizacion(existente.organizationId), "unidad:eliminada", { id: existente.id });
  res.status(204).end();
});
