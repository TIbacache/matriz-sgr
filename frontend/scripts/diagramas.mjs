// Exporta a PNG los diagramas mermaid de docs/diagramas.md.
//
// Para qué: en Planner se adjuntan archivos y el docente mira imágenes; en
// GitHub, Markdown sí renderiza mermaid, pero un PNG se ve igual en todas
// partes (Planner, Word, una impresión). La fuente sigue siendo el bloque
// mermaid del .md — esto solo lo fotografía, así que nunca se desincroniza:
// se vuelve a correr y listo.
//
//   node scripts/diagramas.mjs [carpeta-destino]
//
// Usa el Edge instalado y mermaid desde CDN (sin dependencias nuevas).
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright-core";

const raiz = path.resolve("..");
const fuente = path.join(raiz, "docs", "diagramas.md");
const destino = path.resolve(process.argv[2] ?? path.join(raiz, "docs", "diagramas"));

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
    const slug = titulo
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
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
    const caja = page.locator("#d");
    await caja.screenshot({ path: path.join(destino, `${d.slug}.png`) });
    console.log(`${d.slug}.png  ${d.titulo}`);
  }
} finally {
  await navegador.close();
}

// Índice para que los diagramas se vean en GitHub sin abrir cada archivo
const indice =
  `# Diagramas exportados\n\n` +
  `Generados desde los bloques \`mermaid\` de [../diagramas.md](../diagramas.md) con ` +
  `\`node scripts/diagramas.mjs\` (en \`frontend/\`). **La fuente es el .md**: si un diagrama ` +
  `cambia, se edita allá y se vuelve a exportar.\n\n` +
  `Están en PNG porque en Planner se adjuntan archivos y ahí no se renderiza mermaid.\n\n` +
  diagramas.map((d) => `## ${d.titulo}\n\n![${d.titulo}](${d.slug}.png)\n`).join("\n");
await writeFile(path.join(destino, "README.md"), indice, "utf8");

console.log(`\n${diagramas.length} diagramas en ${destino}`);
