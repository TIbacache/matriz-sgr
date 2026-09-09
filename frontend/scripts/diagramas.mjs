// Exporta a PNG los diagramas mermaid de docs/diagramas.md.
//
// Para qué: en Planner se adjuntan archivos y el docente mira imágenes; en
// GitHub, Markdown sí renderiza mermaid, pero un PNG se ve igual en todas
// partes (Planner, Word, una impresión). La fuente sigue siendo el bloque
// mermaid del .md — esto solo lo fotografía, así que nunca se desincroniza:
// se vuelve a correr y listo.
//
//   node scripts/diagramas.mjs [fuente.md] [carpeta-destino]
//
// Sin argumentos exporta docs/diagramas.md a docs/diagramas. El primer
// argumento que termine en .md se toma como fuente, y el otro como destino:
//
//   node scripts/diagramas.mjs ../docs/entrega/requerimientos.md ../docs/entrega/diagramas
//
// Usa el Edge instalado y mermaid desde CDN (sin dependencias nuevas).
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright-core";

const raiz = path.resolve("..");
const argumentos = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const fuenteArg = argumentos.find((a) => a.toLowerCase().endsWith(".md"));
const destinoArg = argumentos.find((a) => !a.toLowerCase().endsWith(".md"));

const fuente = fuenteArg ? path.resolve(fuenteArg) : path.join(raiz, "docs", "diagramas.md");
const destino = path.resolve(destinoArg ?? path.join(raiz, "docs", "diagramas"));

const md = await readFile(fuente, "utf8");

// Cada bloque ```mermaid con el título de la sección que lo precede
const diagramas = [];
const lineas = md.split("\n");
let titulo = "diagrama";
for (let i = 0; i < lineas.length; i++) {
  const h = /^##\s+(.+)$/.exec(lineas[i]);
  if (h) titulo = h[1].trim();
  if (lineas[i].trim() === "```mermaid") {
    const cuerpo = [];
    for (i++; i < lineas.length && lineas[i].trim() !== "```"; i++) cuerpo.push(lineas[i]);
    const base = titulo
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    // Dos diagramas bajo el mismo encabezado se pisarían el archivo: al
    // segundo y siguientes se les numera.
    let slug = base;
    for (let n = 2; diagramas.some((d) => d.slug === slug); n++) slug = `${base}-${n}`;
    diagramas.push({ titulo, slug, codigo: cuerpo.join("\n") });
  }
}

await mkdir(destino, { recursive: true });
const navegador = await chromium.launch({ channel: "msedge", headless: true });
const ctx = await navegador.newContext({ viewport: { width: 1600, height: 1200 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();

try {
  for (const d of diagramas) {
    // Fondo claro y tipografía del sistema: los diagramas acompañan al
    // producto, no parecen salidos de otra herramienta.
    await page.setContent(`<!doctype html><html><head><meta charset="utf-8">
      <style>
        body { margin: 0; padding: 32px; background: #f4f4f2; font-family: system-ui, sans-serif; }
        #d { display: inline-block; }
      </style></head>
      <body><div id="d" class="mermaid">${d.codigo.replace(/</g, "&lt;")}</div>
      <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
      <script>
        mermaid.initialize({ startOnLoad: true, theme: "base", themeVariables: {
          primaryColor: "#ffffff", primaryTextColor: "#1a1a1a", primaryBorderColor: "#b9bdbf",
          lineColor: "#5b6166", fontFamily: "system-ui, sans-serif", fontSize: "15px"
        }});
      </script></body></html>`);
    await page.waitForSelector("#d svg", { timeout: 30000 });
    await page.waitForTimeout(500);

    // Cuando un diagrama no compila, mermaid dibuja una bomba y el texto
    // "Syntax error in text". Sin esto se fotografiaba el error y el PNG roto
    // llegaba al entregable sin que nadie se enterara.
    const roto = await page.evaluate(() => {
      const svg = document.querySelector("#d svg");
      if (!svg) return "no se generó ningún SVG";
      if (svg.querySelector(".error-icon, .error-text")) return "mermaid no pudo compilar el diagrama";
      if ((svg.textContent || "").includes("Syntax error")) return "error de sintaxis en el diagrama";
      return null;
    });
    if (roto) throw new Error(`${d.titulo}: ${roto}. Diagnostica con: node scripts/probar-mermaid.mjs <fuente.md>`);

    const caja = page.locator("#d");
    await caja.screenshot({ path: path.join(destino, `${d.slug}.png`) });
    console.log(`${d.slug}.png  ${d.titulo}`);
  }
} finally {
  await navegador.close();
}

// Índice para que los diagramas se vean en GitHub sin abrir cada archivo.
// El enlace a la fuente se calcula desde el destino, porque ya no siempre es
// el vecino docs/diagramas.md.
const rutaFuente = path.relative(destino, fuente).split(path.sep).join("/");
const comando = fuenteArg
  ? `node scripts/diagramas.mjs ${fuenteArg} ${destinoArg ?? ""}`.trim()
  : `node scripts/diagramas.mjs`;
const indice =
  `# Diagramas exportados\n\n` +
  `Generados desde los bloques \`mermaid\` de [${path.basename(fuente)}](${rutaFuente}) con ` +
  `\`${comando}\` (en \`frontend/\`). **La fuente es el .md**: si un diagrama ` +
  `cambia, se edita allá y se vuelve a exportar.\n\n` +
  `Están en PNG porque en Planner se adjuntan archivos y ahí no se renderiza mermaid.\n\n` +
  diagramas.map((d) => `## ${d.titulo}\n\n![${d.titulo}](${d.slug}.png)\n`).join("\n");
await writeFile(path.join(destino, "README.md"), indice, "utf8");

console.log(`\n${diagramas.length} diagramas en ${destino}`);
