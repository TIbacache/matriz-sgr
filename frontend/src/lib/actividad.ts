// Control de actividad de usuarios — RF-030 · HU-19 · ADR-015.
//
// Espejo del contrato de `GET /actividad-usuarios`. La pantalla no calcula
// nada: el estado de cada persona sale del backend, que lo decide con el
// umbral configurable `dias_sin_ingreso_alerta` (ADR-007).
import { api } from "./api";

/** Los dos roles que ven el panel. El resto recibe 403 con el motivo escrito. */
export const ROLES_PANEL_ACTIVIDAD = ["admin", "supervisor"];

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
  registradas: number;
  validadas: number;
  pendientes: number;
  ultimaActividad: string | null;
  diasSinRegistrar: number | null;
  promedioDiario: number;
  estado: EstadoActividad;
  conectado: boolean;
}

export interface PanelActividad {
  periodo: {
    id: string;
    nombre: string;
    estado: "abierto" | "cerrado";
    diasTotales: number;
    diasTranscurridos: number;
  };
  umbralDias: number;
  umbralConfirmado: boolean;
  funcionarios: FilaActividad[];
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
  conectados: { userId: string; nombre: string; rol: string }[];
}

export async function cargarPanelActividad(periodoId: string, unidadId?: string | null) {
  const q = unidadId ? `&unidad=${encodeURIComponent(unidadId)}` : "";
  return api.get<PanelActividad>(`/actividad-usuarios?periodo=${periodoId}${q}`);
}

/**
 * Cómo se nombra cada estado. El texto importa: "sin registro" no es una
 * acusación, es el dato que permite ir a preguntar qué pasó.
 */
export const PRESENTACION_ESTADO: Record<
  EstadoActividad,
  { texto: string; semaforo: "verde" | "naranjo" | "rojo"; ayuda: string }
> = {
  al_dia: {
    texto: "Registrando",
    semaforo: "verde",
    ayuda: "Registró trabajo dentro del plazo de alerta configurado.",
  },
  atrasado: {
    texto: "Sin registrar hace días",
    semaforo: "naranjo",
    ayuda:
      "Registró antes, pero lleva más días sin hacerlo que el umbral configurado. " +
      "Puede ser vacaciones, licencia o carga de trabajo: el panel avisa, no concluye.",
  },
  sin_registro: {
    texto: "Sin registro en el período",
    semaforo: "rojo",
    ayuda:
      "No tiene ninguna actividad registrada en este período, aunque sí tiene metas " +
      "configuradas. Es el dato que el panel existe para hacer visible.",
  },
};

/** "hace 12 días" / "hoy" / "—". Solo presentación. */
export function haceCuanto(dias: number | null): string {
  if (dias === null) return "—";
  if (dias === 0) return "hoy";
  if (dias === 1) return "ayer";
  return `hace ${dias} días`;
}

export function fechaCorta(iso: string | null): string {
  if (!iso) return "—";
  const [a, m, d] = iso.split("-");
  return `${d}-${m}-${a}`;
}
