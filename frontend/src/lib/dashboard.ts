// Capa de datos del dashboard: tipos espejo de /kpis y las agregaciones que
// alimentan cada forma (los gráficos no calculan, solo pintan).
import { api } from "./api";

export interface FilaKpi {
  organization_id: string;
  unidad_territorial_id: string;
  unidad_nombre: string;
  categoria_id: string;
  categoria_nombre: string;
  trimestre: string;
  cumplimiento_categoria: number; // % del ítem, tope 150
  ponderador: number;
  cumplimiento_total: number; // % ponderado de la delegación
  objetivo_al_dia: number; // % exigible hoy
  dias_efectivos: number;
  dias_transcurridos: number;
  avance_relativo: number; // cumplimiento vs objetivo → colorea
  semaforo_color: "verde" | "naranjo" | "rojo";
}

export interface TuboStat {
  unidadTerritorialId: string;
  unidadNombre: string;
  estados: Record<string, number>;
  vencidas: number;
}

export interface ResumenDelegacion {
  unidadId: string;
  nombre: string;
  cumplimiento: number;
  objetivoAlDia: number;
  avanceRelativo: number;
  semaforo: "verde" | "naranjo" | "rojo";
  proyeccion: number; // % al cierre, a ritmo actual
  diasTranscurridos: number;
  diasEfectivos: number;
  porPilar: { categoria: string; cumplimiento: number; ponderador: number }[];
  vencidas: number;
  tuboEstados: Record<string, number>;
}

export async function cargarKpis(trimestre?: string) {
  const q = trimestre ? `?trimestre=${encodeURIComponent(trimestre)}` : "";
  const [filas, tubo] = await Promise.all([
    api.get<FilaKpi[]>(`/kpis/cumplimiento${q}`),
    api.get<TuboStat[]>("/kpis/tubo"),
  ]);
  return { filas, tubo };
}

export function trimestresDisponibles(filas: FilaKpi[]): string[] {
  return [...new Set(filas.map((f) => f.trimestre))].sort().reverse();
}

// Proyección a ritmo actual: si hoy llevas X% en D días, al cierre llegarías a
// X × (díasEfectivos/D). Con el tope de sobrecumplimiento del cliente (150%).
export function proyectar(cumplimiento: number, diasTranscurridos: number, diasEfectivos: number): number {
  if (diasTranscurridos <= 0) return cumplimiento;
  return Math.min(Math.round((cumplimiento / diasTranscurridos) * diasEfectivos * 10) / 10, 150);
}

export function resumirPorDelegacion(filas: FilaKpi[], tubo: TuboStat[]): ResumenDelegacion[] {
  const porUnidad = new Map<string, FilaKpi[]>();
  for (const f of filas) {
    if (!porUnidad.has(f.unidad_territorial_id)) porUnidad.set(f.unidad_territorial_id, []);
    porUnidad.get(f.unidad_territorial_id)!.push(f);
  }
  const tuboPorUnidad = new Map(tubo.map((t) => [t.unidadTerritorialId, t]));

  return [...porUnidad.entries()]
    .map(([unidadId, fs]) => {
      const f0 = fs[0]!;
      return {
        unidadId,
        nombre: f0.unidad_nombre,
        cumplimiento: f0.cumplimiento_total,
        objetivoAlDia: f0.objetivo_al_dia,
        avanceRelativo: f0.avance_relativo,
        semaforo: f0.semaforo_color,
        proyeccion: proyectar(f0.cumplimiento_total, f0.dias_transcurridos, f0.dias_efectivos),
        diasTranscurridos: f0.dias_transcurridos,
        diasEfectivos: f0.dias_efectivos,
        porPilar: fs.map((f) => ({
          categoria: f.categoria_nombre,
          cumplimiento: f.cumplimiento_categoria,
          ponderador: f.ponderador,
        })),
        vencidas: tuboPorUnidad.get(unidadId)?.vencidas ?? 0,
        tuboEstados: tuboPorUnidad.get(unidadId)?.estados ?? {},
      };
    })
    .sort((a, b) => b.avanceRelativo - a.avanceRelativo);
}

export function pilaresUnicos(filas: FilaKpi[]): string[] {
  return [...new Set(filas.map((f) => f.categoria_nombre))];
}
