// Convierte un documento Markdown del repositorio en un PDF imprimible.
//
//   node scripts/pdf.mjs ../docs/entrega/guia-planner-hector.md
//   node scripts/pdf.mjs <entrada.md> [salida.pdf]
//
// Usa el mismo pipeline que los mockups y los diagramas: playwright-core con
// el Edge que ya está instalado en Windows, sin dependencias nuevas ni de pago
// (regla 13). El PDF sale en Arial, que es lo que la norma municipal exige
// para documentos impresos (ADR-010, DESIGN §2 y §10.2).
//
// El convertidor cubre el subconjunto de Markdown que usan los documentos del
// repositorio: encabezados, párrafos, tablas, listas (incluidas las de
// comprobación), listas numeradas, bloques de código, citas, separadores y el
// formato en línea (negrita, cursiva, código y enlaces). No pretende ser un
// intérprete completo de Markdown: pretende que estos documentos se impriman
// bien y que un error sea visible en vez de silencioso.

import { chromium } from "playwright-core";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { readFileSync, statSync } from "node:fs";
import { dirname, resolve, basename, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { execSync } from "node:child_process";

const aquí = dirname(fileURLToPath(import.meta.url));
const raízRepo = resolve(aquí, "..", "..");

// ------------------------------------------------------- Enlaces del PDF
//
// Un enlace relativo (`requerimientos.md`, `../mockups/03-ficha.png`) es lo
// correcto en el Markdown: funciona al editarlo y funciona en GitHub, que los
// resuelve dentro del repositorio.
//
// En el PDF **no funciona**, y el modo de fallar es traicionero: al autor le
// anda, porque el PDF queda junto a los archivos que nombra. A quien lo abre
// desde Planner, en otro computador, no lo lleva a ninguna parte.
//
// Por eso el PDF —y solo el PDF— reescribe cada enlace relativo a su URL
// absoluta en GitHub. El Markdown no se toca.
function repositorio() {
  const corre = (c) => execSync(c, { cwd: raízRepo, encoding: "utf8" }).trim();
  try {
    const remoto = corre("git remote get-url origin");
    const m = remoto.match(/github\.com[/:]([^/]+\/[^/.]+)/);
    if (!m) return null;
    // La referencia por defecto es `main`, y es una decisión: un PDF se
    // entrega, y sus enlaces tienen que seguir vivos cuando la rama en que se
    // generó ya no exista. Además `main` es, por regla del proyecto, lo que se
    // le puede mostrar al docente. Para un documento de una rama todavía sin
    // mergear se fija con SGR_REPO_REF=<rama>.
    const ref = process.env.SGR_REPO_REF || "main";
    return { proyecto: `https://github.com/${m[1]}`, ref };
  } catch {
    return null; // sin git o sin remoto: los enlaces quedan como estaban
  }
}

const REPO_WEB = repositorio();
/** Carpeta del .md que se está convirtiendo, para resolver lo relativo. */
let baseDelDocumento = null;

function enlaceAbsoluto(href) {
  if (!REPO_WEB || !baseDelDocumento) return href;
  // Se dejan intactos los absolutos, los anclas internas y los esquemas.
  if (/^(https?:|mailto:|#|\/)/i.test(href)) return href;
  const [ruta, ancla] = href.split("#");
  if (!ruta) return href;
  const destino = resolve(baseDelDocumento, ruta);
  const enRepo = relative(raízRepo, destino);
  // Fuera del repositorio no hay URL que ofrecer: mejor dejarlo como está.
  if (enRepo.startsWith("..")) return href;
  // GitHub separa `blob` (archivo) de `tree` (carpeta). Enlazar una carpeta
  // como `blob` funciona por un redirect, y depender de un redirect en un
  // documento que se entrega es pedirle prestado a la suerte.
  let tipo = "blob";
  try {
    if (statSync(destino).isDirectory()) tipo = "tree";
  } catch {
    /* no existe en disco: se enlaza como archivo y el verificador lo delata */
  }
  const partes = enRepo.split(/[\\/]/).filter(Boolean).map(encodeURIComponent).join("/");
  return `${REPO_WEB.proyecto}/${tipo}/${REPO_WEB.ref}/${partes}${ancla ? `#${ancla}` : ""}`;
}

// ---------------------------------------------------------------- Markdown

/** Ancho y alto de un PNG, leídos de su cabecera IHDR. `null` si no lo es. */
function medidasPng(archivo) {
  try {
    const b = readFileSync(archivo);
    if (b.length < 24 || b.readUInt32BE(0) !== 0x89504e47) return null;
    return { ancho: b.readUInt32BE(16), alto: b.readUInt32BE(20) };
  } catch {
    return null;
  }
}

function escapar(texto) {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Formato en línea. El código va primero y se aparta, para que un asterisco
// dentro de `código` no se lea como cursiva.
function enLinea(texto) {
  const codigos = [];
  let t = texto.replace(/`([^`]+)`/g, (_, c) => {
    codigos.push(c);
    return `\u0001${codigos.length - 1}\u0002`;
  });

  // Las imágenes van ANTES que los enlaces: comparten sintaxis salvo el `!`,
  // y al revés una captura se convertiría en un enlace con el alt por texto.
  // El `src` se resuelve a file:// absoluto para que el PDF salga con la
  // imagen aunque se pida la salida en otra carpeta.
  t = t.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, src) => {
    const local = baseDelDocumento && !/^(https?:|data:)/i.test(src);
    const archivo = local ? resolve(baseDelDocumento, src) : null;
    const ruta = archivo ? pathToFileURL(archivo).href : src;

    // Una captura de pantalla completa puede ser muchísimo más alta que ancha
    // —la ficha del vecino mide 11.249 px—. Metida entera en una página se
    // encoge a una tira vertical de 115 px de ancho: ilegible y con aspecto de
    // error. Se muestra **su parte de arriba a ancho completo**, que es lo que
    // alguien ve al abrir la pantalla, y el pie lo dice. La imagen completa
    // está en el repositorio.
    const medidas = archivo ? medidasPng(archivo) : null;
    const recortar = medidas && medidas.alto / medidas.ancho > 1.6;

    const pie = alt
      ? `<figcaption>${escapar(alt)}${recortar ? " · <em>captura de página completa, recortada a su parte superior; entera en el repositorio</em>" : ""}</figcaption>`
      : "";
    const imagen = `<img src="${ruta}" alt="${escapar(alt)}">`;
    return recortar
      ? `<figure class="recorte"><span class="marco">${imagen}</span>${pie}</figure>`
      : `<figure>${imagen}${pie}</figure>`;
  });

  t = t.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, texto, href) => `<a href="${enlaceAbsoluto(href)}">${texto}</a>`);
  t = t.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  t = t.replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>");
  t = t.replace(/~~([^~]+)~~/g, "<del>$1</del>");

  return t.replace(/\u0001(\d+)\u0002/g, (_, i) => `<code>${codigos[Number(i)]}</code>`);
}

function celda(texto) {
  const t = texto.trim();
  if (t === "—" || t === "-") return '<span class="vacio">—</span>';
  return enLinea(t);
}

// Una fila de tabla de Markdown: se parte por | respetando los \| escapados.
function partirFila(linea) {
  return linea
    .replace(/^\s*\|/, "")
    .replace(/\|\s*$/, "")
    .split(/(?<!\\)\|/)
    .map((c) => c.replace(/\\\|/g, "|"));
}

const esSeparadorDeTabla = (linea) => /^\s*\|?[\s:|-]+\|[\s:|-]*$/.test(linea) && linea.includes("-");

function convertir(markdown) {
  const lineas = escapar(markdown).split(/\r?\n/);
  const salida = [];
  let i = 0;

  while (i < lineas.length) {
    const linea = lineas[i];

    // Línea en blanco
    if (!linea.trim()) {
      i++;
      continue;
    }

    // Bloque de código
    if (linea.trimStart().startsWith("```")) {
      const cuerpo = [];
      i++;
      while (i < lineas.length && !lineas[i].trimStart().startsWith("```")) {
        cuerpo.push(lineas[i]);
        i++;
      }
      i++; // la línea de cierre
      salida.push(`<pre><code>${cuerpo.join("\n")}</code></pre>`);
      continue;
    }

    // Separador
    if (/^\s*(---|\*\*\*|___)\s*$/.test(linea)) {
      salida.push("<hr>");
      i++;
      continue;
    }

    // Encabezado
    const enc = linea.match(/^(#{1,6})\s+(.*)$/);
    if (enc) {
      const nivel = enc[1].length;
      salida.push(`<h${nivel}>${enLinea(enc[2].trim())}</h${nivel}>`);
      i++;
      continue;
    }

    // Tabla: una fila con | seguida de la línea de separación
    if (linea.includes("|") && i + 1 < lineas.length && esSeparadorDeTabla(lineas[i + 1])) {
      const encabezados = partirFila(linea);
      i += 2;
      const filas = [];
      while (i < lineas.length && lineas[i].includes("|") && lineas[i].trim()) {
        filas.push(partirFila(lineas[i]));
        i++;
      }
      const cabeza = encabezados.map((c) => `<th>${celda(c)}</th>`).join("");
      const cuerpo = filas
        .map((f) => `<tr>${f.map((c) => `<td>${celda(c)}</td>`).join("")}</tr>`)
        .join("");
      salida.push(`<div class="tabla"><table><thead><tr>${cabeza}</tr></thead><tbody>${cuerpo}</tbody></table></div>`);
      continue;
    }

    // Cita: se acumulan las líneas seguidas que empiezan con >
    if (/^\s*&gt;/.test(linea)) {
      const cuerpo = [];
      while (i < lineas.length && /^\s*&gt;/.test(lineas[i])) {
        cuerpo.push(lineas[i].replace(/^\s*&gt;\s?/, ""));
        i++;
      }
      salida.push(`<blockquote>${enLinea(cuerpo.join(" ").trim())}</blockquote>`);
      continue;
    }

    // Lista de comprobación, viñetas o numerada.
    //
    // ⚠ La SANGRÍA importa, y pasarla por alto tiene una consecuencia que no se
    // ve al escribir: los sub-puntos se vuelven hermanos y **corren la
    // numeración del nivel de arriba**. En el índice del informe, cuatro
    // sub-puntos del §5 convertían el punto 11 en el 15, y el documento se
    // contradecía a sí mismo. Por eso aquí se arma una jerarquía de verdad.
    if (/^\s*([-*]|\d+\.)\s+/.test(linea)) {
      const pila = []; // { sangría, etiqueta }
      const abiertos = []; // ¿queda un <li> sin cerrar en ese nivel?
      const html = [];

      const abrirLista = (sangría, numerada) => {
        pila.push({ sangría, etiqueta: numerada ? "ol" : "ul" });
        abiertos.push(false);
        html.push(`<${pila[pila.length - 1].etiqueta}>`);
      };
      const cerrarLista = () => {
        if (abiertos.pop()) html.push("</li>");
        html.push(`</${pila.pop().etiqueta}>`);
      };

      while (i < lineas.length && /^\s*([-*]|\d+\.)\s+/.test(lineas[i])) {
        const m = lineas[i].match(/^(\s*)([-*]|\d+\.)\s+/);
        const sangría = m[1].replace(/\t/g, "  ").length;
        const numerada = /^\d+\./.test(m[2]);
        let texto = lineas[i].slice(m[0].length);
        let clase = "";
        const marca = texto.match(/^\[([ xX])\]\s+/);
        if (marca) {
          const marcado = marca[1].toLowerCase() === "x";
          clase = marcado ? ' class="hecho"' : ' class="por-hacer"';
          texto = `<span class="caja">${marcado ? "☑" : "☐"}</span>${texto.slice(marca[0].length)}`;
        }
        i++;
        // Líneas de continuación de un mismo punto
        while (
          i < lineas.length &&
          lineas[i].trim() &&
          !/^\s*([-*]|\d+\.)\s+/.test(lineas[i]) &&
          /^\s{2,}/.test(lineas[i])
        ) {
          texto += " " + lineas[i].trim();
          i++;
        }

        while (pila.length && sangría < pila[pila.length - 1].sangría) cerrarLista();
        if (!pila.length || sangría > pila[pila.length - 1].sangría) {
          // Sublista: va DENTRO del <li> de arriba, que queda abierto.
          abrirLista(sangría, numerada);
        } else if (abiertos[abiertos.length - 1]) {
          html.push("</li>");
          abiertos[abiertos.length - 1] = false;
        }
        html.push(`<li${clase}>${enLinea(texto)}`);
        abiertos[abiertos.length - 1] = true;
      }
      while (pila.length) cerrarLista();
      salida.push(html.join(""));
      continue;
    }

    // Párrafo
    const cuerpo = [];
    while (
      i < lineas.length &&
      lineas[i].trim() &&
      !/^\s*(#{1,6}\s|&gt;|```|---|\*\*\*|___)/.test(lineas[i]) &&
      !/^\s*([-*]|\d+\.)\s+/.test(lineas[i]) &&
      !(lineas[i].includes("|") && i + 1 < lineas.length && esSeparadorDeTabla(lineas[i + 1]))
    ) {
      cuerpo.push(lineas[i].trim());
      i++;
    }
    if (cuerpo.length) salida.push(`<p>${enLinea(cuerpo.join(" "))}</p>`);
  }

  return salida.join("\n");
}

// ------------------------------------------------------------------ Estilo

// Arial para lo impreso (ADR-010). Los rojos son los del manual municipal:
// heráldico #8A0007 para los títulos y el filete de las citas, luminoso
// #DB0032 solo como identidad en la portada. Ninguno entra en una tabla:
// ahí manda el negro profundo #1A1A1A sobre neutros (regla 14, ADR-011).
const ESTILO = `
  @page { size: A4; margin: 18mm 16mm 20mm 16mm; }
  * { box-sizing: border-box; }
  body {
    font-family: Arial, "Liberation Sans", Helvetica, sans-serif;
    font-size: 10.5pt; line-height: 1.5; color: #1A1A1A;
    margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  .portada { border-top: 6pt solid #8A0007; padding-top: 10pt; margin-bottom: 18pt; }
  .portada .marca { font-size: 8.5pt; letter-spacing: .12em; text-transform: uppercase; color: #8A0007; font-weight: bold; }
  .portada .fuente { font-size: 8.5pt; color: #6B6B6B; margin-top: 4pt; }

  h1 { font-size: 20pt; color: #8A0007; margin: 0 0 6pt; line-height: 1.2; }
  h2 { font-size: 14pt; color: #8A0007; margin: 20pt 0 6pt; padding-bottom: 3pt;
       border-bottom: 1pt solid #D8D5CE; break-after: avoid; page-break-after: avoid; }
  h3 { font-size: 11.5pt; margin: 14pt 0 5pt; break-after: avoid; page-break-after: avoid; }
  h4 { font-size: 10.5pt; margin: 12pt 0 4pt; break-after: avoid; page-break-after: avoid; }
  p { margin: 0 0 7pt; }
  hr { border: 0; border-top: 1pt solid #D8D5CE; margin: 14pt 0; }
  a { color: #1A1A1A; text-decoration: underline; }

  ul, ol { margin: 0 0 8pt; padding-left: 16pt; }
  li { margin-bottom: 3pt; }
  li.hecho, li.por-hacer { list-style: none; margin-left: -14pt; }
  li .caja { display: inline-block; width: 14pt; font-size: 11pt; }
  li.hecho { color: #4A4A4A; }

  .tabla { break-inside: auto; margin: 0 0 10pt; }
  table { width: 100%; border-collapse: collapse; font-size: 9pt; }
  th, td { border: .5pt solid #C9C5BC; padding: 4pt 5pt; text-align: left; vertical-align: top; }
  th { background: #EFEDE8; font-weight: bold; }
  tr { break-inside: avoid; page-break-inside: avoid; }
  thead { display: table-header-group; }
  td .vacio { color: #9A968E; }

  blockquote {
    margin: 0 0 10pt; padding: 7pt 10pt;
    background: #F5F3EF; border-left: 3pt solid #8A0007;
    break-inside: avoid; page-break-inside: avoid;
  }
  blockquote p:last-child { margin-bottom: 0; }

  /* Las capturas son evidencia (rúbrica §2): entran completas y con su pie,
     y no se parten entre dos páginas. */
  figure { margin: 12pt 0; page-break-inside: avoid; }
  /* El alto también se acota: A4 con estos márgenes deja 259 mm útiles, y una
     captura de página completa puede medir varias veces eso. Sin este tope la
     imagen desborda y el visor la recorta sin avisar. */
  figure img { max-width: 100%; max-height: 235mm; border: .75pt solid #D8D5CE; }
  /* Captura muy alta: se muestra su parte superior, a ancho completo. */
  figure.recorte .marco { display: block; max-height: 120mm; overflow: hidden;
    border: .75pt solid #D8D5CE; }
  figure.recorte .marco img { width: 100%; max-height: none; border: 0; display: block; }
  figcaption { font-size: 8.5pt; color: #6B6B6B; margin-top: 4pt; }

  code { font-family: Consolas, "Courier New", monospace; font-size: 9pt; background: #EFEDE8; padding: .5pt 3pt; }
  pre { background: #F5F3EF; border: .5pt solid #D8D5CE; padding: 7pt 9pt; margin: 0 0 10pt;
        break-inside: avoid; page-break-inside: avoid; }
  pre code { background: none; padding: 0; font-size: 8.5pt; line-height: 1.4; white-space: pre-wrap; }
`;

// -------------------------------------------------------------------- Main

const argumentos = process.argv.slice(2);
const opciones = argumentos.filter((a) => a.startsWith("--"));
const rutas = argumentos.filter((a) => !a.startsWith("--"));

if (!rutas[0]) {
  console.error("Uso: node scripts/pdf.mjs <entrada.md> [salida.pdf] [--conservar-html]");
  process.exit(1);
}

const entrada = resolve(aquí, "..", rutas[0]);
const salida = rutas[1] ? resolve(aquí, "..", rutas[1]) : entrada.replace(/\.md$/i, ".pdf");
// Desde aquí los enlaces relativos del documento se saben resolver.
baseDelDocumento = dirname(entrada);

const markdown = await readFile(entrada, "utf8");

// El primer # del documento es el título; la línea siguiente en negrita, si la
// hay, es la ficha (para quién, cuándo, cuánto vale).
const tituloM = markdown.match(/^#\s+(.+)$/m);
const titulo = tituloM ? tituloM[1].replace(/[*`]/g, "").trim() : basename(entrada, ".md");
const cuerpo = convertir(markdown.replace(/^#\s+.+$/m, "").trimStart());

const html = `<!doctype html>
<html lang="es"><head><meta charset="utf-8">
<title>${escapar(titulo)}</title>
<style>${ESTILO}</style></head>
<body>
  <div class="portada">
    <div class="marca">SGR · Sistema de Gestión de Resultados · Origami SpA</div>
    <h1>${escapar(titulo)}</h1>
    <div class="fuente">Documento generado desde <code>${escapar(basename(entrada))}</code> del repositorio</div>
  </div>
  ${cuerpo}
</body></html>`;

const htmlTemporal = salida.replace(/\.pdf$/i, ".tmp.html");
await mkdir(dirname(salida), { recursive: true });
await writeFile(htmlTemporal, html, "utf8");

const navegador = await chromium.launch({ channel: "msedge", headless: true });
try {
  const pagina = await navegador.newPage();
  await pagina.goto(pathToFileURL(htmlTemporal).href, { waitUntil: "load" });
  await pagina.pdf({
    path: salida,
    format: "A4",
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: "<div></div>",
    footerTemplate: `<div style="width:100%;font-family:Arial,sans-serif;font-size:7.5pt;color:#6B6B6B;padding:0 16mm;display:flex;justify-content:space-between;">
      <span>${escapar(titulo)}</span><span class="pageNumber"></span></div>`,
    margin: { top: "18mm", right: "16mm", bottom: "20mm", left: "16mm" },
  });
} finally {
  await navegador.close();
}

// --conservar-html deja el intermedio para poder mirarlo en el navegador
// cuando algo se ve raro en el PDF.
if (!opciones.includes("--conservar-html")) {
  const { rm } = await import("node:fs/promises");
  await rm(htmlTemporal, { force: true });
}

console.log(`PDF generado: ${salida}`);
