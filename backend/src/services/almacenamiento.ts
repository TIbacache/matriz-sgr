import { mkdir, readFile, writeFile, unlink } from "node:fs/promises";
import { dirname, join, resolve, sep } from "node:path";
import { prisma } from "../lib/prisma.js";
import { env } from "../config/env.js";

// Almacenamiento controlado de evidencias — RF-012 · RNF-017.
//
// Tres reglas que este módulo garantiza:
// 1. El nombre en disco lo DERIVA el servidor del código de la actividad, nunca
//    del nombre que envía el cliente (que se conserva solo como metadato para
//    mostrarlo). Un cliente no puede escribir fuera del directorio ni pisar
//    otro archivo.
// 2. Los formatos permitidos salen del catálogo `formato_evidencia` (RF-004) y
//    el tamaño máximo del parámetro `evidencia_tamano_max_mb` (ADR-007): ningún
//    valor de negocio queda escrito aquí.
// 3. Los archivos se guardan bajo el directorio del tenant, fuera del repo.
//
// ⚠ Limitación declarada: RNF-017 también pide antivirus. Queda fuera de
// alcance por la restricción de costo cero (regla 13 del proyecto); está
// registrado como limitación conocida, no oculto.

/** Extensión segura por tipo MIME. Lo que no esté aquí no se acepta. */
const EXTENSION_POR_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "application/pdf": "pdf",
};

export const CATALOGO_FORMATOS = "formato_evidencia";

/** Tipos MIME vigentes para la organización (RF-004: configurables sin código). */
export async function formatosPermitidos(organizationId: string): Promise<string[]> {
  const filas = await prisma.catalogoItem.findMany({
    where: { organizationId, catalogo: CATALOGO_FORMATOS, vigente: true },
    select: { valor: true },
    orderBy: { orden: "asc" },
  });
  return filas.map((f) => f.valor);
}

/**
 * Ruta RELATIVA donde vive el archivo, derivada del código inmutable de la
 * actividad (ADR-004) y del correlativo de la evidencia dentro de esa actividad.
 * `codigo` viene generado por services/codigos.ts y se sanea igual, por si
 * alguna vez llegara de otra fuente.
 */
export function rutaRelativa(
  organizationId: string,
  codigo: string,
  secuencia: number,
  mimeType: string
): string {
  const codigoSeguro = codigo.replace(/[^A-Za-z0-9-]/g, "");
  const orgSegura = organizationId.replace(/[^A-Za-z0-9-]/g, "");
  const ext = EXTENSION_POR_MIME[mimeType] ?? "bin";
  return `${orgSegura}/${codigoSeguro}-${String(secuencia).padStart(2, "0")}.${ext}`;
}

/** Ruta absoluta, verificando que no se escape del directorio de evidencias. */
function rutaAbsoluta(relativa: string): string {
  const base = resolve(env.evidenciasDir);
  const destino = resolve(join(base, relativa));
  if (destino !== base && !destino.startsWith(base + sep)) {
    throw new Error(`Ruta de evidencia fuera del almacén: ${relativa}`);
  }
  return destino;
}

export async function guardarArchivo(relativa: string, contenido: Buffer): Promise<void> {
  const destino = rutaAbsoluta(relativa);
  await mkdir(dirname(destino), { recursive: true });
  await writeFile(destino, contenido);
}

export async function leerArchivo(relativa: string): Promise<Buffer> {
  return readFile(rutaAbsoluta(relativa));
}

/** Solo para limpieza (scripts de verificación); la evidencia no se borra en producción. */
export async function eliminarArchivo(relativa: string): Promise<void> {
  await unlink(rutaAbsoluta(relativa)).catch(() => undefined);
}
