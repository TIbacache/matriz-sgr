import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth, type AuthPayload } from "../middleware/auth.js";
import { emitEvent, roomUnidad } from "../services/broadcast.js";
import { auditarDesde } from "../services/auditoria.js";
import { actualizarConVersion, resolverVersion } from "../services/concurrencia.js";
import { unidadesVisibles } from "../services/alcance.js";
import { desdeIso } from "../lib/fechas.js";
import {
  camposDeGestion,
  catalogoDeGestion,
  proyectar,
  siguienteGestion,
  valorDeCatalogo,
} from "../services/atencion-social.js";

// Atención social — RF-015 · RF-004 · RN-012 · CA-04 · HU-03 · ADR-012.
//
// La atención se CREA colgada de una actividad (`POST /actividades/:id/
// atencion-social`, en actividades.routes.ts, junto a la subida de evidencia,
// que sigue el mismo patrón). Aquí viven su lectura, su corrección y —lo que
// da sentido al bloque— el AVANCE de sus gestiones.
//
// Alcance por rol: hereda el criterio de ADR-012 y lo aprieta. La situación
// socioeconómica de un vecino es el dato más sensible del sistema (Leyes
// 19.628 / 21.719), así que:
//   · `verificador` y `consulta` reciben 403 CON EL MOTIVO ESCRITO. El
//     verificador valida que la foto corresponda al código; para eso no
//     necesita saber si la persona pidió una caja de alimentos.
//   · el resto ve lo de las delegaciones que ya puede ver (regla 9): una
//     atención de otra delegación responde 404, igual que su actividad.
//   · abrir una atención QUEDA EN LA BITÁCORA como `consultar`: las leyes
//     piden trazabilidad del acceso, no solo de la modificación (ADR-006).

export const atencionesSocialesRouter = Router();
atencionesSocialesRouter.use(requireAuth);

const ISO_DIA = /^\d{4}-\d{2}-\d{2}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const fechaOpcional = z.string().regex(ISO_DIA, "Formato ISO 8601: 2026-07-13").nullable().optional();
const versionSchema = z.object({ version: z.number().int().positive() });

/** Cabecera de la atención: lo que no cambia al avanzar (planilla §4). */
export const cabeceraSchema = z.object({
  tipoAtencion: z.string().min(1).max(120),
  subAtencion: z.string().max(120).nullable().optional(),
  requiereVisita: z.boolean().optional(),
  observacion: z.string().max(1000).nullable().optional(),
});

const FECHAS_DE_GESTION = [
  "fechaProgramadaVisita",
  "fechaVisita",
  "fechaEntregaInforme",
  "fechaEntregaBeneficio",
] as const;

/**
 * Una gestión que llega. **No trae su número**: el servidor decide cuál le
 * toca según lo ya registrado. Las fechas son las de la planilla, y cada
 * gestión solo admite las suyas.
 */
const gestionSchema = z
  .object({
    gestion: z.string().min(1).max(120),
    observacion: z.string().max(1000).nullable().optional(),
    fechaProgramadaVisita: fechaOpcional,
    fechaVisita: fechaOpcional,
    fechaEntregaInforme: fechaOpcional,
    fechaEntregaBeneficio: fechaOpcional,
  })
  .extend(versionSchema.shape);

const ROLES_SIN_ACCESO = ["verificador", "consulta"];
const MOTIVO_403 =
  "La atención social contiene la situación socioeconómica de un vecino. Tu rol no accede a ese detalle: " +
  "el verificador valida que la evidencia corresponda al código, y el rol de consulta trabaja con datos " +
  "agregados (ADR-012, Leyes 19.628 y 21.719).";

/** Quién puede ESCRIBIR: igual que la actividad de la que cuelga (RNF-005). */
export async function puedeEditarAtencion(
  auth: AuthPayload,
  actividad: { funcionarioId: string; unidadTerritorialId: string }
): Promise<boolean> {
  if (auth.rol === "admin" || auth.rol === "supervisor") return true;
  if (actividad.funcionarioId === auth.userId) return true;
  if (auth.rol === "gerente") {
    const unidad = await prisma.unidadTerritorial.findFirst({
      where: { id: actividad.unidadTerritorialId, responsableId: auth.userId },
      select: { id: true },
    });
    return unidad !== null;
  }
  return false;
}

const contextoActividad = {
  select: {
    id: true,
    codigo: true,
    fecha: true,
    descripcion: true,
    anulada: true,
    funcionarioId: true,
    unidadTerritorialId: true,
    periodo: { select: { id: true, nombre: true, estado: true } },
    unidad: { select: { id: true, nombre: true } },
    funcionario: { select: { id: true, nombre: true } },
    personaUsuaria: {
      select: { id: true, rut: true, nombres: true, apellidoPaterno: true, apellidoMaterno: true },
    },
  },
} as const;

/**
 * Carga la atención con el contexto necesario para decidir, o responde y
 * devuelve null. Las cuatro comprobaciones viven aquí juntas para que ningún
 * controlador se olvide de una: rol, tenant, alcance por delegación y estado.
 */
async function cargar(req: Request, res: Response) {
  const auth = req.auth!;
  if (ROLES_SIN_ACCESO.includes(auth.rol)) {
    res.status(403).json({ error: MOTIVO_403 });
    return null;
  }
  const id = String(req.params.id);
  // Regla 8: un identificador mal formado es un error de sintaxis (400); uno
  // ajeno o inexistente, un 404. No son lo mismo y no deben confundirse.
  if (!UUID.test(id)) {
    res.status(400).json({ error: "Identificador inválido" });
    return null;
  }
  const atencion = await prisma.atencionSocial.findFirst({
    where: { id, organizationId: auth.organizationId },
    include: { actividad: contextoActividad },
  });
  // Recurso ajeno o inexistente: 404, nunca 403 (regla 8).
  if (!atencion) {
    res.status(404).json({ error: "No encontrado" });
    return null;
  }
  const visibles = await unidadesVisibles(auth);
  if (visibles !== null && !visibles.includes(atencion.actividad.unidadTerritorialId)) {
    res.status(404).json({ error: "No encontrado" });
    return null;
  }
  return { auth, atencion };
}

/** Comprobaciones comunes a todo write sobre una atención ya cargada. */
async function bloqueoDeEscritura(
  auth: AuthPayload,
  atencion: { actividad: { anulada: boolean; funcionarioId: string; unidadTerritorialId: string; periodo: { estado: string } } }
): Promise<{ status: number; error: string } | null> {
  if (!(await puedeEditarAtencion(auth, atencion.actividad))) {
    return { status: 403, error: "Sin permisos sobre esta atención social" };
  }
  if (atencion.actividad.anulada) {
    return { status: 422, error: "La actividad está anulada: no admite cambios (ADR-006)" };
  }
  if (atencion.actividad.periodo.estado !== "abierto") {
    return { status: 422, error: "El período está cerrado (RN-013)" };
  }
  return null;
}

// GET /atenciones-sociales/:id — la ficha del caso, con su avance.
atencionesSocialesRouter.get("/:id", async (req, res) => {
  const ctx = await cargar(req, res);
  if (!ctx) return;
  const { auth, atencion } = ctx;

  // ADR-006 · ADR-012: el ACCESO al caso social se audita, como la ficha del
  // vecino. Es lectura de datos personales identificados de un tercero.
  await auditarDesde(auth, req)({
    accion: "consultar",
    entidad: "atencion_social",
    entidadId: atencion.id,
    valorNuevo: { actividadId: atencion.actividadId, codigo: atencion.actividad.codigo },
  });

  res.json({ ...proyectar(atencion), actividad: atencion.actividad });
});

// PATCH /atenciones-sociales/:id — corregir la CABECERA (tipo, sub-atención,
// si requiere visita, observación). Las gestiones no se corrigen por aquí: se
// avanzan por su propio endpoint, y lo ya avanzado no se deshace.
atencionesSocialesRouter.patch("/:id", async (req, res) => {
  const parsed = cabeceraSchema.partial().extend(versionSchema.shape).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Datos inválidos", detalle: parsed.error.issues });
  const ctx = await cargar(req, res);
  if (!ctx) return;
  const { auth, atencion } = ctx;

  const bloqueo = await bloqueoDeEscritura(auth, atencion);
  if (bloqueo) return res.status(bloqueo.status).json({ error: bloqueo.error });

  const { version, ...cambios } = parsed.data;
  if (cambios.tipoAtencion && !(await valorDeCatalogo(auth.organizationId, "tipo_atencion", cambios.tipoAtencion))) {
    return res.status(422).json({ error: `"${cambios.tipoAtencion}" no es un tipo de atención vigente (RF-004)` });
  }
  if (cambios.subAtencion && !(await valorDeCatalogo(auth.organizationId, "sub_atencion", cambios.subAtencion))) {
    return res.status(422).json({ error: `"${cambios.subAtencion}" no es una sub-atención vigente (RF-004)` });
  }

  const resultado = await actualizarConVersion({
    actualizar: async () =>
      (
        await prisma.atencionSocial.updateMany({
          where: { id: atencion.id, organizationId: auth.organizationId, version },
          data: { ...cambios, version: { increment: 1 } },
        })
      ).count,
    releer: () => prisma.atencionSocial.findFirst({ where: { id: atencion.id, organizationId: auth.organizationId } }),
  });
  const actualizada = resolverVersion(res, resultado, "esta atención social");
  if (!actualizada) return;

  await auditarDesde(auth, req)({
    accion: "actualizar",
    entidad: "atencion_social",
    entidadId: actualizada.id,
    valorAnterior: atencion,
    valorNuevo: actualizada,
  });
  emitEvent(roomUnidad(atencion.actividad.unidadTerritorialId), "atencion_social:actualizada", {
    ...proyectar(actualizada),
    unidadTerritorialId: atencion.actividad.unidadTerritorialId,
  });
  res.json(proyectar(actualizada));
});

// POST /atenciones-sociales/:id/gestiones — RF-015, el corazón del bloque.
//
// Avanza UNA gestión. El cliente no dice cuál: manda el valor del catálogo y
// sus fechas, y el servidor la coloca en el casillero que toca. Así "hasta 3
// gestiones para el mismo usuario" es una secuencia garantizada, y no tres
// campos que alguien podría llenar en cualquier orden.
atencionesSocialesRouter.post("/:id/gestiones", async (req, res) => {
  const parsed = gestionSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Datos inválidos", detalle: parsed.error.issues });
  const ctx = await cargar(req, res);
  if (!ctx) return;
  const { auth, atencion } = ctx;

  const bloqueo = await bloqueoDeEscritura(auth, atencion);
  if (bloqueo) return res.status(bloqueo.status).json({ error: bloqueo.error });

  const numero = siguienteGestion(atencion);
  if (numero === null) {
    return res.status(422).json({
      error: "Esta atención ya tiene sus tres gestiones registradas: RF-015 no admite una cuarta",
      gestionesRegistradas: 3,
    });
  }

  const catalogo = catalogoDeGestion(numero);
  if (!(await valorDeCatalogo(auth.organizationId, catalogo, parsed.data.gestion))) {
    return res.status(422).json({
      error: `"${parsed.data.gestion}" no es una gestión vigente del catálogo ${catalogo} (RF-004)`,
    });
  }

  // Cada gestión solo admite sus propias fechas (planilla §4): mandar la fecha
  // de entrega del beneficio en la primera gestión es un error de quien llama,
  // no algo que haya que guardar en un campo que no le corresponde.
  const permitidos = camposDeGestion(numero);
  const enviados = FECHAS_DE_GESTION.filter((c) => parsed.data[c] != null);
  const sobrantes = enviados.filter((c) => !permitidos.includes(c));
  if (sobrantes.length > 0) {
    return res.status(422).json({
      error: `La gestión ${numero} no lleva ${sobrantes.join(", ")}. Acepta: ${permitidos.join(", ") || "solo el valor de la gestión"}`,
    });
  }

  const columnaValor = (["primeraGestion", "segundaGestion", "terceraGestion"] as const)[numero - 1]!;
  const datos: Record<string, unknown> = { [columnaValor]: parsed.data.gestion };
  for (const campo of enviados) datos[campo] = desdeIso(parsed.data[campo]!);
  // La observación de la planilla acompaña a la primera gestión; en las
  // siguientes se ANEXA, porque sobrescribirla borraría el relato del caso.
  if (parsed.data.observacion) {
    datos.observacion =
      numero === 1 || !atencion.observacion
        ? parsed.data.observacion
        : `${atencion.observacion}\n· Gestión ${numero}: ${parsed.data.observacion}`;
  }

  const resultado = await actualizarConVersion({
    actualizar: async () =>
      (
        await prisma.atencionSocial.updateMany({
          where: { id: atencion.id, organizationId: auth.organizationId, version: parsed.data.version },
          data: { ...datos, version: { increment: 1 } },
        })
      ).count,
    releer: () => prisma.atencionSocial.findFirst({ where: { id: atencion.id, organizationId: auth.organizationId } }),
  });
  const avanzada = resolverVersion(res, resultado, "esta atención social");
  if (!avanzada) return;

  await auditarDesde(auth, req)({
    // Avanzar una gestión es un cambio de estado del caso, no una edición: la
    // bitácora lo distingue para poder reconstruir la secuencia que pide CA-04.
    accion: "cambiar_estado",
    entidad: "atencion_social",
    entidadId: avanzada.id,
    valorAnterior: atencion,
    valorNuevo: { ...avanzada, gestionRegistrada: numero },
  });
  emitEvent(roomUnidad(atencion.actividad.unidadTerritorialId), "atencion_social:actualizada", {
    ...proyectar(avanzada),
    unidadTerritorialId: atencion.actividad.unidadTerritorialId,
  });
  res.status(201).json({ ...proyectar(avanzada), gestionRegistrada: numero });
});
