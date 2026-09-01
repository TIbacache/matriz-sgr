// Teléfono chileno — RF-010 (validación de formatos) · ADR-001 (mismo criterio
// que el RUT: un solo formato canónico en base, formateo solo al mostrar).
//
// Canónico en base: 9 dígitos sin código de país  →  "912345678", "512345678"
// Mostrado en UI:   "+56 9 1234 5678" / "+56 51 234 5678"
//
// Se acepta cualquier variante de entrada (+56, 56, espacios, guiones,
// paréntesis) porque así viene de la planilla y de lo que teclea la gente.

/** Deja solo dígitos y quita el prefijo país 56 si viene. */
function limpiar(valor: string): string {
  let d = valor.replace(/\D/g, "");
  if (d.startsWith("56") && d.length > 9) d = d.slice(2);
  return d;
}

/**
 * Normaliza al formato canónico de 9 dígitos.
 * Móvil: empieza en 9. Fijo: código de área + número (La Serena = 51).
 * Devuelve null si no es un teléfono chileno reconocible.
 */
export function normalizarTelefono(valor: string | null | undefined): string | null {
  if (!valor) return null;
  const d = limpiar(String(valor));
  if (/^9\d{8}$/.test(d)) return d; // móvil
  if (/^[2-8]\d{8}$/.test(d)) return d; // fijo con código de área (9 dígitos)
  // Fijo de 8 dígitos escrito sin código de área: no se puede completar sin
  // inventar la región, así que se rechaza en vez de adivinar.
  return null;
}

export function esTelefonoValido(valor: string | null | undefined): boolean {
  return normalizarTelefono(valor) !== null;
}

/** Formatea para mostrar: "912345678" → "+56 9 1234 5678". Solo presentación. */
export function formatearTelefono(canonico: string | null | undefined): string {
  if (!canonico) return "";
  const d = limpiar(canonico);
  if (d.length !== 9) return canonico;
  return d.startsWith("9")
    ? `+56 9 ${d.slice(1, 5)} ${d.slice(5)}`
    : `+56 ${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5)}`;
}
