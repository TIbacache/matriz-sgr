import { prisma } from "../lib/prisma.js";
import { aIso } from "../lib/fechas.js";

// Código verificador — RF-011 · RN-010 · ADR-004.
//
// Formato: {PREFIJO_AREA}-{AAAAMMDD}-{CORRELATIVO:4}   →  SOC-20260713-0010
//
// La planilla usa PREFIJO+MES+DIA+CORRELATIVO (SOC71310), que es AMBIGUO:
// "COS7711" puede leerse mes 7/día 7/corr 11 o mes 7/día 71/corr 1. Con
// AAAAMMDD y correlativo de ancho fijo la lectura es única, y además el código
// ordena alfabéticamente igual que cronológicamente.
//
// El código es INMUTABLE: la migración instala un trigger que rechaza cambiarlo.

/** Prefijo de 3 letras a partir del área o el cargo. */
export function prefijoDeArea(area: string | null | undefined): string {
  if (!area) return "GEN";
  const DIACRITICOS = /[̀-ͯ]/g;
  const limpio = area
    .normalize("NFD")
    .replace(DIACRITICOS, "")
    .toUpperCase()
    .replace(/[^A-Z]/g, "");
  return (limpio.slice(0, 3) || "GEN").padEnd(3, "X");
}

/**
 * Genera el siguiente código para un área y fecha.
 * Usa una transacción con bloqueo consultivo para que dos usuarios que
 * registran a la vez no obtengan el mismo correlativo (RF-034, CA-08).
 */
export async function generarCodigo(
  organizationId: string,
  area: string | null | undefined,
  fecha: Date
): Promise<string> {
  const prefijo = prefijoDeArea(area);
  const dia = aIso(fecha).replace(/-/g, "");
  const raiz = `${prefijo}-${dia}-`;

  return prisma.$transaction(async (tx) => {
    // Bloqueo consultivo por (organización, prefijo, día): serializa solo a
    // quienes piden un código del mismo grupo, no a toda la tabla.
    const llave = `${organizationId}:${raiz}`;
    await tx.$executeRawUnsafe("SELECT pg_advisory_xact_lock(hashtext($1))", llave);

    const ultima = await tx.actividad.findFirst({
      where: { organizationId, codigo: { startsWith: raiz } },
      orderBy: { codigo: "desc" },
      select: { codigo: true },
    });

    const siguiente = ultima ? Number(ultima.codigo.slice(raiz.length)) + 1 : 1;
    return `${raiz}${String(siguiente).padStart(4, "0")}`;
  });
}
