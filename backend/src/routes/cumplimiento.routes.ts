import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { calcularPeriodo, consolidarPeriodo } from "../services/cumplimiento.js";
import { obtenerParametros } from "../services/parametros.js";
import { aIso, diasDelPeriodo, diasTranscurridos } from "../lib/fechas.js";

// Cumplimiento por funcionario y su consolidación por delegación —
// RF-022 a RF-029 · RN-003 a RN-009 · HU-06, HU-07, HU-16, HU-17.
//
// Desde el Bloque C esta es la ÚNICA fuente de cumplimiento del sistema: la
// vista materializada v1 (`cumplimiento_ponderado_vista`, por delegación y con
// el tope y los umbrales escritos en SQL) fue eliminada junto con
// `GET /kpis/cumplimiento`. Ya no hay dos verdades.
//
// Visibilidad: el semáforo consolidado lo ve TODO el mundo — es lo que
// alimenta la sana competencia entre delegaciones (cliente, reunión 00:37:11).
// El detalle sensible (el libro) sigue privado por delegación.

export const cumplimientoRouter = Router();
cumplimientoRouter.use(requireAuth);

async function periodoDelTenant(periodoId: string, organizationId: string) {
  return prisma.periodo.findFirst({ where: { id: periodoId, organizationId } });
}

function cabeceraPeriodo(periodo: {
  id: string;
  nombre: string;
  estado: string;
  fechaInicio: Date;
  fechaTermino: Date;
}) {
  return {
    id: periodo.id,
    nombre: periodo.nombre,
    estado: periodo.estado,
    fechaInicio: aIso(periodo.fechaInicio),
    fechaTermino: aIso(periodo.fechaTermino),
    diasTotales: diasDelPeriodo(periodo.fechaInicio, periodo.fechaTermino),
    diasTranscurridos: diasTranscurridos(periodo.fechaInicio, periodo.fechaTermino),
  };
}

// GET /cumplimiento/:periodoId/consolidado
// Lo que consume el dashboard (RF-029). Devuelve delegaciones, su avance por
// área del cargo y las que NO tienen a nadie con meta configurada — ese último
// dato es el que hace visible un hueco que antes se leía como un 0%.
cumplimientoRouter.get("/:periodoId/consolidado", async (req, res) => {
  const auth = req.auth!;
  const periodo = await periodoDelTenant(String(req.params.periodoId), auth.organizationId);
  if (!periodo) return res.status(404).json({ error: "Período no encontrado" });

  const [consolidado, parametros] = await Promise.all([
    consolidarPeriodo(auth.organizationId, periodo.id),
    obtenerParametros(auth.organizationId, periodo.id),
  ]);

  res.json({
    periodo: cabeceraPeriodo(periodo),
    // Los parámetros usados, con su marca `confirmado`: la pantalla debe poder
    // advertir que un número todavía espera definición del docente (ADR-007).
    parametros,
    ...consolidado,
  });
});

// GET /cumplimiento/:periodoId[?unidad=&funcionario=]
cumplimientoRouter.get("/:periodoId", async (req, res) => {
  const auth = req.auth!;
  const periodo = await periodoDelTenant(String(req.params.periodoId), auth.organizationId);
  if (!periodo) return res.status(404).json({ error: "Período no encontrado" });

  const [funcionarios, parametros] = await Promise.all([
    calcularPeriodo(auth.organizationId, periodo.id),
    obtenerParametros(auth.organizationId, periodo.id),
  ]);

  const unidadId = typeof req.query.unidad === "string" ? req.query.unidad : undefined;
  const funcionarioId = typeof req.query.funcionario === "string" ? req.query.funcionario : undefined;
  const filtrados = funcionarios.filter(
    (f) =>
      (!unidadId || f.unidadTerritorialId === unidadId) &&
      (!funcionarioId || f.funcionarioId === funcionarioId)
  );

  const promedio =
    filtrados.length > 0
      ? Math.round((filtrados.reduce((s, f) => s + f.cumplimientoFinal, 0) / filtrados.length) * 10) / 10
      : 0;

  res.json({
    periodo: cabeceraPeriodo(periodo),
    parametros,
    resumen: {
      funcionarios: filtrados.length,
      promedioCumplimiento: promedio,
      porSemaforo: {
        verde: filtrados.filter((f) => f.semaforo === "verde").length,
        naranjo: filtrados.filter((f) => f.semaforo === "naranjo").length,
        rojo: filtrados.filter((f) => f.semaforo === "rojo").length,
      },
    },
    funcionarios: filtrados,
  });
});
