import type { Actividad, ParametroVigente, Semaforo } from "./types";

// Lógica de presentación de la ficha personal (RF-008). Nada de reglas de
// negocio aquí: los números los calcula el backend (services/cumplimiento.ts),
// esto solo decide cómo se muestran.

/** Estado del ciclo evidencia → validación, tal como lo ve el funcionario. */
export type EstadoRegistro =
  | "sin_evidencia"
  | "pendiente"
  | "aprobada"
  | "rechazada"
  | "correccion_solicitada"
  | "anulada";

interface Presentacion {
  texto: string;
  /** null = estado neutro: no es semáforo, no debe pintarse de color de estado */
  semaforo: Semaforo | null;
  ayuda: string;
}

export const PRESENTACION_ESTADO: Record<EstadoRegistro, Presentacion> = {
  sin_evidencia: {
    texto: "Sin evidencia",
    semaforo: null,
    ayuda: "Todavía no aporta al avance: falta subir la foto o el documento que lo respalda.",
  },
  pendiente: {
    texto: "En revisión",
    semaforo: "naranjo",
    ayuda: "La evidencia está en la bandeja del verificador. Aún no suma al avance.",
  },
  aprobada: {
    texto: "Validada",
    semaforo: "verde",
    ayuda: "Validada por el verificador: suma al avance del ítem.",
  },
  rechazada: {
    texto: "Rechazada",
    semaforo: "rojo",
    ayuda: "El verificador rechazó la evidencia. No suma al avance.",
  },
  correccion_solicitada: {
    texto: "Corregir",
    semaforo: "rojo",
    ayuda: "El verificador pidió una corrección: sube una evidencia nueva.",
  },
  anulada: {
    texto: "Anulada",
    semaforo: null,
    ayuda: "Anulada con motivo. Se conserva en el historial pero no suma al avance.",
  },
};

/**
 * RN-009: solo una validación APROBADA otorga el punto. Por eso una
 * aprobación en cualquiera de las evidencias manda sobre el resto.
 */
export function estadoDeActividad(actividad: Actividad): EstadoRegistro {
  if (actividad.anulada) return "anulada";
  if (actividad.evidencias.length === 0) return "sin_evidencia";

  const decisiones = actividad.evidencias
    .flatMap((e) => e.validaciones)
    .filter((v) => v.decision !== "pendiente");
  if (decisiones.length === 0) return "pendiente";
  if (decisiones.some((v) => v.decision === "aprobada")) return "aprobada";

  const ultima = [...decisiones].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]!;
  return ultima.decision as EstadoRegistro;
}

/** La última observación del verificador, que es lo que el funcionario debe leer. */
export function ultimaObservacion(actividad: Actividad): string | null {
  const conObservacion = actividad.evidencias
    .flatMap((e) => e.validaciones)
    .filter((v) => v.observacion)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return conObservacion[0]?.observacion ?? null;
}

/**
 * "Hoy" según el SERVIDOR, derivado de los días transcurridos del período
 * (ADR-002: la fecha del navegador no manda; si mandara, dos personas en
 * husos distintos verían días distintos). Se usa como valor por defecto del
 * campo fecha del registro.
 */
export function hoyDelServidor(periodo: { fechaInicio: string; diasTranscurridos: number }): string {
  const d = new Date(`${periodo.fechaInicio}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + Math.max(0, periodo.diasTranscurridos - 1));
  return d.toISOString().slice(0, 10);
}

/** "2026-07-15" → "15-07-2026". Solo presentación (ADR-002). */
export function fechaCl(iso: string): string {
  const [a, m, d] = iso.slice(0, 10).split("-");
  return `${d}-${m}-${a}`;
}

/** Teléfono chileno: espejo de backend/src/lib/telefono.ts, solo para avisar antes de enviar. */
export function telefonoValido(valor: string): boolean {
  const d = valor.replace(/\D/g, "").replace(/^56(?=\d{9}$)/, "");
  return /^[2-9]\d{8}$/.test(d);
}

/** Bytes → "2,4 MB" para el aviso de tamaño máximo. */
export function mb(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;
}

/**
 * ADR-007 · DESIGN §8.2: los parámetros con `confirmado: false` no se
 * presentan como definitivos. Devuelve el aviso a mostrar, o null.
 */
export function avisoParametros(parametros: Record<string, ParametroVigente>): string | null {
  const relevantes = ["tope_cumplimiento_item", "ajuste_felicitacion", "ajuste_reclamo"];
  const sinConfirmar = relevantes.filter((k) => parametros[k] && !parametros[k]!.confirmado);
  if (sinConfirmar.length === 0) return null;
  return (
    "Estas cifras usan valores que todavía esperan definición oficial del docente " +
    `(${sinConfirmar.join(", ")}). Se corrigen sin recalcular a mano: viven en la tabla de parámetros.`
  );
}
