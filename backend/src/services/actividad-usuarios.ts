import { prisma } from "../lib/prisma.js";
import { diasDelPeriodo, diasEntre, diasTranscurridos, hoyEnChile } from "../lib/fechas.js";
import { CLAVES, obtenerParametro } from "./parametros.js";
import { conectadosEnOrganizacion } from "./presencia.js";

// Control de actividad de usuarios — RF-030 · HU-19 · ADR-015.
//
// El docente pidió tres cosas en clase (requerimientos-oficiales §9.ter):
// quiénes han ingresado, **quiénes no** y quiénes están trabajando ahora.
//
// Dos decisiones que cambian lo que este archivo cuenta, y que están en
// ADR-015 porque no son obvias:
//
// 1. "Ingresar" se interpreta como REGISTRAR TRABAJO, no como iniciar sesión.
//    Es el sentido que usa la planilla del cliente. La conexión en vivo viaja
//    como dato aparte y explícitamente secundario.
//
// 2. Se cuentan las actividades REGISTRADAS, no solo las validadas. El motor de
//    cumplimiento cuenta solo lo aprobado (RN-003, RN-009) porque mide
//    desempeño; aquí la pregunta es otra —si la persona está registrando— y
//    quien subió 40 actividades que esperan al verificador SÍ ingresó. Usar la
//    cifra del motor mostraría un 0 y haría sonar una alarma falsa.

export type EstadoActividad = "al_dia" | "atrasado" | "sin_registro";

export interface FilaActividad {
  funcionarioId: string;
  nombre: string;
  email: string;
  rol: string;
  cargo: string | null;
  area: string | null;
  unidadTerritorialId: string | null;
  unidadNombre: string | null;
  /** Actividades registradas y no anuladas en el período */
  registradas: number;
  /** De esas, cuántas ya tienen evidencia aprobada (las que suman al avance) */
  validadas: number;
  /** Registradas que aún no suman: esperan evidencia o validación */
  pendientes: number;
  /** Día de trabajo más reciente que registró; null si no registró nada */
  ultimaActividad: string | null;
  /** Días desde esa fecha hasta hoy; null si nunca registró */
  diasSinRegistrar: number | null;
  /** Registradas ÷ días transcurridos del período */
  promedioDiario: number;
  estado: EstadoActividad;
  /** Conectado a la plataforma en este momento */
  conectado: boolean;
}

export interface PanelActividad {
  /** Días sin registrar a partir de los cuales se considera atrasado */
  umbralDias: number;
  umbralConfirmado: boolean;
  funcionarios: FilaActividad[];
  /**
   * Personas de la organización SIN cargo medido. No registran actividades por
   * diseño (nivel central, verificador, consulta, jefaturas sin medición), así
   * que listarlas como "sin registro" sería una alarma falsa: un aviso que
   * marca de más deja de avisar.
   */
  sinMedicion: { funcionarioId: string; nombre: string; rol: string; unidadNombre: string | null }[];
  resumen: {
    medidos: number;
    conRegistro: number;
    sinRegistro: number;
    atrasados: number;
    alDia: number;
    conectadosAhora: number;
    totalRegistradas: number;
  };
}

/**
 * Estado de una persona según cuándo registró por última vez.
 * El umbral es el parámetro `dias_sin_ingreso_alerta` (ADR-007): ningún número
 * de días vive en este código.
 */
export function estadoPorDias(
  diasSinRegistrar: number | null,
  umbralDias: number
): EstadoActividad {
  if (diasSinRegistrar === null) return "sin_registro";
  return diasSinRegistrar >= umbralDias ? "atrasado" : "al_dia";
}

export async function panelActividad(
  organizationId: string,
  periodoId: string,
  unidadId?: string
): Promise<PanelActividad> {
  const periodo = await prisma.periodo.findFirstOrThrow({
    where: { id: periodoId, organizationId },
  });

  const [umbral, miembros, actividades, aprobadas] = await Promise.all([
    prisma.parametro.findFirst({
      where: {
        organizationId,
        clave: CLAVES.diasSinIngresoAlerta,
        OR: [{ periodoId }, { periodoId: null }],
      },
      orderBy: { periodoId: "desc" }, // el del período gana sobre el general
    }),
    prisma.organizationMember.findMany({
      where: { organizationId, ...(unidadId ? { unidadTerritorialId: unidadId } : {}) },
      include: {
        user: { select: { id: true, nombre: true, email: true } },
        unidad: { select: { id: true, nombre: true } },
        cargoRef: { select: { nombre: true, area: true } },
      },
    }),
    // Registradas y NO anuladas: una actividad anulada dejó de contar como
    // trabajo, pero su registro sigue en la bitácora (ADR-006).
    prisma.actividad.groupBy({
      by: ["funcionarioId"],
      where: { organizationId, periodoId, anulada: false },
      _count: { _all: true },
      _max: { fecha: true },
    }),
    prisma.actividad.groupBy({
      by: ["funcionarioId"],
      where: {
        organizationId,
        periodoId,
        anulada: false,
        evidencias: { some: { validaciones: { some: { decision: "aprobada" } } } },
      },
      _count: { _all: true },
    }),
  ]);

  // Si el parámetro no está sembrado no se inventa un número: se usa el total
  // del período, que equivale a "no avisar todavía" y es visible como tal.
  const diasTotales = diasDelPeriodo(periodo.fechaInicio, periodo.fechaTermino);
  const umbralDias = umbral ? umbral.valor.toNumber() : diasTotales;
  const transcurridos = diasTranscurridos(periodo.fechaInicio, periodo.fechaTermino);
  const hoy = hoyEnChile();

  const registroPorFuncionario = new Map(
    actividades.map((a) => [a.funcionarioId, { total: a._count._all, ultima: a._max.fecha }])
  );
  const aprobadasPorFuncionario = new Map(aprobadas.map((a) => [a.funcionarioId, a._count._all]));
  const conectados = new Set(conectadosEnOrganizacion(organizationId).map((u) => u.userId));

  const funcionarios: FilaActividad[] = [];
  const sinMedicion: PanelActividad["sinMedicion"] = [];

  for (const m of miembros) {
    // El universo del panel es quien TIENE CARGO MEDIDO: es la gente de la que
    // se espera un registro diario. El resto va aparte, contado y nombrado.
    if (!m.cargoId) {
      sinMedicion.push({
        funcionarioId: m.userId,
        nombre: m.user.nombre,
        rol: m.rol,
        unidadNombre: m.unidad?.nombre ?? null,
      });
      continue;
    }

    const registro = registroPorFuncionario.get(m.userId);
    const registradas = registro?.total ?? 0;
    const validadas = aprobadasPorFuncionario.get(m.userId) ?? 0;
    const ultima = registro?.ultima ?? null;
    const diasSinRegistrar = ultima ? Math.max(0, diasEntre(ultima, hoy)) : null;

    funcionarios.push({
      funcionarioId: m.userId,
      nombre: m.user.nombre,
      email: m.user.email,
      rol: m.rol,
      cargo: m.cargoRef?.nombre ?? m.cargo,
      area: m.cargoRef?.area ?? null,
      unidadTerritorialId: m.unidad?.id ?? null,
      unidadNombre: m.unidad?.nombre ?? null,
      registradas,
      validadas,
      pendientes: registradas - validadas,
      ultimaActividad: ultima ? ultima.toISOString().slice(0, 10) : null,
      diasSinRegistrar,
      promedioDiario:
        transcurridos > 0 ? Math.round((registradas / transcurridos) * 100) / 100 : 0,
      estado: estadoPorDias(diasSinRegistrar, umbralDias),
      conectado: conectados.has(m.userId),
    });
  }

  // Primero quien necesita atención: sin registro, luego atrasados, y dentro de
  // cada grupo el que lleva más tiempo sin registrar. Un panel que se ordena
  // alfabéticamente obliga a buscar el problema; este lo pone arriba.
  const peso: Record<EstadoActividad, number> = { sin_registro: 0, atrasado: 1, al_dia: 2 };
  funcionarios.sort(
    (a, b) =>
      peso[a.estado] - peso[b.estado] ||
      (b.diasSinRegistrar ?? 0) - (a.diasSinRegistrar ?? 0) ||
      a.nombre.localeCompare(b.nombre, "es")
  );

  return {
    umbralDias,
    umbralConfirmado: umbral?.confirmado ?? false,
    funcionarios,
    sinMedicion,
    resumen: {
      medidos: funcionarios.length,
      conRegistro: funcionarios.filter((f) => f.estado !== "sin_registro").length,
      sinRegistro: funcionarios.filter((f) => f.estado === "sin_registro").length,
      atrasados: funcionarios.filter((f) => f.estado === "atrasado").length,
      alDia: funcionarios.filter((f) => f.estado === "al_dia").length,
      conectadosAhora: funcionarios.filter((f) => f.conectado).length,
      totalRegistradas: funcionarios.reduce((s, f) => s + f.registradas, 0),
    },
  };
}

/** Se exporta para la verificación: el parámetro no se lee dos veces. */
export async function umbralAlerta(organizationId: string, periodoId: string): Promise<number> {
  return obtenerParametro(organizationId, CLAVES.diasSinIngresoAlerta, periodoId);
}
