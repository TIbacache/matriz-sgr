import type { ItemMedicion, MetaItem } from "./types";

// Reglas de la configuración de metas (RF-006, RF-007, RN-001, RN-002) que la
// pantalla necesita, en un solo lugar.
//
// DESIGN §8.2: "la persona piensa en porcentajes; la API recibe fracciones".
// Toda la conversión vive aquí — repartirla por los componentes es la forma
// segura de que un día 25 se guarde como 25 en vez de 0,25.

/** Tolerancia de RN-001 en porcentaje. Espejo del `0.0001` del backend. */
export const TOLERANCIA_PCT = 0.01;

/** Fracción de la API (0,25) → porcentaje de pantalla (25). */
export const aPorcentaje = (fraccion: number): number => Math.round(fraccion * 10_000) / 100;

/** Porcentaje de pantalla (25) → fracción de la API (0,25), a 4 decimales. */
export const aFraccion = (porcentaje: number): number => Math.round(porcentaje * 100) / 10_000;

/** Los Decimal de Prisma llegan como string en JSON. */
export const num = (v: string | number): number => (typeof v === "number" ? v : Number(v));

/** Una fila de la tabla de configuración: un ítem del cargo, con o sin meta. */
export interface FilaMeta {
  itemId: string;
  nombre: string;
  tipo: "cantidad" | "porcentaje";
  direccion: "mayor_mejor" | "menor_mejor";
  /** Texto crudo del input: se valida al guardar, no se corrige mientras escribe. */
  meta: string;
  ponderador: string;
  /** Versión de la meta vigente. Ausente = ítem sin configurar (será alta). */
  version?: number;
  /** Actividades aprobadas de este ítem en el período: si hay, no se puede quitar. */
  avance: number;
  incluido: boolean;
}

/**
 * Construye las filas cruzando los ítems del cargo con las metas ya guardadas.
 *
 * Los ítems **sin meta se muestran igual**, desmarcados: un ítem invisible es
 * un ítem que nadie recuerda repartir (DESIGN §8.2.2).
 */
export function construirFilas(
  items: ItemMedicion[],
  metas: MetaItem[],
  avancePorItem: Map<string, number>
): FilaMeta[] {
  const metaPorItem = new Map(metas.map((m) => [m.itemId, m]));
  return items
    .slice()
    .sort((a, b) => a.orden - b.orden)
    .map((it) => {
      const meta = metaPorItem.get(it.id);
      return {
        itemId: it.id,
        nombre: it.nombre,
        tipo: it.tipo,
        direccion: it.direccion,
        meta: meta ? String(num(meta.metaValor)) : "",
        ponderador: meta ? String(aPorcentaje(num(meta.ponderador))) : "",
        version: meta?.version,
        avance: avancePorItem.get(it.id) ?? 0,
        incluido: meta !== undefined,
      };
    });
}

/** Número escrito por una persona: acepta la coma decimal del teclado chileno. */
export function leerNumero(texto: string): number | null {
  const limpio = texto.trim().replace(",", ".");
  if (limpio === "") return null;
  const n = Number(limpio);
  return Number.isFinite(n) ? n : null;
}

export interface EstadoSuma {
  total: number;
  /** RN-001 cumplida dentro de la tolerancia */
  cuadrado: boolean;
  /** Positivo = falta; negativo = se pasa */
  diferencia: number;
  estado: "cuadrado" | "falta" | "excede" | "vacio";
  mensaje: string;
}

/** El totalizador que acompaña la edición (DESIGN §8.2.1: la suma es el protagonista). */
export function estadoSuma(filas: FilaMeta[]): EstadoSuma {
  const incluidas = filas.filter((f) => f.incluido);
  const total =
    Math.round(incluidas.reduce((s, f) => s + (leerNumero(f.ponderador) ?? 0), 0) * 100) / 100;
  const diferencia = Math.round((100 - total) * 100) / 100;

  if (incluidas.length === 0) {
    return { total: 0, cuadrado: false, diferencia: 100, estado: "vacio", mensaje: "Sin ítems seleccionados" };
  }
  if (Math.abs(diferencia) <= TOLERANCIA_PCT) {
    return { total, cuadrado: true, diferencia: 0, estado: "cuadrado", mensaje: "Cuadrado en 100%" };
  }
  if (diferencia > 0) {
    return { total, cuadrado: false, diferencia, estado: "falta", mensaje: `Falta ${fmt(diferencia)}%` };
  }
  return { total, cuadrado: false, diferencia, estado: "excede", mensaje: `Se pasa por ${fmt(-diferencia)}%` };
}

/** Formato de cifra: coma decimal y sin ceros de relleno inútiles. */
export function fmt(n: number, dec = 2): string {
  return n
    .toFixed(dec)
    .replace(/\.?0+$/, "")
    .replace(".", ",");
}

/**
 * Reparte 100% entre los ítems incluidos (DESIGN §8.2.4). El redondeo se
 * acumula en el último para que el total dé exactamente 100 y no 99,99.
 */
export function repartirIgual(filas: FilaMeta[]): FilaMeta[] {
  const incluidas = filas.filter((f) => f.incluido);
  if (incluidas.length === 0) return filas;
  const base = Math.floor(10_000 / incluidas.length) / 100;
  const ultimo = Math.round((100 - base * (incluidas.length - 1)) * 100) / 100;
  let vistos = 0;
  return filas.map((f) => {
    if (!f.incluido) return f;
    vistos += 1;
    return { ...f, ponderador: String(vistos === incluidas.length ? ultimo : base) };
  });
}

export interface ProblemaFila {
  itemId: string;
  mensaje: string;
}

/** Lo que impide guardar. Vacío = el `PUT` puede salir. */
export function validarFilas(filas: FilaMeta[]): ProblemaFila[] {
  const problemas: ProblemaFila[] = [];
  for (const f of filas.filter((x) => x.incluido)) {
    const meta = leerNumero(f.meta);
    const pond = leerNumero(f.ponderador);
    // RN-002: un ítem con meta 0 no es medible y contaría 0% para siempre.
    if (meta === null || meta <= 0) problemas.push({ itemId: f.itemId, mensaje: "La meta debe ser mayor que 0" });
    if (pond === null || pond <= 0) problemas.push({ itemId: f.itemId, mensaje: "El ponderador debe ser mayor que 0" });
    else if (pond > 100) problemas.push({ itemId: f.itemId, mensaje: "El ponderador no puede pasar de 100%" });
  }
  return problemas;
}

/** Cuerpo del `PUT /metas-item`: fracciones, y la versión de lo que ya existe. */
export function cuerpoGuardado(filas: FilaMeta[]) {
  return filas
    .filter((f) => f.incluido)
    .map((f) => ({
      itemId: f.itemId,
      metaValor: leerNumero(f.meta) ?? 0,
      ponderador: aFraccion(leerNumero(f.ponderador) ?? 0),
      ...(f.version !== undefined ? { version: f.version } : {}),
    }));
}
