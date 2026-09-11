// Diagnóstico: renderiza cada bloque mermaid de un .md y reporta el error
// exacto si alguno no compila.
//
//   node scripts/probar-mermaid.mjs ../docs/entrega/requerimientos.md
import { readFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright-core";

const fuente = path.resolve(process.argv[2]);
const md = await readFile(fuente, "utf8");

const bloques = [];
const lineas = md.split("\n");
let titulo = "sin título";
for (let i = 0; i < lineas.length; i++) {
  const h = /^##\s+(.+)$/.exec(lineas[i]);
  if (h) titulo = h[1].trim();
  if (lineas[i].trim() === "```mermaid") {
    const inicio = i + 1;
    const cuerpo = [];
    for (i++; i < lineas.length && lineas[i].trim() !== "```"; i++) cuerpo.push(lineas[i]);
    bloques.push({ titulo, linea: inicio, codigo: cuerpo.join("\n") });
  }
}

const navegador = await chromium.launch({ channel: "msedge", headless: true });
const page = await navegador.newPage();
await page.setContent(`<!doctype html><html><head><meta charset="utf-8"></head><body>
  <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
</body></html>`);
await page.waitForFunction(() => typeof window.mermaid !== "undefined", { timeout: 30000 });
await page.evaluate(() => window.mermaid.initialize({ startOnLoad: false }));

let fallos = 0;
for (const [i, b] of bloques.entries()) {
  const error = await page.evaluate(async ([codigo, id]) => {
    try {
      await window.mermaid.parse(codigo);
      return null;
    } catch (e) {
      return String(e.message ?? e);
    }
  }, [b.codigo, `d${i}`]);

  if (error) {
    fallos++;
    console.log(`\nFALLA  línea ${b.linea}  ${b.titulo}`);
    console.log(error.split("\n").slice(0, 12).join("\n"));
  } else {
    console.log(`ok     línea ${b.linea}  ${b.titulo}`);
  }
}

await navegador.close();
console.log(`\n${bloques.length - fallos}/${bloques.length} bloques compilan`);
process.exit(fallos ? 1 : 0);
