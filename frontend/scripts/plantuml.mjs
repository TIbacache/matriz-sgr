// Prepara los diagramas PlantUML de una carpeta: comprueba que compilan,
// deja el enlace directo al editor de plantuml.com y, con --png, descarga
// la imagen para adjuntarla en Planner y verla en GitHub.
//
//   node scripts/plantuml.mjs ../docs/entrega/puml
//   node scripts/plantuml.mjs ../docs/entrega/puml --png
//
// El enlace se calcula localmente (deflate + el base64 propio de PlantUML),
// así que sin --png no toca la red. Con --png sí: usa el servidor público,
// que es gratuito (regla 13). Los diagramas no llevan datos personales.

import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { deflateRawSync } from "node:zlib";

const SERVIDOR = "https://www.plantuml.com/plantuml";

// El alfabeto propio de PlantUML: 0-9, A-Z, a-z, - y _
function seis(b) {
  if (b < 10) return String.fromCharCode(48 + b);
  b -= 10;
  if (b < 26) return String.fromCharCode(65 + b);
  b -= 26;
  if (b < 26) return String.fromCharCode(97 + b);
  b -= 26;
  return b === 0 ? "-" : b === 1 ? "_" : "?";
}

function tresBytes(b1, b2, b3) {
  return (
    seis((b1 >> 2) & 0x3f) +
    seis((((b1 & 0x3) << 4) | (b2 >> 4)) & 0x3f) +
    seis((((b2 & 0xf) << 2) | (b3 >> 6)) & 0x3f) +
    seis(b3 & 0x3f)
  );
}

function codificar(texto) {
  const datos = deflateRawSync(Buffer.from(texto, "utf8"), { level: 9 });
  let salida = "";
  for (let i = 0; i < datos.length; i += 3) {
    salida += tresBytes(datos[i], i + 1 < datos.length ? datos[i + 1] : 0, i + 2 < datos.length ? datos[i + 2] : 0);
  }
  return salida;
}

const carpeta = path.resolve(process.argv[2] ?? "../docs/entrega/puml");
const bajarPng = process.argv.includes("--png");

const archivos = (await readdir(carpeta)).filter((f) => f.endsWith(".puml")).sort();
if (!archivos.length) {
  console.error(`No hay archivos .puml en ${carpeta}`);
  process.exit(1);
}

const filas = [];
let fallos = 0;

for (const archivo of archivos) {
  const fuente = await readFile(path.join(carpeta, archivo), "utf8");
  const titulo = (/^title\s+(.+)$/m.exec(fuente)?.[1] ?? archivo.replace(/\.puml$/, "")).trim();
  const clave = codificar(fuente);
  const editor = `${SERVIDOR}/uml/${clave}`;
  const png = archivo.replace(/\.puml$/, ".png");

  if (bajarPng) {
    const r = await fetch(`${SERVIDOR}/png/${clave}`);
    // El servidor devuelve una imagen con el error dibujado, pero lo anuncia
    // en una cabecera: sin mirarla, un diagrama roto se guardaría igual.
    const error = r.headers.get("x-plantuml-diagram-error");
    if (error || !r.ok) {
      fallos++;
      const linea = r.headers.get("x-plantuml-diagram-error-line");
      console.log(`FALLA  ${archivo}${linea ? ` (línea ${linea})` : ""}: ${error ?? `HTTP ${r.status}`}`);
      continue;
    }
    await writeFile(path.join(carpeta, png), Buffer.from(await r.arrayBuffer()));
    console.log(`ok     ${archivo} -> ${png}`);
  } else {
    console.log(`enlace ${archivo}`);
  }

  filas.push({ archivo, titulo, editor, png });
}

const indice =
  `# Diagramas PlantUML de la entrega\n\n` +
  `**La fuente es el \`.puml\`.** Los PNG se generan desde él y no se editan a mano.\n\n` +
  `Para verlos o retocarlos: abre el enlace, que lleva el diagrama ya cargado en el editor de ` +
  `[plantuml.com](https://plantuml.com/). También se puede pegar el contenido del \`.puml\` a mano.\n\n` +
  "```powershell\n" +
  `cd frontend\n` +
  `npm run puml -- ../docs/entrega/puml          # comprueba y deja los enlaces\n` +
  `npm run puml -- ../docs/entrega/puml --png    # además descarga los PNG\n` +
  "```\n\n" +
  filas
    .map(
      (f) =>
        `## ${f.titulo}\n\n` +
        `Fuente: [\`${f.archivo}\`](${f.archivo}) · [Abrir en plantuml.com](${f.editor})\n\n` +
        `![${f.titulo}](${f.png})\n`
    )
    .join("\n");

await writeFile(path.join(carpeta, "README.md"), indice, "utf8");

console.log(`\n${filas.length}/${archivos.length} diagramas listos en ${carpeta}`);
if (fallos) {
  console.log(`${fallos} con error de sintaxis.`);
  process.exit(1);
}
