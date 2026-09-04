import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";

// Estadísticas agregadas del tubo de trabajo.
//
// ⚠ Bloque C: este router tenía además `GET /kpis/cumplimiento` y
// `POST /kpis/recalcular`, que leían y refrescaban la vista materializada v1
// (por delegación, con el tope y los umbrales escritos en SQL). Ambos se
// eliminaron junto con la vista: el cumplimiento se calcula por funcionario en
// `services/cumplimiento.ts` y se consolida en
// `GET /cumplimiento/:periodoId/consolidado`. Ya no hay dos verdades, y por eso
// tampoco hay nada que "recalcular": el motor se ejecuta al consultarlo.
//
// `GET /kpis/tubo` sobrevive porque nunca dependió de ese cálculo: son conteos
// de tareas por estado, y el tubo es un requisito vigente (EP-04).

export const kpisRouter = Router();
kpisRouter.use(requireAuth);

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
    where: { organizationId: orgId, activo: true },
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
