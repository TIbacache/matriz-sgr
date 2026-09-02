// Verificación de contraste y de la separación de los dos rojos (DESIGN §8.1.3,
// ADR-011): "verificado con script, no a ojo". Lee tokens.css, resuelve los
// dos temas y comprueba cada par texto/fondo contra WCAG AA. Además exige que
// el rojo institucional y el rojo del semáforo se mantengan perceptualmente
// separados, y que ningún archivo del frontend tenga un hex fuera de tokens.
//
//   npm run verificar:contraste
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const css = readFileSync(path.join(raiz, "src/styles/tokens.css"), "utf8");

// ---------- lectura de tokens ----------

// Busca el selector al inicio de línea: los comentarios de tokens.css también
// nombran a :root y a [data-theme="oscuro"], y un indexOf a secas los pisaría.
function bloque(selector) {
  const m = new RegExp(`^${selector.replace(/[[\]]/g, "\\$&")}\\s*\\{`, "m").exec(css);
  if (!m) throw new Error(`No encuentro el bloque ${selector} en tokens.css`);
  const a = css.indexOf("{", m.index);
  const b = css.indexOf("}", a);
  return css.slice(a + 1, b);
}

function parsear(texto) {
  const m = {};
  for (const [, k, v] of texto.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) m[k] = v.trim();
  return m;
}

const claro = parsear(bloque(":root"));
const oscuro = { ...claro, ...parsear(bloque('[data-theme="oscuro"]')) };
const temas = { claro, oscuro };

// ---------- color ----------

function color(valor) {
  const v = valor.trim();
  let m;
  if ((m = /^#([0-9a-f]{6})$/i.exec(v))) {
    const n = parseInt(m[1], 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255, a: 1 };
  }
  if ((m = /^#([0-9a-f]{3})$/i.exec(v))) {
    const [r, g, b] = m[1].split("").map((c) => parseInt(c + c, 16));
    return { r, g, b, a: 1 };
  }
  if ((m = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+))?\s*\)$/i.exec(v))) {
    return { r: +m[1], g: +m[2], b: +m[3], a: m[4] === undefined ? 1 : +m[4] };
  }
  throw new Error(`Color no reconocido: ${valor}`);
}

// Un color translúcido se resuelve sobre el fondo real donde se pinta.
function sobre(fg, bg) {
  if (fg.a >= 1) return fg;
  const mezcla = (c, d) => Math.round(fg.a * c + (1 - fg.a) * d);
  return { r: mezcla(fg.r, bg.r), g: mezcla(fg.g, bg.g), b: mezcla(fg.b, bg.b), a: 1 };
}

function canal(c) {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

function luminancia(c) {
  return 0.2126 * canal(c.r) + 0.7152 * canal(c.g) + 0.0722 * canal(c.b);
}

function contraste(a, b) {
  const la = luminancia(a);
  const lb = luminancia(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

// CIE76: distancia perceptual entre dos colores (ΔE). Bajo ~10 se confunden.
function lab(c) {
  let x = canal(c.r) * 0.4124 + canal(c.g) * 0.3576 + canal(c.b) * 0.1805;
  let y = canal(c.r) * 0.2126 + canal(c.g) * 0.7152 + canal(c.b) * 0.0722;
  let z = canal(c.r) * 0.0193 + canal(c.g) * 0.1192 + canal(c.b) * 0.9505;
  x /= 0.95047;
  z /= 1.08883;
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  return { L: 116 * f(y) - 16, a: 500 * (f(x) - f(y)), b: 200 * (f(y) - f(z)) };
}

function deltaE(c1, c2) {
  const p = lab(c1);
  const q = lab(c2);
  return Math.hypot(p.L - q.L, p.a - q.a, p.b - q.b);
}

function hex(c) {
  return "#" + [c.r, c.g, c.b].map((n) => n.toString(16).padStart(2, "0")).join("");
}

// ---------- verificaciones ----------

let total = 0;
let fallas = 0;

function verificar(nombre, ok, detalle) {
  total++;
  if (!ok) fallas++;
  console.log(`${ok ? "PASS" : "FAIL"} - ${nombre}${detalle ? ` (${detalle})` : ""}`);
}

function resolver(t, nombre, fondo) {
  // Resuelve un token (posiblemente translúcido) sobre el fondo indicado.
  const c = color(t[nombre]);
  return fondo ? sobre(c, fondo) : c;
}

for (const [tema, t] of Object.entries(temas)) {
  const superficie = color(t["--superficie"]);
  const fondo = color(t["--fondo"]);
  const fondo2 = color(t["--fondo-2"]);
  const barraFondo = color(t["--barra-fondo"]);
  const marcaProfundo = color(t["--marca-profundo"]);
  const btnBg = color(t["--btn-bg"]);
  const btnBgHover = color(t["--btn-bg-hover"]);

  // [nombre, texto, fondo, fondo-real-para-resolver-translúcidos, mínimo]
  const pares = [
    ["texto principal sobre superficie", "--tinta", superficie, 4.5],
    ["texto principal sobre fondo", "--tinta", fondo, 4.5],
    ["texto principal sobre fondo-2", "--tinta", fondo2, 4.5],
    ["texto principal sobre selección", "--tinta", resolver(t, "--seleccion-bg", superficie), 4.5],
    ["texto secundario sobre superficie", "--tinta-2", superficie, 4.5],
    ["texto secundario sobre fondo", "--tinta-2", fondo, 4.5],
    ["texto secundario sobre fondo-2", "--tinta-2", fondo2, 4.5],
    ["placeholder sobre superficie (3:1)", "--tinta-3", superficie, 3],
    ["acento como texto sobre superficie", "--acento", superficie, 4.5],
    ["acento como texto sobre fondo", "--acento", fondo, 4.5],
    ["marca como texto sobre superficie", "--marca", superficie, 4.5],
    ["texto del botón sobre botón", "--btn-texto", btnBg, 4.5],
    ["texto del botón sobre botón:hover", "--btn-texto", btnBgHover, 4.5],
    ["botón contra superficie (límite 3:1)", "--btn-bg", superficie, 3],
    ["texto de la barra sobre la barra", "--barra-texto", barraFondo, 4.5],
    ["texto secundario de la barra", "--barra-texto-2", barraFondo, 4.5, barraFondo],
    ["texto del panel del login", "--barra-texto", marcaProfundo, 4.5],
    ["texto secundario del panel del login", "--barra-texto-2", marcaProfundo, 4.5, marcaProfundo],
    ["marca de selección sobre superficie (3:1)", "--seleccion", superficie, 3],
  ];

  for (const estado of ["verde", "amarillo", "rojo"]) {
    const bg = resolver(t, `--estado-${estado}-bg`, superficie);
    pares.push([`estado ${estado}: texto sobre fondo pálido`, `--estado-${estado}-texto`, bg, 4.5]);
    pares.push([`estado ${estado}: texto sobre superficie`, `--estado-${estado}-texto`, superficie, 4.5]);
    pares.push([`estado ${estado}: marca sobre superficie (3:1)`, `--estado-${estado}`, superficie, 3]);
  }
  for (let i = 1; i <= 6; i++) {
    pares.push([`categoría ${i}: franja sobre superficie (3:1)`, `--cat-${i}`, superficie, 3]);
  }
  pares.push(["tubo-2 sobre superficie (3:1)", "--tubo-2", superficie, 3]);
  pares.push(["tubo-3 sobre superficie (3:1)", "--tubo-3", superficie, 3]);

  for (const [nombre, token, bg, minimo, ground] of pares) {
    const fg = resolver(t, token, ground ?? bg);
    const r = contraste(fg, bg);
    verificar(`[${tema}] ${nombre}`, r >= minimo, `${token} ${hex(fg)} / ${hex(bg)} = ${r.toFixed(2)}:1`);
  }

  // Rampa ordinal del tubo: monótona y con pasos distinguibles
  const rampa = [1, 2, 3].map((i) => luminancia(color(t[`--tubo-${i}`])));
  const monotona = tema === "claro" ? rampa[0] > rampa[1] && rampa[1] > rampa[2] : rampa[0] < rampa[1] && rampa[1] < rampa[2];
  verificar(`[${tema}] rampa del tubo monótona`, monotona, rampa.map((l) => l.toFixed(3)).join(" → "));
  const paso = Math.min(
    contraste(color(t["--tubo-1"]), color(t["--tubo-2"])),
    contraste(color(t["--tubo-2"]), color(t["--tubo-3"]))
  );
  verificar(`[${tema}] pasos de la rampa distinguibles (≥1.5:1)`, paso >= 1.5, `${paso.toFixed(2)}:1`);

  // ADR-011: los dos rojos siguen siendo dos. Un cambio de token que los
  // acerque hace fallar esto antes de que llegue a una pantalla.
  const acento = color(t["--acento"]);
  const marca = color(t["--marca"]);
  const rojo = color(t["--estado-rojo"]);
  const dAcento = deltaE(acento, rojo);
  const dMarca = deltaE(marca, rojo);
  verificar(`[${tema}] ADR-011 acento ≠ estado-rojo (ΔE ≥ 15)`, dAcento >= 15, `ΔE = ${dAcento.toFixed(1)}`);
  verificar(`[${tema}] ADR-011 marca ≠ estado-rojo (ΔE ≥ 15)`, dMarca >= 15, `ΔE = ${dMarca.toFixed(1)}`);
  const selBg = resolver(t, "--seleccion-bg", superficie);
  const rojoBg = resolver(t, "--estado-rojo-bg", superficie);
  const dFondos = deltaE(selBg, rojoBg);
  verificar(`[${tema}] fila seleccionada ≠ fila crítica (ΔE ≥ 10)`, dFondos >= 10, `ΔE = ${dFondos.toFixed(1)}`);
}

// DESIGN §8.10: ningún hex fuera de tokens.css
function archivos(dir) {
  const out = [];
  for (const nombre of readdirSync(dir)) {
    const p = path.join(dir, nombre);
    if (statSync(p).isDirectory()) out.push(...archivos(p));
    else if (/\.(css|tsx?|html)$/.test(nombre)) out.push(p);
  }
  return out;
}
const sueltos = [];
for (const archivo of archivos(path.join(raiz, "src"))) {
  if (archivo.endsWith("tokens.css")) continue;
  const texto = readFileSync(archivo, "utf8");
  for (const [linea, contenido] of texto.split("\n").entries()) {
    if (/#[0-9a-f]{3}(?:[0-9a-f]{3})?\b/i.test(contenido) && !/^\s*(\/\/|\*|\/\*)/.test(contenido)) {
      sueltos.push(`${path.relative(raiz, archivo)}:${linea + 1}`);
    }
  }
}
verificar("DESIGN §8.10 ningún hex fuera de tokens.css", sueltos.length === 0, sueltos.join(", ") || "src limpio");

console.log(`\n${total - fallas}/${total} verificaciones de contraste en verde`);
process.exit(fallas ? 1 : 0);
