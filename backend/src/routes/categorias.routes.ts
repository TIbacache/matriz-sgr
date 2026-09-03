import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { requireRol } from "../middleware/roles.js";
import { emitEvent, roomOrganizacion } from "../services/broadcast.js";
import { auditarDesde } from "../services/auditoria.js";
import { actualizarConVersion, resolverVersion } from "../services/concurrencia.js";

// Categorías de gestión del tubo — sostienen EP-04 y el color de la tarjeta.
//
// Ruta heredada de la Fase 2, endurecida en el Bloque A3: "v1" nunca quiso
// decir "obsoleta". Le faltaban las dos garantías transversales del sistema:
// bloqueo optimista con `version` → 409 (CA-08, ADR-005) y auditoría de todo
// write crítico (CA-09, RNF-008, ADR-006).

export const categoriasRouter = Router();
categoriasRouter.use(requireAuth);

const versionSchema = z.object({ version: z.number().int().positive() });

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
  if (!parsed.success) return res.status(400).json({ error: "Datos inválidos", detalle: parsed.error.issues });
  const auth = req.auth!;

  const categoria = await prisma.categoriaGestion.create({
    data: { ...parsed.data, organizationId: auth.organizationId },
  });

  await auditarDesde(auth, req)({
    accion: "crear",
    entidad: "categoria",
    entidadId: categoria.id,
    valorNuevo: categoria,
  });
  emitEvent(roomOrganizacion(categoria.organizationId), "categoria:creada", categoria);
  res.status(201).json(categoria);
});

categoriasRouter.patch("/:id", requireRol("admin", "supervisor"), async (req, res) => {
  const parsed = categoriaSchema.partial().extend(versionSchema.shape).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Datos inválidos", detalle: parsed.error.issues });
  const auth = req.auth!;
  const id = String(req.params.id);

  // 404 y no 403 si es de otro tenant: no revelar existencia (regla 8).
  const anterior = await prisma.categoriaGestion.findFirst({
    where: { id, organizationId: auth.organizationId },
  });
  if (!anterior) return res.status(404).json({ error: "No encontrado" });

  const { version, ...cambios } = parsed.data;
  const resultado = await actualizarConVersion({
    actualizar: async () =>
      (
        await prisma.categoriaGestion.updateMany({
          where: { id, organizationId: auth.organizationId, version },
          data: { ...cambios, version: { increment: 1 } },
        })
      ).count,
    releer: () => prisma.categoriaGestion.findFirst({ where: { id, organizationId: auth.organizationId } }),
  });
  const categoria = resolverVersion(res, resultado, "la categoría");
  if (!categoria) return;

  await auditarDesde(auth, req)({
    accion: "actualizar",
    entidad: "categoria",
    entidadId: categoria.id,
    valorAnterior: anterior,
    valorNuevo: categoria,
  });
  emitEvent(roomOrganizacion(categoria.organizationId), "categoria:actualizada", categoria);
  res.json(categoria);
});

categoriasRouter.delete("/:id", requireRol("admin", "supervisor"), async (req, res) => {
  const auth = req.auth!;
  const existente = await prisma.categoriaGestion.findFirst({
    where: { id: String(req.params.id), organizationId: auth.organizationId },
  });
  if (!existente) return res.status(404).json({ error: "No encontrado" });

  // Restrict en la FK: si tiene tareas/metas asociadas, Postgres lo impide.
  try {
    await prisma.categoriaGestion.delete({ where: { id: existente.id } });
  } catch {
    return res.status(409).json({ error: "La categoría tiene tareas o metas asociadas" });
  }

  // Se audita DESPUÉS de borrar y con el valor anterior completo: la bitácora
  // es lo único que queda del registro (RNF-008).
  await auditarDesde(auth, req)({
    accion: "eliminar",
    entidad: "categoria",
    entidadId: existente.id,
    valorAnterior: existente,
  });
  emitEvent(roomOrganizacion(existente.organizationId), "categoria:eliminada", { id: existente.id });
  res.status(204).end();
});
