// Fechas — ver docs/decisiones-tecnicas.md ADR-002.
//
// - Días calendario (actividad, compromiso, período) → DATE, sin hora.
// - Instantes (creación, validación, auditoría) → TIMESTAMPTZ en UTC.
// - "Hoy" SIEMPRE se calcula aquí, en el servidor, con zona de Chile: si se
//   tomara del navegador, dos usuarios verían semáforos distintos.

export const ZONA = "America/Santiago";

/**
 * Fecha de hoy en Chile como Date a medianoche UTC.
 * Se usa medianoche UTC para que la aritmética de días sea exacta y no se
 * corra un día por el cambio de horario chileno (UTC−4 / UTC−3).
 */
export function hoyEnChile(): Date {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  return new Date(`${partes}T00:00:00.000Z`);
}

/** "2026-07-01" → Date a medianoche UTC. */
export function desdeIso(iso: string): Date {
  return new Date(`${iso.slice(0, 10)}T00:00:00.000Z`);
}

/** Date → "2026-07-01" (ISO 8601, el formato de la API). */
export function aIso(fecha: Date): string {
  return fecha.toISOString().slice(0, 10);
}

/** Días calendario entre dos fechas (b − a). Exacto: opera sobre días UTC. */
export function diasEntre(a: Date, b: Date): number {
  const MS_DIA = 86_400_000;
  return Math.round((b.getTime() - a.getTime()) / MS_DIA);
}

/**
 * Días totales de un período, ambos extremos incluidos.
 * 1/07/2026 a 30/09/2026 → 92. (La planilla del cliente indica 91 para ese
 * mismo rango; la diferencia se consultó al docente. El sistema NO fija el
 * número: lo calcula desde las fechas configuradas, según §13.1 del PDF.)
 */
export function diasDelPeriodo(inicio: Date, termino: Date): number {
  return diasEntre(inicio, termino) + 1;
}

/**
 * Días transcurridos del período hasta hoy, acotado a [0, total].
 * Antes del inicio → 0; después del término → todos los días.
 */
export function diasTranscurridos(inicio: Date, termino: Date, hoy = hoyEnChile()): number {
  const total = diasDelPeriodo(inicio, termino);
  const transcurridos = diasEntre(inicio, hoy) + 1;
  return Math.max(0, Math.min(transcurridos, total));
}

/** Formato chileno para mostrar: "01-07-2026". Solo presentación. */
export function formatearFechaCl(fecha: Date): string {
  return new Intl.DateTimeFormat("es-CL", {
    timeZone: ZONA,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(fecha);
}
