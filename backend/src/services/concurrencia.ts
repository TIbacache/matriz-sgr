import type { Response } from "express";

// Bloqueo optimista — RF-034 · RNF-003 · CA-08 · ADR-005.
//
// Toda tabla editable lleva `version INT`. El UPDATE se hace con
// `WHERE id = ? AND version = ?` e incrementa la versión; si afecta 0 filas,
// alguien más ya modificó el registro → 409 con la versión y el registro
// vigentes, NUNCA sobrescritura silenciosa.
//
// El helper existe para que ningún controlador tenga que recordar la secuencia:
// se le pasa cómo actualizar (devolviendo el count) y cómo releer.

export type ResultadoVersion<T> =
  | { estado: "ok"; registro: T }
  | { estado: "no_encontrado" }
  | { estado: "conflicto"; registro: T };

export async function actualizarConVersion<T extends { version: number }>(args: {
  /** Ejecuta el updateMany con la versión esperada y devuelve el nº de filas afectadas. */
  actualizar: () => Promise<number>;
  /** Relee el registro (con sus includes) después del intento. */
  releer: () => Promise<T | null>;
}): Promise<ResultadoVersion<T>> {
  const afectadas = await args.actualizar();
  const registro = await args.releer();
  if (!registro) return { estado: "no_encontrado" };
  if (afectadas === 0) return { estado: "conflicto", registro };
  return { estado: "ok", registro };
}

/**
 * Responde 404 o 409 según el resultado. Devuelve el registro cuando todo fue
 * bien, o null si ya respondió (el controlador solo hace `if (!x) return;`).
 */
export function resolverVersion<T extends { version: number }>(
  res: Response,
  resultado: ResultadoVersion<T>,
  entidad: string
): T | null {
  if (resultado.estado === "no_encontrado") {
    res.status(404).json({ error: "No encontrado" });
    return null;
  }
  if (resultado.estado === "conflicto") {
    res.status(409).json({
      error: `Otra persona modificó ${entidad} mientras editabas. Revisa los datos vigentes antes de guardar.`,
      versionActual: resultado.registro.version,
      registro: resultado.registro,
    });
    return null;
  }
  return resultado.registro;
}
