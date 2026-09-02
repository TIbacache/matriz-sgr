import { deflateSync } from "node:zlib";

// Generador de imágenes de evidencia para el seed — regla 12 de CLAUDE.md.
//
// Las evidencias del seed necesitan un archivo real en el almacén: sin él la
// ficha y la bandeja muestran "el archivo no está disponible" (410) y la
// pantalla más importante del sistema se ve rota en la demo.
//
// **No son fotografías**: son imágenes sintéticas, generadas aquí, con bandas
// de color derivadas del código de la actividad. Se ven como un marcador de
// posición y no como una evidencia real, que es exactamente lo que queremos:
// está PROHIBIDO cargar datos reales de personas (§Condiciones del caso).
//
// Se codifica PNG a mano (zlib es de Node) para no agregar dependencias:
// restricción de costo cero, regla 13.

const TABLA_CRC = (() => {
  const tabla = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    tabla[n] = c >>> 0;
  }
  return tabla;
})();

function crc32(datos: Buffer): number {
  let c = 0xffffffff;
  for (const b of datos) c = TABLA_CRC[(c ^ b) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function trozo(tipo: string, datos: Buffer): Buffer {
  const largo = Buffer.alloc(4);
  largo.writeUInt32BE(datos.length);
  const cuerpo = Buffer.concat([Buffer.from(tipo, "ascii"), datos]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(cuerpo));
  return Buffer.concat([largo, cuerpo, crc]);
}

/** Hash estable: el mismo código produce siempre la misma imagen. */
function semilla(texto: string): number {
  let h = 2166136261;
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function hslARgb(h: number, s: number, l: number): [number, number, number] {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] =
    h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}

/** ¿Está el punto dentro del triángulo? (signo del producto cruz, tres veces) */
function enTriangulo(
  px: number, py: number,
  ax: number, ay: number, bx: number, by: number, cx: number, cy: number
): boolean {
  const d = (x1: number, y1: number, x2: number, y2: number) => (px - x2) * (y1 - y2) - (x1 - x2) * (py - y2);
  const d1 = d(ax, ay, bx, by);
  const d2 = d(bx, by, cx, cy);
  const d3 = d(cx, cy, ax, ay);
  const neg = d1 < 0 || d2 < 0 || d3 < 0;
  const pos = d1 > 0 || d2 > 0 || d3 > 0;
  return !(neg && pos);
}

/**
 * PNG sintético de `ancho`×`alto`: un paisaje estilizado —cielo degradado,
 * sol, dos cerros y suelo— con marco claro. El tono lo decide el código, así
 * que la misma actividad produce siempre la misma imagen y dos actividades
 * distintas se distinguen a simple vista.
 *
 * Es deliberadamente una ILUSTRACIÓN, no una foto: quien la mire debe saber
 * de inmediato que es un dato de demostración.
 */
export function imagenEvidencia(codigo: string, ancho = 800, alto = 600): Buffer {
  const s = semilla(codigo);
  const tono = s % 360;
  const cielo = hslARgb(tono, 0.3, 0.72);
  const cieloBajo = hslARgb(tono, 0.36, 0.85);
  const sol = hslARgb((tono + 40) % 360, 0.55, 0.9);
  const cerroLejos = hslARgb((tono + 20) % 360, 0.24, 0.52);
  const cerroCerca = hslARgb((tono + 32) % 360, 0.28, 0.4);
  const suelo = hslARgb((tono + 26) % 360, 0.22, 0.3);
  const marcoColor: [number, number, number] = [245, 245, 242];

  const horizonte = Math.round(alto * (0.62 + ((s >> 9) % 10) / 100));
  const marco = Math.round(ancho * 0.02);
  const solX = ancho * (0.62 + ((s >> 5) % 20) / 100);
  const solY = alto * 0.26;
  const solR = ancho * 0.075;
  // Dos cerros, con las cimas desplazadas por la semilla
  const c1x = ancho * (0.22 + ((s >> 13) % 16) / 100);
  const c1y = alto * (0.3 + ((s >> 17) % 12) / 100);
  const c2x = ancho * (0.58 + ((s >> 21) % 14) / 100);
  const c2y = alto * (0.4 + ((s >> 25) % 10) / 100);

  // Cada scanline lleva su byte de filtro (0 = sin filtro) y luego RGB.
  const filas = Buffer.alloc(alto * (1 + ancho * 3));
  for (let y = 0; y < alto; y++) {
    const base = y * (1 + ancho * 3);
    filas[base] = 0;
    for (let x = 0; x < ancho; x++) {
      let color: [number, number, number];
      if (x < marco || y < marco || x >= ancho - marco || y >= alto - marco) {
        color = marcoColor;
      } else if (y >= horizonte) {
        color = suelo;
      } else if (enTriangulo(x, y, c2x, c2y, c2x - ancho * 0.42, horizonte, c2x + ancho * 0.46, horizonte)) {
        color = cerroCerca;
      } else if (enTriangulo(x, y, c1x, c1y, c1x - ancho * 0.34, horizonte, c1x + ancho * 0.38, horizonte)) {
        color = cerroLejos;
      } else if ((x - solX) ** 2 + (y - solY) ** 2 <= solR ** 2) {
        color = sol;
      } else {
        const t = y / horizonte;
        color = cielo.map((c, i) => Math.round(c + (cieloBajo[i]! - c) * t)) as [number, number, number];
      }
      const p = base + 1 + x * 3;
      filas[p] = color[0];
      filas[p + 1] = color[1];
      filas[p + 2] = color[2];
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(ancho, 0);
  ihdr.writeUInt32BE(alto, 4);
  ihdr[8] = 8; // 8 bits por canal
  ihdr[9] = 2; // color verdadero RGB
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    trozo("IHDR", ihdr),
    trozo("IDAT", deflateSync(filas, { level: 9 })),
    trozo("IEND", Buffer.alloc(0)),
  ]);
}
