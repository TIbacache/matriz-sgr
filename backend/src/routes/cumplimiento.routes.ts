import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { calcularPeriodo } from "../services/cumplimiento.js";
import { obtenerParametros } from "../services/parametros.js";
import { aIso, diasDelPeriodo, diasTranscurridos } from "../lib/fechas.js";

// Cumplimiento por funcionario — RF-022 a RF-028 · RN-003 a RN-009 · HU-06,
// HU-07, HU-16, HU-17.
//
// Expone `services/cumplimiento.ts`, que ya estaba construido y verificado
// (21 comprobaciones) pero no tenía puerta de entrada. Es el cálculo CORRECTO
// según la especificación: por funcionario, contando solo lo validado.
//
// ⚠ Convive con la vista materializada v1 que alimenta el dashboard actual
// (`GET /kpis/cumplimiento`, por delegación y con umbrales fijos en SQL). El
// objetivo declarado es que este endpoint la reemplace (Bloque C); hasta
// entonces son dos fuentes y no deben mezclarse.
//
// Visibilidad: el semáforo consolidado lo ve TODO el mundo, igual que
// `/kpis` — es lo que alimenta la sana competencia entre delegaciones
// (cliente, reunión 00:37:11). El detalle sensible (el libro) sigue privado.

export const cumplimientoRouter = Router();
cumplimientoRouter.use(requireAuth);

// GET /cumplimiento/:periodoId[?unidad=&funcionario=]
cumplimientoRouter.get("/:periodoId", async (req, res) => {
  const auth = req.auth!;
  const periodoId = String(req.params.periodoId);

  const periodo = await prisma.periodo.findFirst({
    where: { id: periodoId, organizationId: auth.organizationId },
  });
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
    periodo: {
      id: periodo.id,
      nombre: periodo.nombre,
      estado: periodo.estado,
      fechaInicio: aIso(periodo.fechaInicio),
      fechaTermino: aIso(periodo.fechaTermino),
      diasTotales: diasDelPeriodo(periodo.fechaInicio, periodo.fechaTermino),
      diasTranscurridos: diasTranscurridos(periodo.fechaInicio, periodo.fechaTermino),
    },
    // Se devuelven los parámetros usados, con su marca `confirmado`: la UI debe
    // advertir cuando un número todavía espera definición del docente (ADR-007,
    // requerimientos-oficiales §10). Mostrarlos como definitivos sería mentir.
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
