import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { requireRol } from "../middleware/roles.js";
import { emitEvent, roomOrganizacion } from "../services/broadcast.js";

export const categoriasRouter = Router();
categoriasRouter.use(requireAuth);

const categoriaSchema = z.object({
  nombre: z.string().min(1).max(120),
  ordenPrioridad: z.number().int().min(0),
});

categoriasRouter.get("/", async (req, res) => {
  const categorias = await prisma.categoriaGestion.findMany({
    where: { organizationId: req.auth!.organizationId },
    orderBy: { ordenPrioridad: "asc" },
  });
  res.json(categorias);
});

categoriasRouter.post("/", requireRol("admin", "supervisor"), async (req, res) => {
  const parsed = categoriaSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Datos inválidos" });

  const categoria = await prisma.categoriaGestion.create({
    data: { ...parsed.data, organizationId: req.auth!.organizationId },
  });
  emitEvent(roomOrganizacion(categoria.organizationId), "categoria:creada", categoria);
  res.status(201).json(categoria);
});

categoriasRouter.patch("/:id", requireRol("admin", "supervisor"), async (req, res) => {
  const parsed = categoriaSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Datos inválidos" });

  const existente = await prisma.categoriaGestion.findFirst({
    where: { id: req.params.id, organizationId: req.auth!.organizationId },
  });
  if (!existente) return res.status(404).json({ error: "No encontrado" });

  const categoria = await prisma.categoriaGestion.update({
    where: { id: existente.id },
    data: parsed.data,
  });
  emitEvent(roomOrganizacion(categoria.organizationId), "categoria:actualizada", categoria);
  res.json(categoria);
});

categoriasRouter.delete("/:id", requireRol("admin", "supervisor"), async (req, res) => {
  const existente = await prisma.categoriaGestion.findFirst({
    where: { id: req.params.id, organizationId: req.auth!.organizationId },
  });
  if (!existente) return res.status(404).json({ error: "No encontrado" });

  // Restrict en la FK: si tiene tareas/metas asociadas, Postgres lo impide.
  try {
    await prisma.categoriaGestion.delete({ where: { id: existente.id } });
  } catch {
    return res.status(409).json({ error: "La categoría tiene tareas o metas asociadas" });
  }
  emitEvent(roomOrganizacion(existente.organizationId), "categoria:eliminada", { id: existente.id });
  res.status(204).end();
});
