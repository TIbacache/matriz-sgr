import { prisma } from "../lib/prisma.js";
import { aIso } from "../lib/fechas.js";

// Atención social y sus hasta 3 gestiones — RF-015 · RN-012 · CA-04 · HU-03.
//
// Es el caso que la especificación pide demostrar de punta a punta: un vecino
// llega, se le abre una atención, y esa atención AVANZA —hasta tres veces—
// hasta entregarle el beneficio. La entidad `AtencionSocial` se modeló desde
// las columnas reales de la pestaña SOCIAL de la planilla del cliente
// (estructura-planilla-real §4) y es 1:1 con `Actividad`: la atención no es un
// registro paralelo, es el detalle social de una actividad ya registrada, con
// su código, su evidencia y su validación.
//
// Dos cosas que este archivo hace cumplir y que NO son detalle:
//
// 1. **Las tres gestiones son un avance, no tres campos sueltos.** No se
//    registra la segunda sin la primera ni la tercera sin la segunda, y no hay
//    una cuarta. El servidor decide QUÉ gestión es la que llega; el cliente no
//    elige el casillero. Si lo eligiera, la secuencia que CA-04 pide demostrar
//    dejaría de estar garantizada.
// 2. **Ningún valor de negocio en el código.** Los tipos, las sub-atenciones y
//    las gestiones salen de `CatalogoItem` (RF-004, ADR-007), nunca de una
//    lista aquí. Cambiar un desplegable es tarea de administración.

/** Los tres casilleros de gestión, en orden. El índice 0 es la primera. */
export const CATALOGOS_GESTION = ["gestion_1", "gestion_2", "gestion_3"] as const;
export const AREA_SOCIAL = "SOCIAL";

/** Campos de fecha que cada gestión puede traer, según la planilla §4. */
const CAMPOS_POR_GESTION = [
  ["fechaProgramadaVisita", "observacion"],
  ["fechaVisita", "fechaEntregaInforme"],
  ["fechaEntregaBeneficio"],
] as const;

export type NumeroGestion = 1 | 2 | 3;

/**
 * Cuántas gestiones lleva registradas la atención. Se deduce de los propios
 * datos y no de un contador aparte: un contador podría mentir, las columnas no.
 */
export function gestionesRegistradas(a: {
  primeraGestion: string | null;
  segundaGestion: string | null;
  terceraGestion: string | null;
}): 0 | 1 | 2 | 3 {
  if (a.terceraGestion) return 3;
  if (a.segundaGestion) return 2;
  if (a.primeraGestion) return 1;
  return 0;
}

/** La gestión que toca registrar, o null si la atención ya está completa. */
export function siguienteGestion(a: {
  primeraGestion: string | null;
  segundaGestion: string | null;
  terceraGestion: string | null;
}): NumeroGestion | null {
  const n = gestionesRegistradas(a);
  return n >= 3 ? null : ((n + 1) as NumeroGestion);
}

/**
 * Vista de la atención tal como la consume una pantalla: además de sus
 * columnas, el avance ya calculado. Que la pantalla no tenga que deducir en
 * qué etapa va es lo que evita que dos pantallas lo deduzcan distinto.
 */
export interface FilaAtencion {
  id: string;
  actividadId: string;
  tipoAtencion: string;
  subAtencion: string | null;
  requiereVisita: boolean;
  observacion: string | null;
  primeraGestion: string | null;
  fechaProgramadaVisita: Date | null;
  segundaGestion: string | null;
  fechaVisita: Date | null;
  fechaEntregaInforme: Date | null;
  terceraGestion: string | null;
  fechaEntregaBeneficio: Date | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export function proyectar(a: FilaAtencion) {
  const registradas = gestionesRegistradas(a);
  const siguiente = siguienteGestion(a);
  return {
    id: a.id,
    actividadId: a.actividadId,
    tipoAtencion: a.tipoAtencion,
    subAtencion: a.subAtencion,
    requiereVisita: a.requiereVisita,
    observacion: a.observacion,
    gestiones: [
      {
        numero: 1 as const,
        valor: a.primeraGestion,
        fechaProgramadaVisita: a.fechaProgramadaVisita ? aIso(a.fechaProgramadaVisita) : null,
      },
      {
        numero: 2 as const,
        valor: a.segundaGestion,
        fechaVisita: a.fechaVisita ? aIso(a.fechaVisita) : null,
        fechaEntregaInforme: a.fechaEntregaInforme ? aIso(a.fechaEntregaInforme) : null,
      },
      {
        numero: 3 as const,
        valor: a.terceraGestion,
        fechaEntregaBeneficio: a.fechaEntregaBeneficio ? aIso(a.fechaEntregaBeneficio) : null,
      },
    ].filter((g) => g.valor !== null),
    gestionesRegistradas: registradas,
    siguienteGestion: siguiente,
    /** `abierta` mientras quepa otra gestión; `cerrada` con las tres hechas. */
    estado: siguiente === null ? ("cerrada" as const) : ("abierta" as const),
    version: a.version,
    createdAt: a.createdAt,
    updatedAt: a.updatedAt,
  };
}

/**
 * RF-004: un valor de catálogo se acepta solo si existe y está VIGENTE. Un
 * valor desactivado desaparece de los registros nuevos pero sigue legible en
 * los antiguos, que es exactamente lo que pide el requisito.
 */
export async function valorDeCatalogo(
  organizationId: string,
  catalogo: string,
  valor: string
): Promise<boolean> {
  const item = await prisma.catalogoItem.findFirst({
    where: { organizationId, catalogo, valor, vigente: true },
    select: { id: true },
  });
  return item !== null;
}

/** El nombre del catálogo de la gestión número N (1 → "gestion_1"). */
export function catalogoDeGestion(n: NumeroGestion): string {
  return CATALOGOS_GESTION[n - 1]!;
}

/** Los campos de fecha que acepta la gestión número N, según la planilla §4. */
export function camposDeGestion(n: NumeroGestion): readonly string[] {
  return CAMPOS_POR_GESTION[n - 1]!;
}
