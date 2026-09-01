// Manejo del RUT chileno — ver docs/decisiones-tecnicas.md ADR-001.
//
// Formato canónico en base de datos: sin puntos, con guion, DV en mayúscula.
//   BD:      17721947-9   ·  9438201-K
//   Pantalla: 17.721.947-9 ·  9.438.201-K
//
// Se normaliza SIEMPRE al guardar y se formatea SOLO al mostrar: así la
// comparación y el índice funcionan directo, sin REPLACE() en cada consulta.

/** Quita puntos, espacios y guiones, y deja el DV en mayúscula. */
function limpiar(valor: string): string {
  return valor.replace(/[.\s-]/g, "").toUpperCase();
}

/**
 * Dígito verificador por módulo 11.
 * Se recorre el cuerpo de derecha a izquierda multiplicando por la serie
 * 2,3,4,5,6,7 cíclica; 11 - (suma % 11) da el DV, con 11→0 y 10→K.
 */
export function calcularDv(cuerpo: string): string {
  let suma = 0;
  let multiplicador = 2;
  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += Number(cuerpo[i]) * multiplicador;
    multiplicador = multiplicador === 7 ? 2 : multiplicador + 1;
  }
  const resto = 11 - (suma % 11);
  if (resto === 11) return "0";
  if (resto === 10) return "K";
  return String(resto);
}

/**
 * Normaliza cualquier variante de entrada al formato canónico.
 * Acepta "17.721.947-9", "17721947-9", "177219479", "17,721,947-9".
 * Devuelve null si no es un RUT válido (formato o dígito verificador).
 */
export function normalizarRut(valor: string | null | undefined): string | null {
  if (!valor) return null;
  const limpio = limpiar(String(valor).replace(/,/g, "")); // las comas vienen de Google Sheets
  if (!/^\d{7,8}[0-9K]$/.test(limpio)) return null;

  const cuerpo = limpio.slice(0, -1);
  const dv = limpio.slice(-1);
  if (calcularDv(cuerpo) !== dv) return null;

  return `${cuerpo}-${dv}`;
}

/** true si el RUT es válido (formato + módulo 11). */
export function esRutValido(valor: string | null | undefined): boolean {
  return normalizarRut(valor) !== null;
}

/** Formatea para mostrar: "17721947-9" → "17.721.947-9". Solo presentación. */
export function formatearRut(rutCanonico: string | null | undefined): string {
  if (!rutCanonico) return "";
  const limpio = limpiar(rutCanonico);
  if (limpio.length < 2) return rutCanonico;
  const cuerpo = limpio.slice(0, -1);
  const dv = limpio.slice(-1);
  const conPuntos = cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${conPuntos}-${dv}`;
}

/** Cuerpo numérico sin DV, para ordenar y buscar por rango sin castear. */
export function rutNumero(rutCanonico: string): number {
  return Number(limpiar(rutCanonico).slice(0, -1));
}
