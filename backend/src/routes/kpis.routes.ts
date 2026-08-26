import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { requireRol } from "../middleware/roles.js";
import { refrescarCumplimiento } from "../jobs/cumplimiento.js";

export const kpisRouter = Router();
kpisRouter.use(requireAuth);

interface FilaCumplimiento {
  organization_id: string;
  unidad_territorial_id: string;
  unidad_nombre: string;
  categoria_id: string;
  categoria_nombre: string;
  trimestre: string;
  cumplimiento_categoria: number; // avance/meta del ítem, tope 150%
  ponderador: number;
  cumplimiento_total: number; // suma ponderada de la unidad
  objetivo_al_dia: number; // % que se debería llevar hoy
  dias_efectivos: number;
  dias_transcurridos: number;
  avance_relativo: number; // cumplimiento_total vs objetivo_al_dia → colorea
  semaforo_color: "verde" | "naranjo" | "rojo";
}

// GET /kpis/cumplimiento[?trimestre=2026-Q3]
// Fuente: vista materializada (refrescada por cron). Alimenta gauges (HU-5.1),
// heatmap (HU-5.2) y radar (HU-5.3); el frontend pivotea las filas.
// Visible para TODOS los roles: el semáforo consolidado es lo que alimenta la
// sana competencia entre delegaciones (Efecto Hawthorne), a diferencia del
// tubo, que sí es privado por delegación.
kpisRouter.get("/cumplimiento", async (req, res) => {
  const trimestre = typeof req.query.trimestre === "string" ? req.query.trimestre : null;
  const filas = await prisma.$queryRaw<FilaCumplimiento[]>`
    SELECT * FROM cumplimiento_ponderado_vista
    WHERE organization_id = ${req.auth!.organizationId}
      AND (${trimestre}::text IS NULL OR trimestre = ${trimestre})
    ORDER BY unidad_nombre, categoria_nombre
  `;
  res.json(filas);
});

// GET /kpis/tubo — estadísticas AGREGADAS del tubo por delegación (conteos por
// estado + vencidas). Público para todos los roles: son números sin el detalle
// de las tareas, misma categoría que el semáforo consolidado. El detalle del
// libro sigue siendo privado por delegación.
kpisRouter.get("/tubo", async (req, res) => {
  const orgId = req.auth!.organizationId;
  const [porEstado, vencidas] = await Promise.all([
    prisma.tarea.groupBy({
      by: ["unidadTerritorialId", "estado"],
      where: { organizationId: orgId },
      _count: { _all: true },
    }),
    prisma.tarea.groupBy({
      by: ["unidadTerritorialId"],
      where: {
        organizationId: orgId,
        estado: { not: "realizado" },
        fechaCompromiso: { lt: new Date() },
      },
      _count: { _all: true },
    }),
  ]);
  const unidades = await prisma.unidadTerritorial.findMany({
    where: { organizationId: orgId },
    select: { id: true, nombre: true },
    orderBy: { nombre: "asc" },
  });
  const vencidasPorUnidad = new Map(vencidas.map((v) => [v.unidadTerritorialId, v._count._all]));
  res.json(
    unidades.map((u) => {
      const estados: Record<string, number> = {};
      for (const fila of porEstado) {
        if (fila.unidadTerritorialId === u.id) estados[fila.estado] = fila._count._all;
      }
      return {
        unidadTerritorialId: u.id,
        unidadNombre: u.nombre,
        estados,
        vencidas: vencidasPorUnidad.get(u.id) ?? 0,
      };
    })
  );
});

// Recálculo manual (además del cron), para el botón "Actualizar" del dashboard.
kpisRouter.post("/recalcular", requireRol("admin", "supervisor"), async (_req, res) => {
  await refrescarCumplimiento();
  res.json({ ok: true, timestamp: new Date().toISOString() });
});
