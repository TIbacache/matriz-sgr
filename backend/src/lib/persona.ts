// Nombres de personas — ver docs/decisiones-tecnicas.md ADR-003.
//
// Se guardan SEPARADOS (nombres, apellido paterno, apellido materno) porque
// separar después es imposible de forma confiable ("de la Fuente Ramírez").
// La regla de concatenación se escribe UNA SOLA VEZ, aquí, y se aplica en la
// capa de serialización: ningún componente ni consulta la vuelve a escribir.

export interface PartesNombre {
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno?: string | null;
}

/** "María José" + "Jimenez" + "Rojas" → "María José Jimenez Rojas" */
export function nombreCompleto(p: PartesNombre): string {
  return [p.nombres, p.apellidoPaterno, p.apellidoMaterno].filter(Boolean).join(" ").trim();
}

/** Para listados formales e informes: "Jimenez Rojas, María José" */
export function nombreFormal(p: PartesNombre): string {
  const apellidos = [p.apellidoPaterno, p.apellidoMaterno].filter(Boolean).join(" ");
  return `${apellidos}, ${p.nombres}`.trim();
}

/** Iniciales para avatares: "MJ" */
export function iniciales(p: PartesNombre): string {
  const primerNombre = p.nombres.trim().split(/\s+/)[0] ?? "";
  return `${primerNombre[0] ?? ""}${p.apellidoPaterno[0] ?? ""}`.toUpperCase();
}
