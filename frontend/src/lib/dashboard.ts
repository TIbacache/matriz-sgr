// Capa de datos del dashboard: tipos espejo del consolidado por delegación y
// las agregaciones que alimentan cada forma (los gráficos no calculan, pintan).
//
// ⚠ Bloque C: antes esto leía `GET /kpis/cumplimiento`, la vista materializada
// v1 —por delegación, con el tope y los umbrales escritos en SQL—. Hoy lee
// `GET /cumplimiento/:periodoId/consolidado`, que consolida el motor por
// funcionario. Dos consecuencias que se notan al leer este archivo:
//   · el filtro es el `periodoId`, no el string "2026-Q3";
//   · aquí ya NO se calcula la proyección ni se recorta al 150%. Ese tope es un
//     valor de negocio (parámetro `tope_cumplimiento_item`, ADR-007) y estaba
//     escrito a mano en esta capa.
import { api } from "./api";
import type { ParametroVigente, Periodo, Semaforo } from "./types";

/** Un área del cargo dentro de una delegación: una celda del mapa de calor. */
export interface AreaConsolidada {
  area: string;
  funcionarios: number;
  cumplimiento: number;
  objetivoAlDia: number;
  /** Lo que colorea: el cumplimiento del área contra su objetivo del día */
  avanceRelativo: number;
  semaforo: Semaforo;
}

/** Una delegación tal como la devuelve el consolidado. */
export interface DelegacionConsolidada {
  unidadTerritorialId: string;
  nombre: string;
  activa: boolean;
  funcionarios: number;
  cumplimiento: number;
  objetivoAlDia: number;
  avanceRelativo: number;
  semaforo: Semaforo;
  proyeccion: number;
  diasComputables: number;
  diasTranscurridosComputables: number;
  porArea: AreaConsolidada[];
}

export interface ConsolidadoRespuesta {
  periodo: {
    id: string;
    nombre: string;
    estado: "abierto" | "cerrado";
    fechaInicio: string;
    fechaTermino: string;
    diasTotales: number;
    diasTranscurridos: number;
  };
  parametros: Record<string, ParametroVigente>;
  delegaciones: DelegacionConsolidada[];
  /** Delegaciones activas sin una sola persona con meta configurada */
  sinMedicion: { unidadTerritorialId: string; nombre: string }[];
  areas: string[];
  totales: {
    funcionarios: number;
    funcionariosSinDelegacion: number;
    delegacionesConMedicion: number;
    promedioCumplimiento: number;
    porSemaforo: Record<Semaforo, number>;
  };
}

export interface TuboStat {
  unidadTerritorialId: string;
  unidadNombre: string;
  estados: Record<string, number>;
  vencidas: number;
}

/** Lo que consumen los gráficos: el consolidado más los conteos del tubo. */
export interface ResumenDelegacion {
  unidadId: string;
  nombre: string;
  activa: boolean;
  funcionarios: number;
  cumplimiento: number;
  objetivoAlDia: number;
  avanceRelativo: number;
  semaforo: Semaforo;
  /** % al cierre a ritmo actual — lo calcula el backend, con el tope del parámetro */
  proyeccion: number;
  diasTranscurridos: number;
  diasEfectivos: number;
  porArea: AreaConsolidada[];
  vencidas: number;
  tuboEstados: Record<string, number>;
}

export async function cargarPeriodos(): Promise<Periodo[]> {
  return api.get<Periodo[]>("/periodos");
}

export async function cargarConsolidado(periodoId: string) {
  const [consolidado, tubo] = await Promise.all([
    api.get<ConsolidadoRespuesta>(`/cumplimiento/${periodoId}/consolidado`),
    api.get<TuboStat[]>("/kpis/tubo"),
  ]);
  return { consolidado, tubo };
}

export function resumirPorDelegacion(
  consolidado: ConsolidadoRespuesta,
  tubo: TuboStat[]
): ResumenDelegacion[] {
  const tuboPorUnidad = new Map(tubo.map((t) => [t.unidadTerritorialId, t]));
  return consolidado.delegaciones.map((d) => ({
    unidadId: d.unidadTerritorialId,
    nombre: d.nombre,
    activa: d.activa,
    funcionarios: d.funcionarios,
    cumplimiento: d.cumplimiento,
    objetivoAlDia: d.objetivoAlDia,
    avanceRelativo: d.avanceRelativo,
    semaforo: d.semaforo,
    proyeccion: d.proyeccion,
    diasTranscurridos: d.diasTranscurridosComputables,
    diasEfectivos: d.diasComputables,
    porArea: d.porArea,
    vencidas: tuboPorUnidad.get(d.unidadTerritorialId)?.vencidas ?? 0,
    tuboEstados: tuboPorUnidad.get(d.unidadTerritorialId)?.estados ?? {},
  }));
}

/** Áreas efectivamente presentes en las delegaciones a la vista. */
export function areasPresentes(resumen: ResumenDelegacion[]): string[] {
  const vistas = new Set<string>();
  for (const r of resumen) for (const a of r.porArea) vistas.add(a.area);
  return [...vistas];
}

export function promedio(valores: number[]): number {
  if (valores.length === 0) return 0;
  return Math.round((valores.reduce((s, v) => s + v, 0) / valores.length) * 10) / 10;
}
