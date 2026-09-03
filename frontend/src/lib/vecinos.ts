// Ficha del vecino — espejo del contrato de `/vecinos` (ADR-008, ADR-012).
//
// Lo que esta pantalla comunica no es una lista: es un control. Por eso los
// helpers de aquí giran alrededor de dos ideas —"en cuántas delegaciones" y
// "qué no puedo ver y por qué"— y no alrededor del formato de una fila.

export interface PersonaEncontrada {
  id: string;
  rut: string | null;
  rutFormateado: string;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string | null;
  nombreCompleto: string;
  atenciones: number;
  delegaciones: number;
}

export interface BusquedaVecinos {
  q: string;
  criterio: "rut" | "nombre" | null;
  total: number;
  minimo: number;
  personas: PersonaEncontrada[];
}

export interface HechoHistorial {
  tipo: "actividad" | "compromiso";
  id: string;
  fecha: string | null;
  delegacion: { id: string; nombre: string };
  clasificacion: { clave: string; nombre: string } | null;
  estado: string;
  detallado: boolean;
  codigo: string | null;
  titulo: string | null;
  descripcion: string | null;
  accion: string | null;
  funcionario: { id: string; nombre: string } | null;
  contactoNombre: string | null;
  contactoFono: string | null;
}

export interface AvisoDuplicidad {
  nivel: "ambar";
  mensaje: string;
  ventanaDias: number;
  ventanaConfirmada: boolean;
  coincidencias: {
    clasificacion: string;
    delegaciones: string[];
    fechas: string[];
    diasEntre: number;
    hechos: string[];
  }[];
}

export interface FichaVecino {
  persona: {
    id: string;
    rut: string | null;
    rutFormateado: string;
    nombres: string;
    apellidoPaterno: string;
    apellidoMaterno: string | null;
    nombreCompleto: string;
    telefono: string | null;
    telefonoFormateado: string;
    direccion: string | null;
    sector: string | null;
    version: number;
  };
  alcance: {
    completo: boolean;
    delegacionesDetalladas: string[] | null;
    hechosReducidos: number;
  };
  resumen: {
    atenciones: number;
    delegaciones: number;
    nombresDelegaciones: string[];
    primera: string | null;
    ultima: string | null;
  };
  aviso: AvisoDuplicidad | null;
  historial: HechoHistorial[];
}

/** Espejo de ROLES_FICHA_VECINO del backend. El servidor sigue siendo la autoridad. */
export const ROLES_FICHA_VECINO = ["admin", "supervisor", "gerente", "usuario"];

/**
 * Estados que puede traer un hecho, en palabras. El estado de una atención es
 * el de su validación (RN-009: solo lo aprobado suma), no el del registro.
 */
const ESTADOS: Record<string, { texto: string; tono: "ok" | "espera" | "alerta" | "neutro" }> = {
  aprobada: { texto: "Validada", tono: "ok" },
  pendiente: { texto: "Por validar", tono: "espera" },
  rechazada: { texto: "Rechazada", tono: "alerta" },
  correccion_solicitada: { texto: "Con corrección pedida", tono: "espera" },
  sin_evidencia: { texto: "Sin evidencia", tono: "neutro" },
  ingresado: { texto: "Ingresado", tono: "neutro" },
  en_proceso: { texto: "En proceso", tono: "espera" },
  realizado: { texto: "Realizado", tono: "ok" },
};

export function estadoLegible(estado: string): { texto: string; tono: "ok" | "espera" | "alerta" | "neutro" } {
  return ESTADOS[estado] ?? { texto: estado.replace(/_/g, " "), tono: "neutro" };
}

/** "2026-07-13" → "13 jul 2026". Fecha corta y sin ambigüedad de orden. */
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
export function fechaCorta(iso: string | null): string {
  if (!iso) return "sin fecha";
  const [a, m, d] = iso.split("-");
  if (!a || !m || !d) return iso;
  return `${Number(d)} ${MESES[Number(m) - 1] ?? m} ${a}`;
}

/**
 * Los hechos concretos que el aviso señala, por su clave `tipo-id`.
 *
 * Se marcan ESOS y no todos los de la delegación: si el aviso pinta media
 * línea de tiempo, deja de señalar algo y pasa a ser decorado. La clave la
 * arma el backend con el mismo formato que usa la lista como `key`.
 */
export function hechosEnAviso(aviso: AvisoDuplicidad | null): Set<string> {
  const claves = new Set<string>();
  for (const c of aviso?.coincidencias ?? []) for (const h of c.hechos) claves.add(h);
  return claves;
}

/** Agrupa el historial por delegación, para el resumen de la cabecera. */
export function porDelegacion(historial: HechoHistorial[]): { nombre: string; total: number }[] {
  const cuenta = new Map<string, number>();
  for (const h of historial) cuenta.set(h.delegacion.nombre, (cuenta.get(h.delegacion.nombre) ?? 0) + 1);
  return [...cuenta.entries()]
    .map(([nombre, total]) => ({ nombre, total }))
    .sort((a, b) => b.total - a.total || a.nombre.localeCompare(b.nombre));
}
