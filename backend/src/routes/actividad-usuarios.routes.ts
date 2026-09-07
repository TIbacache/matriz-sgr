import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { panelActividad } from "../services/actividad-usuarios.js";
import { conectadosEnOrganizacion } from "../services/presencia.js";
import { auditarDesde } from "../services/auditoria.js";
import { aIso, diasDelPeriodo, diasTranscurridos } from "../lib/fechas.js";

// Control de actividad de usuarios — RF-030 · HU-19 · ADR-015.
//
// Quién registró trabajo, **quién no** y quién está conectado ahora. Lo pidió
// el docente en clase para el administrador y el coordinador
// (requerimientos-oficiales §9.ter).
//
// Alcance: SOLO admin y supervisor, y el 403 dice por qué. No es una
// restricción de comodidad — el panel cruza desempeño individual con presencia
// en línea, que es lo más parecido a monitoreo laboral que tiene el sistema.
// Bajo las Leyes 19.628 / 21.719 eso exige finalidad declarada, mínimo
// privilegio y trazabilidad, así que abrirlo se AUDITA como `consultar`, igual
// que abrir la ficha de un vecino (ADR-012, ADR-015).

export const actividadUsuariosRouter = Router();
actividadUsuariosRouter.use(requireAuth);

const MOTIVO_403 =
  "El control de actividad de usuarios cruza el registro de trabajo de cada " +
  "funcionario con su conexión en línea. Solo lo ven el administrador y el " +
  "coordinador, que son quienes deben acompañar a un equipo que se está " +
  "quedando atrás (RF-030; Leyes 19.628 y 21.719: finalidad y proporcionalidad).";

// GET /actividad-usuarios?periodo=<id>[&unidad=<id>]
actividadUsuariosRouter.get("/", async (req, res) => {
  const auth = req.auth!;
  if (auth.rol !== "admin" && auth.rol !== "supervisor") {
    return res.status(403).json({ error: "Sin permisos para esta consulta", motivo: MOTIVO_403 });
  }

  const periodoId = typeof req.query.periodo === "string" ? req.query.periodo : null;
  if (!periodoId) {
    return res.status(400).json({ error: "Falta el parámetro `periodo`" });
  }
  const periodo = await prisma.periodo.findFirst({
    where: { id: periodoId, organizationId: auth.organizationId },
  });
  if (!periodo) return res.status(404).json({ error: "Período no encontrado" });

  const unidadId = typeof req.query.unidad === "string" ? req.query.unidad : undefined;
  if (unidadId) {
    const unidad = await prisma.unidadTerritorial.findFirst({
      where: { id: unidadId, organizationId: auth.organizationId },
      select: { id: true },
    });
    if (!unidad) return res.status(404).json({ error: "Delegación no encontrada" });
  }

  const panel = await panelActividad(auth.organizationId, periodo.id, unidadId);

  // Sin await: la bitácora no debe demorar la respuesta y nunca lanza.
  void auditarDesde(auth, req)({
    accion: "consultar",
    entidad: "ActividadUsuarios",
    entidadId: periodo.id,
    valorNuevo: {
      periodo: periodo.nombre,
      unidad: unidadId ?? "todas",
      medidos: panel.resumen.medidos,
      sinRegistro: panel.resumen.sinRegistro,
      conectadosAhora: panel.resumen.conectadosAhora,
    },
  });

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
    ...panel,
    // La lista completa de conectados incluye a quien no tiene cargo medido
    // (el propio coordinador, el verificador). Va aparte del panel porque
    // responde otra pregunta: "quién está en la plataforma", no "quién registra".
    conectados: conectadosEnOrganizacion(auth.organizationId),
  });
});
