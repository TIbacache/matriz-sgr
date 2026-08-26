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

// Recálculo manual (además del cron), para el botón "Actualizar" del dashboard.
kpisRouter.post("/recalcular", requireRol("admin", "supervisor"), async (_req, res) => {
  await refrescarCumplimiento();
  res.json({ ok: true, timestamp: new Date().toISOString() });
});
