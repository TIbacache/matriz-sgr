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
