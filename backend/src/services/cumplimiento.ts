import { prisma } from "../lib/prisma.js";
import { diasDelPeriodo, diasTranscurridos, hoyEnChile } from "../lib/fechas.js";
import { CLAVES, obtenerParametros } from "./parametros.js";

// Motor de cálculo por FUNCIONARIO — RF-022 a RF-027, RN-003 a RN-009.
//
// Reemplaza al cálculo por delegación de la v1: la especificación mide a la
// persona (cargo → ítems → metas) y la delegación es la consolidación.
//
// Todos los umbrales y topes salen de `parametros`, nunca del código (ADR-007).

export type ColorSemaforo = "verde" | "naranjo" | "rojo";

export interface CumplimientoItem {
  itemId: string;
  itemNombre: string;
  tipo: "cantidad" | "porcentaje";
  direccion: "mayor_mejor" | "menor_mejor";
  meta: number;
  avance: number;
  /** RN-004: avance/meta ×100, con el tope configurable aplicado */
  cumplimiento: number;
  ponderador: number;
  /** RN-005: ponderador × cumplimiento */
  ponderado: number;
}

export interface CumplimientoFuncionario {
  funcionarioId: string;
  nombre: string;
  cargo: string | null;
  cargoId: string | null;
  /// Área del cargo ("SOCIAL", "T OO CC"…). Es el eje con el que la planilla
  /// real agrupa a las personas, y por eso el del tablero consolidado.
  area: string | null;
  unidadTerritorialId: string | null;
  items: CumplimientoItem[];
  /** Suma de los ponderados de los ítems */
  cumplimientoTotal: number;
  /** RF-025: felicitaciones y reclamos, fuera del 100% de los ítems */
  ajustes: number;
  /** cumplimientoTotal + ajustes */
  cumplimientoFinal: number;
  /** Días del período menos las ausencias de esta persona */
  diasComputables: number;
  diasTranscurridosComputables: number;
  /** RN-007: lo que debería llevar hoy */
  objetivoAlDia: number;
  /** RN-008: avance relativo al objetivo; es lo que colorea */
  avanceRelativo: number;
  semaforo: ColorSemaforo;
  /** RF-030 */
  ultimoIngreso: Date | null;
  diasSinIngreso: number | null;
  totalIngresos: number;
  promedioDiario: number;
}

/**
 * RN-004 y ADR-009: el porcentaje de cumplimiento de un ítem.
 * - mayor_mejor: avance/meta (lo normal)
 * - menor_mejor: meta/avance ("Pendientes en tubo menor a 10%": superar la
 *   meta es malo, así que la razón se invierte)
 */
export function calcularCumplimientoItem(
  meta: number,
  avance: number,
  direccion: "mayor_mejor" | "menor_mejor",
  tope: number
): number {
  if (meta <= 0) return 0;
  let razon: number;
  if (direccion === "mayor_mejor") {
    razon = avance / meta;
  } else {
    // Sin avance registrado no hay incumplimiento: se cumple al 100%
    razon = avance <= 0 ? 1 : meta / avance;
  }
  return Math.min(razon, tope) * 100;
}

/** RN-008: el color según el avance relativo al objetivo del día. */
export function calcularSemaforo(
  avanceRelativo: number,
  umbralVerde: number,
  umbralNaranjo: number
): ColorSemaforo {
  if (avanceRelativo >= umbralVerde * 100) return "verde";
  if (avanceRelativo >= umbralNaranjo * 100) return "naranjo";
  return "rojo";
}

/**
 * Calcula el cumplimiento de todos los funcionarios de un período.
 * RN-003: solo cuentan las actividades VÁLIDAS, es decir, no anuladas y con
 * al menos una evidencia cuya validación esté aprobada (RN-009, RF-014).
 */
export async function calcularPeriodo(
  organizationId: string,
  periodoId: string
): Promise<CumplimientoFuncionario[]> {
  const periodo = await prisma.periodo.findFirstOrThrow({
    where: { id: periodoId, organizationId },
  });
  const parametros = await obtenerParametros(organizationId, periodoId);
  const tope = parametros[CLAVES.topeCumplimientoItem]?.valor ?? 1.5;
  const umbralVerde = parametros[CLAVES.semaforoVerde]?.valor ?? 1.0;
  const umbralNaranjo = parametros[CLAVES.semaforoNaranjo]?.valor ?? 0.6;
  const valorFelicitacion = parametros[CLAVES.ajusteFelicitacion]?.valor ?? 0;
  const topeFelicitaciones = parametros[CLAVES.topeFelicitaciones]?.valor ?? 0;
  const valorReclamo = parametros[CLAVES.ajusteReclamo]?.valor ?? 0;

  const diasTotales = diasDelPeriodo(periodo.fechaInicio, periodo.fechaTermino);
  const transcurridos = diasTranscurridos(periodo.fechaInicio, periodo.fechaTermino, hoyEnChile());

  const [metas, actividadesValidas, ausencias, ajustes, miembros] = await Promise.all([
    prisma.metaItem.findMany({
      where: { organizationId, periodoId },
      include: { item: true, funcionario: true },
    }),
    // RN-003 + RN-009: no anuladas y con evidencia aprobada
    prisma.actividad.findMany({
      where: {
        organizationId,
        periodoId,
        anulada: false,
        evidencias: { some: { validaciones: { some: { decision: "aprobada" } } } },
      },
      select: { funcionarioId: true, itemId: true, fecha: true },
    }),
    prisma.ausencia.findMany({ where: { organizationId, periodoId } }),
    prisma.ajuste.findMany({ where: { organizationId, periodoId } }),
    prisma.organizationMember.findMany({
      where: { organizationId },
      include: { user: true, cargoRef: true },
    }),
  ]);

  // Avance por (funcionario, ítem)
  const avancePorClave = new Map<string, number>();
  const ingresosPorFuncionario = new Map<string, { total: number; ultima: Date | null }>();
  for (const a of actividadesValidas) {
    if (a.itemId) {
      const clave = `${a.funcionarioId}|${a.itemId}`;
      avancePorClave.set(clave, (avancePorClave.get(clave) ?? 0) + 1);
    }
    const acc = ingresosPorFuncionario.get(a.funcionarioId) ?? { total: 0, ultima: null };
    acc.total += 1;
    if (!acc.ultima || a.fecha > acc.ultima) acc.ultima = a.fecha;
    ingresosPorFuncionario.set(a.funcionarioId, acc);
  }

  // Días de ausencia por funcionario
  const ausentesPorFuncionario = new Map<string, number>();
  for (const au of ausencias) {
    ausentesPorFuncionario.set(
      au.funcionarioId,
      (ausentesPorFuncionario.get(au.funcionarioId) ?? 0) + au.dias
    );
  }

  // Metas agrupadas por funcionario
  const metasPorFuncionario = new Map<string, typeof metas>();
  for (const m of metas) {
    const lista = metasPorFuncionario.get(m.funcionarioId) ?? [];
    lista.push(m);
    metasPorFuncionario.set(m.funcionarioId, lista);
  }

  const hoy = hoyEnChile();
  const resultado: CumplimientoFuncionario[] = [];

  for (const [funcionarioId, susMetas] of metasPorFuncionario) {
    const miembro = miembros.find((m) => m.userId === funcionarioId);
    const items: CumplimientoItem[] = susMetas.map((m) => {
      const meta = m.metaValor.toNumber();
      const avance = avancePorClave.get(`${funcionarioId}|${m.itemId}`) ?? 0;
      const cumplimiento = calcularCumplimientoItem(meta, avance, m.item.direccion, tope);
      const ponderador = m.ponderador.toNumber();
      return {
        itemId: m.itemId,
        itemNombre: m.item.nombre,
        tipo: m.item.tipo,
        direccion: m.item.direccion,
        meta,
        avance,
        cumplimiento: Math.round(cumplimiento * 10) / 10,
        ponderador,
        ponderado: Math.round(cumplimiento * ponderador * 10) / 10,
      };
    });

    const cumplimientoTotal = Math.round(items.reduce((s, i) => s + i.ponderado, 0) * 10) / 10;

    // RF-025: ajustes fuera del 100%, con tope de felicitaciones computables
    const susAjustes = ajustes.filter((a) => a.funcionarioId === funcionarioId);
    const felicitaciones = Math.min(
      susAjustes.filter((a) => a.tipo === "felicitacion").length,
      topeFelicitaciones
    );
    const reclamos = susAjustes.filter((a) => a.tipo === "reclamo").length;
    const totalAjustes =
      Math.round((felicitaciones * valorFelicitacion + reclamos * valorReclamo) * 1000) / 10;

    // Objetivo al día con descuento de ausencias (confirmado con los datos
    // reales de la planilla: una funcionaria tiene 39,56% y el resto 50,55%)
    const diasAusente = ausentesPorFuncionario.get(funcionarioId) ?? 0;
    const transcurridosComputables = Math.max(0, transcurridos - diasAusente);
    const objetivoAlDia =
      diasTotales > 0 ? Math.round((transcurridosComputables / diasTotales) * 1000) / 10 : 0;

    const cumplimientoFinal = Math.round((cumplimientoTotal + totalAjustes) * 10) / 10;
    const avanceRelativo =
      objetivoAlDia > 0 ? Math.round((cumplimientoFinal / objetivoAlDia) * 1000) / 10 : 100;

    const ingresos = ingresosPorFuncionario.get(funcionarioId);
    const ultimoIngreso = ingresos?.ultima ?? null;

    resultado.push({
      funcionarioId,
      nombre: miembro?.user.nombre ?? "",
      cargo: miembro?.cargoRef?.nombre ?? miembro?.cargo ?? null,
      cargoId: miembro?.cargoId ?? null,
      area: miembro?.cargoRef?.area ?? null,
      unidadTerritorialId: miembro?.unidadTerritorialId ?? null,
      items,
      cumplimientoTotal,
      ajustes: totalAjustes,
      cumplimientoFinal,
      diasComputables: Math.max(0, diasTotales - diasAusente),
      diasTranscurridosComputables: transcurridosComputables,
      objetivoAlDia,
      avanceRelativo,
      semaforo: calcularSemaforo(avanceRelativo, umbralVerde, umbralNaranjo),
      ultimoIngreso,
      diasSinIngreso: ultimoIngreso
        ? Math.max(0, Math.round((hoy.getTime() - ultimoIngreso.getTime()) / 86_400_000))
        : null,
      totalIngresos: ingresos?.total ?? 0,
      promedioDiario:
        transcurridos > 0 ? Math.round(((ingresos?.total ?? 0) / transcurridos) * 100) / 100 : 0,
    });
  }

  return resultado.sort((a, b) => b.avanceRelativo - a.avanceRelativo);
}

// ===========================================================================
// CONSOLIDACIÓN POR DELEGACIÓN — RF-029 · ADR-014 (Bloque C)
//
// El tablero de gestión mira delegaciones, pero la especificación mide
// personas. Esta es la única forma en que el sistema pasa de una cosa a la
// otra, y reemplaza a la vista materializada v1 (`cumplimiento_ponderado_vista`),
// que calculaba por delegación con umbrales y tope escritos en SQL.
//
// Las tres decisiones que la sostienen están en ADR-014:
//   1. La delegación es el PROMEDIO SIMPLE del cumplimiento de sus
//      funcionarios. Cada plan personal ya suma 100% de sus ponderadores
//      (RN-001), así que las personas son comparables entre sí; ponderar por
//      cantidad de ítems premiaría a quien tiene más ítems, no a quien cumple.
//   2. El objetivo al día de la delegación también es el promedio de los de su
//      gente, porque cada persona descuenta SUS ausencias (RN-007).
//   3. Una delegación sin funcionarios con meta NO cumple 0%: no tiene
//      medición, y eso se informa aparte. Pintarla en rojo sería inventar un
//      dato y, además, taparía el aviso que interesa (nadie configurado).
// ===========================================================================

/** Etiqueta del eje cuando el cargo no declara área (o no hay cargo). */
export const SIN_AREA = "Sin área";

export interface CumplimientoArea {
  area: string;
  funcionarios: number;
  cumplimiento: number;
  objetivoAlDia: number;
  /** RN-008: el área también se juzga contra su objetivo, no contra un 100%
   *  crudo. Es lo que hace que el mapa de calor diga lo mismo que el semáforo. */
  avanceRelativo: number;
  semaforo: ColorSemaforo;
}

export interface CumplimientoUnidad {
  unidadTerritorialId: string;
  nombre: string;
  activa: boolean;
  funcionarios: number;
  /** Promedio del cumplimiento final de sus funcionarios */
  cumplimiento: number;
  objetivoAlDia: number;
  avanceRelativo: number;
  semaforo: ColorSemaforo;
  /** A ritmo actual, con el tope del parámetro (nunca un 150 escrito aquí) */
  proyeccion: number;
  diasComputables: number;
  diasTranscurridosComputables: number;
  porArea: CumplimientoArea[];
}

export interface ConsolidadoPeriodo {
  delegaciones: CumplimientoUnidad[];
  /** Delegaciones activas sin una sola persona con meta configurada */
  sinMedicion: { unidadTerritorialId: string; nombre: string }[];
  /** Ejes del mapa de calor, en orden estable */
  areas: string[];
  totales: {
    funcionarios: number;
    /** Con meta configurada pero sin delegación: no caben en ninguna columna */
    funcionariosSinDelegacion: number;
    delegacionesConMedicion: number;
    promedioCumplimiento: number;
    porSemaforo: Record<ColorSemaforo, number>;
  };
}

/** Promedio simple, redondeado a un decimal. 0 elementos → 0. */
function promedio(valores: number[]): number {
  if (valores.length === 0) return 0;
  return Math.round((valores.reduce((s, v) => s + v, 0) / valores.length) * 10) / 10;
}

/**
 * Proyección al cierre a ritmo actual: si en D días transcurridos se lleva X%,
 * al final del período se llegaría a X × (díasComputables / D).
 * El techo es el tope de cumplimiento configurado (ADR-007): el 150% no se
 * escribe aquí ni en el frontend, que es donde estaba antes.
 */
export function proyectarCumplimiento(
  cumplimiento: number,
  transcurridos: number,
  computables: number,
  tope: number
): number {
  if (transcurridos <= 0) return cumplimiento;
  const proyectado = (cumplimiento / transcurridos) * computables;
  return Math.round(Math.min(proyectado, tope * 100) * 10) / 10;
}

/**
 * Consolida el período por delegación y por área del cargo.
 * Es lo que consume el dashboard (`GET /cumplimiento/:periodoId/consolidado`).
 */
export async function consolidarPeriodo(
  organizationId: string,
  periodoId: string,
  funcionarios?: CumplimientoFuncionario[]
): Promise<ConsolidadoPeriodo> {
  const [gente, parametros, unidades] = await Promise.all([
    funcionarios ? Promise.resolve(funcionarios) : calcularPeriodo(organizationId, periodoId),
    obtenerParametros(organizationId, periodoId),
    prisma.unidadTerritorial.findMany({
      where: { organizationId },
      select: { id: true, nombre: true, activo: true },
      orderBy: { nombre: "asc" },
    }),
  ]);

  const tope = parametros[CLAVES.topeCumplimientoItem]?.valor ?? 1.5;
  const umbralVerde = parametros[CLAVES.semaforoVerde]?.valor ?? 1.0;
  const umbralNaranjo = parametros[CLAVES.semaforoNaranjo]?.valor ?? 0.6;

  const porUnidad = new Map<string, CumplimientoFuncionario[]>();
  let sinDelegacion = 0;
  for (const f of gente) {
    if (!f.unidadTerritorialId) {
      sinDelegacion += 1;
      continue;
    }
    const lista = porUnidad.get(f.unidadTerritorialId) ?? [];
    lista.push(f);
    porUnidad.set(f.unidadTerritorialId, lista);
  }

  // Orden estable de las áreas: alfabético, con "Sin área" siempre al final
  // para que no se cuele entre las áreas reales del municipio.
  const areas = [...new Set(gente.map((f) => f.area ?? SIN_AREA))].sort((a, b) => {
    if (a === SIN_AREA) return 1;
    if (b === SIN_AREA) return -1;
    return a.localeCompare(b, "es");
  });

  const delegaciones: CumplimientoUnidad[] = [];
  for (const u of unidades) {
    const suGente = porUnidad.get(u.id);
    if (!suGente || suGente.length === 0) continue;

    const cumplimiento = promedio(suGente.map((f) => f.cumplimientoFinal));
    const objetivoAlDia = promedio(suGente.map((f) => f.objetivoAlDia));
    const diasComputables = promedio(suGente.map((f) => f.diasComputables));
    const transcurridos = promedio(suGente.map((f) => f.diasTranscurridosComputables));
    // RN-008: antes de que el período empiece no hay nada exigible todavía.
    const avanceRelativo =
      objetivoAlDia > 0 ? Math.round((cumplimiento / objetivoAlDia) * 1000) / 10 : 100;

    const porArea: CumplimientoArea[] = [];
    for (const area of areas) {
      const delArea = suGente.filter((f) => (f.area ?? SIN_AREA) === area);
      if (delArea.length === 0) continue;
      const cumplArea = promedio(delArea.map((f) => f.cumplimientoFinal));
      const objetivoArea = promedio(delArea.map((f) => f.objetivoAlDia));
      const relativoArea =
        objetivoArea > 0 ? Math.round((cumplArea / objetivoArea) * 1000) / 10 : 100;
      porArea.push({
        area,
        funcionarios: delArea.length,
        cumplimiento: cumplArea,
        objetivoAlDia: objetivoArea,
        avanceRelativo: relativoArea,
        semaforo: calcularSemaforo(relativoArea, umbralVerde, umbralNaranjo),
      });
    }

    delegaciones.push({
      unidadTerritorialId: u.id,
      nombre: u.nombre,
      activa: u.activo,
      funcionarios: suGente.length,
      cumplimiento,
      objetivoAlDia,
      avanceRelativo,
      semaforo: calcularSemaforo(avanceRelativo, umbralVerde, umbralNaranjo),
      proyeccion: proyectarCumplimiento(cumplimiento, transcurridos, diasComputables, tope),
      diasComputables,
      diasTranscurridosComputables: transcurridos,
      porArea,
    });
  }

  delegaciones.sort((a, b) => b.avanceRelativo - a.avanceRelativo);

  return {
    delegaciones,
    // Solo las activas: una delegación dada de baja (RF-001) no es un hueco
    // de configuración que alguien deba ir a llenar.
    sinMedicion: unidades
      .filter((u) => u.activo && !porUnidad.has(u.id))
      .map((u) => ({ unidadTerritorialId: u.id, nombre: u.nombre })),
    areas,
    totales: {
      funcionarios: gente.length,
      funcionariosSinDelegacion: sinDelegacion,
      delegacionesConMedicion: delegaciones.length,
      promedioCumplimiento: promedio(gente.map((f) => f.cumplimientoFinal)),
      porSemaforo: {
        verde: gente.filter((f) => f.semaforo === "verde").length,
        naranjo: gente.filter((f) => f.semaforo === "naranjo").length,
        rojo: gente.filter((f) => f.semaforo === "rojo").length,
      },
    },
  };
}
