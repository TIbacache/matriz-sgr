import { Router } from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { requireRol } from "../middleware/roles.js";
import { emitEvent, roomOrganizacion } from "../services/broadcast.js";

export const metasRouter = Router();
metasRouter.use(requireAuth);

const metaSchema = z.object({
  unidadTerritorialId: z.string().uuid(),
  categoriaId: z.string().uuid(),
  trimestre: z.string().regex(/^\d{4}-Q[1-4]$/, "Formato: 2026-Q3"),
  metaTrimestre: z.number().positive(),
  avance: z.number().min(0).optional(),
  ponderador: z.number().min(0).max(1),
});

metasRouter.get("/", async (req, res) => {
  const trimestre = typeof req.query.trimestre === "string" ? req.query.trimestre : undefined;
  const metas = await prisma.meta.findMany({
    where: {
      organizationId: req.auth!.organizationId,
      ...(trimestre ? { trimestre } : {}),
    },
    include: {
      unidad: { select: { id: true, nombre: true } },
      categoria: { select: { id: true, nombre: true } },
    },
    orderBy: [{ trimestre: "desc" }, { unidad: { nombre: "asc" } }],
  });
  res.json(metas);
});

// Upsert de meta (HU-4.1). Decisión documentada: los ponderadores de una
// unidad+trimestre deben terminar sumando 1; como se cargan de a una, aquí
// solo se RECHAZA si la suma supera 1 y se devuelve sumaPonderadores para
// que la UI advierta mientras sea < 1.
metasRouter.put("/", requireRol("admin", "supervisor"), async (req, res) => {
  const parsed = metaSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Datos inválidos", detalle: parsed.error.issues });
  }
  const auth = req.auth!;
  const { unidadTerritorialId, categoriaId, trimestre, ponderador } = parsed.data;

  const [unidad, categoria] = await Promise.all([
    prisma.unidadTerritorial.findFirst({
      where: { id: unidadTerritorialId, organizationId: auth.organizationId },
      select: { id: true },
    }),
    prisma.categoriaGestion.findFirst({
      where: { id: categoriaId, organizationId: auth.organizationId },
      select: { id: true },
    }),
  ]);
  if (!unidad || !categoria) return res.status(404).json({ error: "Unidad o categoría no encontrada" });

  const otras = await prisma.meta.aggregate({
    where: { unidadTerritorialId, trimestre, NOT: { categoriaId } },
    _sum: { ponderador: true },
  });
  const sumaOtras = otras._sum.ponderador?.toNumber() ?? 0;
  const sumaTotal = sumaOtras + ponderador;
  if (sumaTotal > 1.0001) {
    return res.status(422).json({
      error: `Los ponderadores de la unidad superarían el 100% (quedarían en ${(sumaTotal * 100).toFixed(1)}%)`,
      sumaPonderadores: sumaTotal,
    });
  }

  const data = {
    ...parsed.data,
    metaTrimestre: new Prisma.Decimal(parsed.data.metaTrimestre),
    avance: new Prisma.Decimal(parsed.data.avance ?? 0),
    ponderador: new Prisma.Decimal(ponderador),
    organizationId: auth.organizationId,
  };
  const meta = await prisma.meta.upsert({
    where: {
      unidadTerritorialId_categoriaId_trimestre: { unidadTerritorialId, categoriaId, trimestre },
    },
    create: data,
    update: {
      metaTrimestre: data.metaTrimestre,
      avance: data.avance,
      ponderador: data.ponderador,
    },
  });

  emitEvent(roomOrganizacion(auth.organizationId), "meta:actualizada", meta);
  res.json({ ...meta, sumaPonderadores: sumaTotal });
});

// Reporte de avance (HU-4.3): gerente solo en su delegación.
metasRouter.patch("/:id/avance", requireRol("admin", "supervisor", "gerente"), async (req, res) => {
  const parsed = z.object({ avance: z.number().min(0) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Datos inválidos" });
  const auth = req.auth!;

  const existente = await prisma.meta.findFirst({
    where: { id: String(req.params.id), organizationId: auth.organizationId },
    include: { unidad: { select: { responsableId: true } } },
  });
  if (!existente) return res.status(404).json({ error: "No encontrado" });
  if (auth.rol === "gerente" && existente.unidad.responsableId !== auth.userId) {
    return res.status(403).json({ error: "Solo puede reportar avance de su delegación" });
  }

  const meta = await prisma.meta.update({
    where: { id: existente.id },
    data: { avance: new Prisma.Decimal(parsed.data.avance) },
  });
  emitEvent(roomOrganizacion(auth.organizationId), "meta:actualizada", meta);
  res.json(meta);
});

metasRouter.delete("/:id", requireRol("admin", "supervisor"), async (req, res) => {
  const existente = await prisma.meta.findFirst({
    where: { id: String(req.params.id), organizationId: req.auth!.organizationId },
  });
  if (!existente) return res.status(404).json({ error: "No encontrado" });
  await prisma.meta.delete({ where: { id: existente.id } });
  emitEvent(roomOrganizacion(existente.organizationId), "meta:eliminada", { id: existente.id });
  res.status(204).end();
});
