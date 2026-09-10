// Verificación de coherencia de los artefactos de la entrega del 15 de
// septiembre. La rúbrica evalúa la trazabilidad entre requerimientos, casos de
// uso, clases, entidades y pantallas como CRITERIO TRANSVERSAL: un diagrama
// correcto pero incoherente con los demás pierde puntos en varios criterios a
// la vez. Comprobarlo a ojo, cada vez que cambia un artefacto, no escala.
//
//   npm run verificar:entrega
//
// No toca la red y no modifica nada: lee docs/entrega/ e informa.
// Los bloques del criterio 4 en adelante se activan solos cuando el artefacto
// que les toca existe; mientras no exista, lo dicen y no fallan.
import { readFileSync, existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const entrega = path.join(raiz, "docs/entrega");

let total = 0;
let fallas = 0;
function verificar(nombre, ok, detalle = "") {
  total += 1;
  if (!ok) fallas += 1;
  const marca = ok ? "  ok  " : "FALLA ";
  console.log(`${marca} ${nombre}${detalle && !ok ? `  → ${detalle}` : ""}`);
}
function titulo(texto) {
  console.log(`\n── ${texto} ${"─".repeat(Math.max(0, 58 - texto.length))}`);
}
function leer(relativo) {
  return readFileSync(path.join(entrega, relativo), "utf8");
}

// Una fila de tabla markdown en sus celdas, sin los pipes de los extremos.
function celdas(linea) {
  return linea
    .trim()
    .replace(/^\||\|$/g, "")
    .split("|")
    .map((c) => c.trim());
}

const requerimientos = leer("requerimientos.md");
const general = leer("casos-uso-general.md");
const pumlGeneral = leer("puml/09-casos-uso-general.puml");
const pumlExtensiones = leer("puml/10-casos-uso-extensiones.puml");

// ---------------------------------------------------------------------------
// 1. Trazabilidad RF ↔ CU, en los dos sentidos
//
// La tabla del criterio 2 dice, para cada RF, qué caso de uso lo cumple. La
// del criterio 3 dice, para cada caso, qué RF cubre. Tienen que decir lo
// mismo: si una cambia y la otra no, el criterio transversal se cae.
// ---------------------------------------------------------------------------
titulo("Trazabilidad RF ↔ CU");

const rfACu = new Map();
for (const linea of requerimientos.split("\n")) {
  if (!/^\|\s*RF-\d{3}\s*\|/.test(linea)) continue;
  const c = celdas(linea);
  if (c.length < 7) continue; // otras tablas nombran RF sin trazabilidad
  rfACu.set(c[0], new Set(c[5].match(/CU-[0-9IE]\d?/g) ?? []));
}

const cuARf = new Map();
for (const linea of general.split("\n")) {
  if (!/^\|\s*CU-\d{2}\s*\|/.test(linea)) continue;
  const c = celdas(linea);
  if (c.length < 5) continue;
  cuARf.set(c[0], new Set(c[3].match(/RF-\d{3}/g) ?? []));
}

verificar("los 38 RF oficiales están en la tabla del criterio 2", rfACu.size === 38, `son ${rfACu.size}`);
verificar("los 12 casos de uso están en la tabla del criterio 3", cuARf.size === 12, `son ${cuARf.size}`);

const sinConfirmar = [];
for (const [cu, rfs] of cuARf) {
  for (const rf of rfs) if (!rfACu.get(rf)?.has(cu)) sinConfirmar.push(`${cu}→${rf}`);
}
verificar(
  "cada RF que cita un caso de uso, el criterio 2 lo confirma",
  sinConfirmar.length === 0,
  sinConfirmar.join(", ")
);

const sinDevolver = [];
for (const [rf, cus] of rfACu) {
  for (const cu of cus) {
    if (!/^CU-\d{2}$/.test(cu)) continue; // los CU-I y CU-E no están en esa tabla
    if (!cuARf.get(cu)?.has(rf)) sinDevolver.push(`${rf}→${cu}`);
  }
}
verificar(
  "cada caso de uso que traza un RF, el criterio 3 lo confirma",
  sinDevolver.length === 0,
  sinDevolver.join(", ")
);

// ---------------------------------------------------------------------------
// 2. Los diagramas dicen lo mismo que el documento
// ---------------------------------------------------------------------------
titulo("Diagramas ↔ documento");

const dibujados = new Set(pumlGeneral.match(/CU-\d{2}/g) ?? []);
const tabulados = new Set(cuARf.keys());
const faltan = [...tabulados].filter((cu) => !dibujados.has(cu));
const sobran = [...dibujados].filter((cu) => !tabulados.has(cu));
verificar("todo caso de uso del documento está dibujado", faltan.length === 0, faltan.join(", "));
verificar("el diagrama no dibuja ninguno que el documento no liste", sobran.length === 0, sobran.join(", "));

// Solo cuentan las DECLARACIONES, no las menciones: el general nombra CU-I3
// dentro de una nota, justamente para explicar que no lo dibuja.
const incluidos = new Set([...pumlGeneral.matchAll(/usecase "(CU-I\d)/g)].map((m) => m[1]));
verificar("CU-I1 y CU-I2 se dibujan en el general", incluidos.size === 2 && incluidos.has("CU-I1") && incluidos.has("CU-I2"), [...incluidos].join(", "));
verificar("CU-I3 no se dibuja, porque lo incluye casi todo", !incluidos.has("CU-I3"));
verificar("...y el general explica por qué, en una nota", pumlGeneral.includes("CU-I3"));

const extensiones = new Set([...pumlExtensiones.matchAll(/usecase "(CU-E\d)/g)].map((m) => m[1]));
verificar("los seis «extend» están declarados", extensiones.size === 6, `son ${extensiones.size}`);

const flechasExtend = pumlExtensiones.match(/<<extend>>/g) ?? [];
const condiciones = pumlExtensiones.match(/\[[^\]]+\]/g) ?? [];
verificar(
  "cada «extend» lleva su condición entre corchetes",
  flechasExtend.length === condiciones.length,
  `${flechasExtend.length} flechas y ${condiciones.length} condiciones`
);

const basesExtend = new Set(pumlExtensiones.match(/CU-\d{2}/g) ?? []);
const basesHuerfanas = [...basesExtend].filter((cu) => !dibujados.has(cu));
verificar("todo caso base de una extensión existe en el general", basesHuerfanas.length === 0, basesHuerfanas.join(", "));

// El diagrama de extensiones se lee solo si dice de qué lado va la flecha.
verificar(
  "el diagrama de extensiones explica la dirección de la flecha",
  /del caso de extensión al caso base/.test(pumlExtensiones)
);

// ---------------------------------------------------------------------------
// 3. Los seis actores, con el mismo nombre en todas partes
// ---------------------------------------------------------------------------
titulo("Actores");

// Nombre en los documentos → rol técnico en el código. La equivalencia no es
// decorativa: "supervisor" se dice Coordinador y "gerente" se dice Delegado,
// y confundirlas rompe la coherencia con el diagrama de clases y el DER.
const ACTORES = [
  ["Administrador", "admin"],
  ["Coordinador", "supervisor"],
  ["Delegado", "gerente"],
  ["Funcionario", "usuario"],
  ["Verificador", "verificador"],
  ["Usuario de consulta", "consulta"],
];
for (const [actor, rol] of ACTORES) {
  verificar(
    `«${actor}» aparece en los dos documentos y en el diagrama`,
    requerimientos.includes(actor) && general.includes(actor) && pumlGeneral.includes(actor.split(" ")[0])
  );
  verificar(`«${actor}» declara su rol técnico \`${rol}\``, general.includes(`\`${rol}\``));
}

// ---------------------------------------------------------------------------
// 4. Cada caso de uso tiene su pantalla, y la pantalla existe (decisión D-2)
// ---------------------------------------------------------------------------
titulo("Pantallas del mockup");

const pantallas = new Set([...general.matchAll(/\.\.\/mockups\/([\w-]+\.png)/g)].map((m) => m[1]));
for (const png of [...pantallas].sort()) {
  verificar(`existe docs/mockups/${png}`, existsSync(path.join(raiz, "docs/mockups", png)));
}
const sinPantalla = [];
for (const linea of general.split("\n")) {
  if (!/^\|\s*CU-\d{2}\s*\|/.test(linea)) continue;
  const c = celdas(linea);
  if (c.length >= 5 && !/mockups\//.test(c[4])) sinPantalla.push(c[0]);
}
verificar("ningún caso de uso queda sin pantalla (D-2)", sinPantalla.length === 0, sinPantalla.join(", "));

// ---------------------------------------------------------------------------
// 5. La convención de puml/_estilo.md, en los diez diagramas
// ---------------------------------------------------------------------------
titulo("Convención de los diagramas");

const pumls = readdirSync(path.join(entrega, "puml")).filter((f) => f.endsWith(".puml")).sort();
const indice = leer("puml/README.md");
for (const archivo of pumls) {
  const fuente = leer(`puml/${archivo}`);
  const png = archivo.replace(/\.puml$/, ".png");
  verificar(`${archivo} usa Arial (ADR-010)`, /skinparam defaultFontName Arial/.test(fuente));
  // Regla 14: los diagramas son zona de datos y el rojo institucional no entra.
  verificar(`${archivo} no usa el rojo institucional ni el heráldico`, !/DB0032|8A0007/i.test(fuente));
  verificar(`${archivo} tiene su PNG generado`, existsSync(path.join(entrega, "puml", png)));
  verificar(`${archivo} está en el índice de puml/README.md`, indice.includes(archivo));
}

// ---------------------------------------------------------------------------
// 6. Criterio 4 — las doce fichas. Se activa cuando el artefacto existe.
// ---------------------------------------------------------------------------
titulo("Criterio 4 · fichas de los casos de uso");

const rutaFichas = path.join(entrega, "casos-uso-detalle.md");
if (!existsSync(rutaFichas)) {
  console.log("  ··   todavía no existe casos-uso-detalle.md; nada que comprobar");
} else {
  const fichas = readFileSync(rutaFichas, "utf8");
  // La rúbrica §5.4 fija la ficha mínima: doce campos, ninguno opcional.
  const CAMPOS = [
    "Objetivo",
    "Actor principal",
    "Actores secundarios",
    "Precondiciones",
    "Disparador",
    "Flujo principal",
    "Flujos alternativos",
    "Excepciones",
    "Postcondiciones",
  ];
  // Cada ficha empieza en su encabezado y termina donde empieza la siguiente.
  const encabezados = [...fichas.matchAll(/^##+\s*(CU-\d{2})\b.*$/gm)];
  verificar(
    "hay 12 fichas, y la rúbrica exige 10 como mínimo",
    encabezados.length === 12,
    `son ${encabezados.length}`
  );
  for (const [i, m] of encabezados.entries()) {
    const cu = m[1];
    const desde = m.index;
    const hasta = i + 1 < encabezados.length ? encabezados[i + 1].index : fichas.length;
    const cuerpo = fichas.slice(desde, hasta);
    const ausentes = CAMPOS.filter((campo) => !cuerpo.includes(campo));
    verificar(`${cu} trae los campos de la rúbrica §5.4`, ausentes.length === 0, `faltan: ${ausentes.join(", ")}`);
    verificar(`${cu} numera su flujo principal`, /^\s*\|?\s*1\.\s/m.test(cuerpo));
    // La coherencia que cuesta puntos: la ficha y el caso de uso general
    // tienen que citar los mismos RF.
    const rfsFicha = new Set(cuerpo.match(/RF-\d{3}/g) ?? []);
    const perdidos = [...(cuARf.get(cu) ?? [])].filter((rf) => !rfsFicha.has(rf));
    verificar(`${cu} cita los mismos RF que el caso de uso general`, perdidos.length === 0, `no cita ${perdidos.join(", ")}`);
    verificar(`${cu} tiene su diagrama en puml/`, pumls.some((f) => f.includes(cu.toLowerCase())));
  }
}

// ---------------------------------------------------------------------------
// 7. Criterio 5 — el diagrama de clases contra el esquema real.
//
// Es la comprobación que evita el error más caro de este criterio: entregar
// un diagrama de clases que describe un sistema que no es el nuestro. Los
// nombres se comparan contra backend/prisma/schema.prisma, que es también la
// fuente del DER, así que de paso garantiza la coherencia clase ↔ tabla.
// ---------------------------------------------------------------------------
titulo("Criterio 5 · clases ↔ esquema");

const rutaClases = path.join(entrega, "clases.md");
if (!existsSync(rutaClases)) {
  console.log("  ··   todavía no existe clases.md; nada que comprobar");
} else {
  const clasesDoc = readFileSync(rutaClases, "utf8");
  const schema = readFileSync(path.join(raiz, "backend/prisma/schema.prisma"), "utf8");

  const modelos = new Set([...schema.matchAll(/^model\s+(\w+)\s*\{/gm)].map((m) => m[1]));
  const tablas = new Set([...schema.matchAll(/@@map\("([^"]+)"\)/g)].map((m) => m[1]));

  // Las clases dibujadas, de los cinco .puml del criterio 5. Se excluyen los
  // servicios y las clases de arquitectura del panorama: no son entidades.
  const dibujadas = new Set();
  for (const archivo of pumls.filter((f) => /^2[3-7]-clases/.test(f))) {
    for (const m of leer(`puml/${archivo}`).matchAll(/^\s*class\s+(\w+)\s*<</gm)) {
      if (!/^Servicio/.test(m[1])) dibujadas.add(m[1]);
    }
  }
  // El panorama usa clases genéricas para explicar las capas, no entidades.
  for (const generica of ["Pantalla", "Ruta", "Middleware", "Servicio", "Entidad"]) {
    dibujadas.delete(generica);
  }

  const inventadas = [...dibujadas].filter((c) => !modelos.has(c));
  verificar("ninguna clase dibujada falta en schema.prisma", inventadas.length === 0, inventadas.join(", "));

  const nodibujadas = [...modelos].filter((m) => !dibujadas.has(m));
  verificar("ningún modelo del esquema queda sin dibujar", nodibujadas.length === 0, nodibujadas.join(", "));

  verificar(
    `clases.md nombra las ${modelos.size} clases del esquema`,
    [...modelos].every((m) => clasesDoc.includes(m)),
    [...modelos].filter((m) => !clasesDoc.includes(m)).join(", ")
  );
  verificar(
    `clases.md nombra las ${tablas.size} tablas del esquema`,
    [...tablas].every((t) => clasesDoc.includes(t)),
    [...tablas].filter((t) => !clasesDoc.includes(t)).join(", ")
  );
  verificar("hay una clase por tabla y una tabla por clase", modelos.size === tablas.size, `${modelos.size} vs ${tablas.size}`);

  // La rúbrica §6.1 pide la visibilidad como + - #, y PlantUML la dibuja con
  // iconos de color salvo que se le diga lo contrario.
  for (const archivo of pumls.filter((f) => /^2[3-7]-clases/.test(f))) {
    verificar(`${archivo} muestra la visibilidad como + - #`, /classAttributeIconSize 0/.test(leer(`puml/${archivo}`)));
  }

  // Los servicios dibujados tienen que existir como archivo en el backend.
  const servicios = new Set();
  for (const m of leer("puml/27-clases-servicios.puml").matchAll(/^\s*class\s+Servicio(\w+)\s*<</gm)) {
    servicios.add(m[1]);
  }
  const archivosServicio = readdirSync(path.join(raiz, "backend/src/services")).map((f) => f.replace(/\.ts$/, ""));
  const enKebab = (nombre) => nombre.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
  const sinArchivo = [...servicios].filter((s) => !archivosServicio.includes(enKebab(s)));
  verificar("cada servicio dibujado existe en backend/src/services", sinArchivo.length === 0, sinArchivo.join(", "));
  verificar(
    `están los ${archivosServicio.length} servicios del backend`,
    servicios.size === archivosServicio.length,
    `dibujados ${servicios.size}`
  );
}

console.log(`\n${total - fallas}/${total} verificaciones de la entrega en verde`);
process.exit(fallas ? 1 : 0);
