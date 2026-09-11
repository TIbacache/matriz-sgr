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

// Los ESCENARIOS ALTERNATIVOS (rúbrica §6): cada «include» y cada «extend»
// tiene su casilla en el mapa del §8.1, y esa casilla apunta a algo que existe.
//
// El §8.1 se aísla del resto del documento a propósito: sus filas empiezan
// igual que las de §7 y §8 —`| **CU-E1** |`— y contarlas juntas daría por
// mapeado un escenario solo porque está declarado.
const iMapa = general.indexOf("## 8.1");
verificar("casos-uso-general.md trae el mapa CU → mockup (§8.1)", iMapa > 0);
if (iMapa > 0) {
  const finMapa = general.indexOf("\n## ", iMapa + 1);
  const mapa = general.slice(iMapa, finMapa < 0 ? undefined : finMapa);
  const antes = general.slice(0, iMapa);
  const fila = /^\|\s*\*\*(CU-[IE]\d)\*\*\s*\|/gm;

  const declarados = [...new Set([...antes.matchAll(fila)].map((m) => m[1]))].sort();
  verificar(
    "§7 y §8 declaran los 3 «include» y los 6 «extend»",
    declarados.length === 9,
    `son ${declarados.length}: ${declarados.join(", ")}`
  );

  // Un escenario puede ocupar VARIAS filas: CU-E5 se captura dos veces, en la
  // ficha del vecino y en el control de actividad. Las dos tienen que existir.
  const enMapa = new Map();
  for (const linea of mapa.split("\n")) {
    const m = /^\|\s*\*\*(CU-[IE]\d)\*\*\s*\|/.exec(linea);
    if (m) enMapa.set(m[1], [...(enMapa.get(m[1]) ?? []), linea]);
  }
  // La herramienta que produce las capturas, para cerrar el círculo: una
  // casilla que nombra un PNG que el script no genera se queda sin fuente en
  // cuanto alguien vuelva a correrlo.
  const herramienta = readFileSync(path.join(raiz, "frontend/scripts/mockups.mjs"), "utf8");

  for (const cu of declarados) {
    const filas = enMapa.get(cu) ?? [];
    verificar(`${cu} tiene su casilla en el mapa CU → mockup`, filas.length > 0);
    for (const linea of filas) {
      const png = /\.\.\/mockups\/([\w-]+)\.png/.exec(linea);
      if (png) {
        verificar(`${cu} → docs/mockups/${png[1]}.png existe`, existsSync(path.join(raiz, "docs/mockups", `${png[1]}.png`)));
        verificar(`${cu} → mockups.mjs genera ${png[1]}`, herramienta.includes(`"${png[1]}"`));
      } else {
        // Sin imagen SOLO se admite con el motivo escrito. Es CU-I3: RF-036
        // pide trazabilidad consultable y la pantalla no está construida (D-c).
        verificar(`${cu} sin mockup declara por qué (desvío D-c)`, /desv[íi]o D-c|pendiente/i.test(linea), linea.slice(0, 90));
      }
    }
  }
  // Y al revés: cada escenario que el script produce tiene que estar en el mapa.
  const producidos = [...herramienta.matchAll(/archivo:\s*"(\d\d-alt-[\w-]+)"/g)].map((m) => m[1]);
  verificar("mockups.mjs produce escenarios alternativos", producidos.length > 0, "ninguno");
  for (const archivo of producidos) {
    verificar(`${archivo} está en el mapa CU → mockup`, mapa.includes(archivo));
  }
}

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

// ---------------------------------------------------------------------------
// 8. Criterio 6 — el DER contra el esquema real y contra las migraciones.
//
// La rúbrica valida a mano que «toda FK representada en el DER exista en el
// script SQL». La otra mitad del trato es que toda FK del DER exista en el
// SISTEMA: un DER con una clave foránea inventada es peor que uno incompleto,
// porque el script la copiaría y nadie lo notaría. Las FK se extraen de las
// sentencias de backend/prisma/migrations, no del texto del documento.
// ---------------------------------------------------------------------------
titulo("Criterio 6 · DER ↔ esquema ↔ migraciones");

const rutaDer = path.join(entrega, "der.md");
if (!existsSync(rutaDer)) {
  console.log("  ··   todavía no existe der.md; nada que comprobar");
} else {
  const der = readFileSync(rutaDer, "utf8");
  const schemaDer = readFileSync(path.join(raiz, "backend/prisma/schema.prisma"), "utf8");
  const tablasEsquema = new Set([...schemaDer.matchAll(/@@map\("([^"]+)"\)/g)].map((m) => m[1]));

  verificar(
    `der.md nombra las ${tablasEsquema.size} tablas del esquema`,
    [...tablasEsquema].every((t) => der.includes(t)),
    [...tablasEsquema].filter((t) => !der.includes(t)).join(", ")
  );

  // Las tablas dibujadas en los cinco .puml del DER.
  const pumlsDer = pumls.filter((f) => /^\d+-der-/.test(f));
  verificar("están los cinco diagramas del DER", pumlsDer.length === 5, `son ${pumlsDer.length}`);

  const dibujadasDer = new Set();
  const detalladas = new Set();
  for (const archivo of pumlsDer) {
    for (const m of leer(`puml/${archivo}`).matchAll(/^entity\s+"(\w+)"\s+as\s+\w+(.*)$/gm)) {
      dibujadasDer.add(m[1]);
      // Una tabla reducida a su `id` con el estereotipo «en NN-der-...» es una
      // referencia a otro diagrama, no el detalle de esa tabla. El mapa general
      // tampoco detalla: muestra solo las claves.
      if (!/<<en \d+-der-/.test(m[2]) && archivo !== "28-der-general.puml") detalladas.add(m[1]);
    }
  }
  const inventadasDer = [...dibujadasDer].filter((t) => !tablasEsquema.has(t));
  verificar("ninguna tabla dibujada en el DER falta en schema.prisma", inventadasDer.length === 0, inventadasDer.join(", "));

  const sinDibujar = [...tablasEsquema].filter((t) => !dibujadasDer.has(t));
  verificar("ninguna tabla del esquema queda fuera del DER", sinDibujar.length === 0, sinDibujar.join(", "));

  const sinDetalle = [...tablasEsquema].filter((t) => !detalladas.has(t));
  verificar("cada tabla trae sus columnas en un diagrama de detalle", sinDetalle.length === 0, sinDetalle.join(", "));

  // Las claves foráneas reales, tomadas de las migraciones. Quedan fuera las de
  // `metas`, la tabla del modelo v1 que eliminó el Bloque C: ya no está en el
  // esquema, así que el filtro por `tablasEsquema` la descarta sola.
  const dirMigraciones = path.join(raiz, "backend/prisma/migrations");
  let sqlMigraciones = "";
  for (const d of readdirSync(dirMigraciones)) {
    const f = path.join(dirMigraciones, d, "migration.sql");
    if (existsSync(f)) sqlMigraciones += `${readFileSync(f, "utf8")}\n`;
  }
  const fkReales = new Set();
  // Ojo: `ON DELETE CASCADE ON UPDATE CASCADE`. La acción se enumera en vez de
  // leerse como «una o dos palabras», o se lleva puesto el `ON` del `ON UPDATE`.
  const patronFk = /ALTER TABLE "(\w+)" ADD CONSTRAINT "\w+" FOREIGN KEY \("(\w+)"\) REFERENCES "(\w+)"\("\w+"\) ON DELETE (CASCADE|RESTRICT|SET NULL|SET DEFAULT|NO ACTION)/g;
  for (const m of sqlMigraciones.matchAll(patronFk)) {
    if (!tablasEsquema.has(m[1])) continue;
    fkReales.add(`${m[1]}.${m[2]}->${m[3]}:${m[4]}`);
  }
  verificar("las migraciones declaran 52 claves foráneas vigentes", fkReales.size === 52, `son ${fkReales.size}`);

  // Las filas de la tabla de §9. La primera celda se hereda cuando va vacía,
  // que es como se escribe una tabla agrupada por tabla hija.
  const limpiar = (x) => x.replace(/[`*]/g, "").trim();
  const fkDocumentadas = new Set();
  let tablaActual = "";
  for (const linea of der.split("\n")) {
    if (!/^\|[^|]*\|\s*`\w+`\s*\|\s*`\w+`\s*\|/.test(linea)) continue;
    const c = celdas(linea);
    if (c.length !== 4) continue;
    const accion = limpiar(c[3]).toUpperCase();
    if (!/^(CASCADE|RESTRICT|SET NULL)$/.test(accion)) continue;
    if (limpiar(c[0])) tablaActual = limpiar(c[0]);
    fkDocumentadas.add(`${tablaActual}.${limpiar(c[1])}->${limpiar(c[2])}:${accion}`);
  }
  const sobranFk = [...fkDocumentadas].filter((f) => !fkReales.has(f));
  const faltanFk = [...fkReales].filter((f) => !fkDocumentadas.has(f));
  verificar("der.md documenta las 52 claves foráneas", fkDocumentadas.size === 52, `documenta ${fkDocumentadas.size}`);
  verificar("ninguna clave foránea del DER está inventada", sobranFk.length === 0, sobranFk.join(", "));
  verificar("ninguna clave foránea real queda sin documentar", faltanFk.length === 0, faltanFk.join(", "));

  // Los enumerados del esquema, con su nombre.
  const enums = [...schemaDer.matchAll(/^enum\s+(\w+)\s*\{/gm)].map((m) => m[1]);
  verificar(
    `der.md nombra los ${enums.length} enumerados`,
    enums.every((e) => der.includes(e)),
    enums.filter((e) => !der.includes(e)).join(", ")
  );

  // Las cuatro columnas que parecen clave foránea y no lo son. Si alguien
  // "arregla" el DER agregándoselas, el script las copiaría y el modelo
  // entregado dejaría de ser el del sistema.
  for (const columna of ["comentarios.entidad_id", "auditoria.entidad_id", "auditoria.usuario_id", "periodos.cerrado_por_id"]) {
    const [tabla, campo] = columna.split(".");
    const tieneFk = [...fkReales].some((f) => f.startsWith(`${tabla}.${campo}->`));
    verificar(`${columna} sigue siendo una referencia sin FK`, !tieneFk && der.includes(campo));
  }

  // El modelo v1 se eliminó: nombrarlo como tabla vigente sería incoherente.
  verificar("el DER no resucita la tabla `metas` del modelo v1", !/\|\s*`metas`\s*\|/.test(der));
}

// ---------------------------------------------------------------------------
// 9. Criterio 7 — el script SQL contra el esquema real.
//
// La rúbrica lo dice literal: «toda FK representada en el DER debe existir en
// el script SQL. Del mismo modo, las tablas creadas en el script deben
// corresponder al modelo presentado en el informe». Eso se comprueba a mano en
// la evaluación; acá se comprueba sola, y además en los dos sentidos.
//
// Lo que NO comprueba: que el script se ejecute. Eso necesita un MySQL
// corriendo, y este verificador no toca la red ni levanta servicios. La
// ejecución está documentada en script-sql.md §6, con su evidencia.
// ---------------------------------------------------------------------------
titulo("Criterio 7 · script SQL ↔ esquema");

const rutaSql = path.join(entrega, "sgr-mysql.sql");
if (!existsSync(rutaSql)) {
  console.log("  ··   todavía no existe sgr-mysql.sql; nada que comprobar");
} else {
  const sqlEntrega = readFileSync(rutaSql, "utf8");
  const schemaSql = readFileSync(path.join(raiz, "backend/prisma/schema.prisma"), "utf8");

  // --- El esquema real: tabla → columnas -----------------------------------
  const modelos = new Set([...schemaSql.matchAll(/^model\s+(\w+)\s*\{/gm)].map((m) => m[1]));
  const columnasEsquema = new Map();
  for (const bloque of schemaSql.matchAll(/^model\s+(\w+)\s*\{([\s\S]*?)^\}/gm)) {
    const tabla = /@@map\("([^"]+)"\)/.exec(bloque[2])?.[1];
    if (!tabla) continue;
    const columnas = new Set();
    for (const linea of bloque[2].split("\n")) {
      const m = /^\s{2}(\w+)\s+(\S+)/.exec(linea);
      if (!m || linea.trim().startsWith("@@") || linea.trim().startsWith("//")) continue;
      // Los campos de relación no son columnas: su tipo es otro modelo.
      if (modelos.has(m[2].replace(/[?[\]]/g, ""))) continue;
      columnas.add(/@map\("([^"]+)"\)/.exec(linea)?.[1] ?? m[1]);
    }
    columnasEsquema.set(tabla, columnas);
  }

  // --- El script: tabla → columnas, en su orden de creación ----------------
  const ordenCreacion = [];
  const columnasSql = new Map();
  const palabrasClave = /^(CONSTRAINT|INDEX|KEY|PRIMARY|UNIQUE|FOREIGN|CHECK)$/i;
  for (const m of sqlEntrega.matchAll(/CREATE TABLE (\w+) \(([\s\S]*?)\n\)/g)) {
    ordenCreacion.push(m[1]);
    const columnas = new Set();
    for (const linea of m[2].split("\n")) {
      // Exactamente dos espacios de sangría: así las continuaciones de una
      // definición (ON UPDATE …, el resto de un ENUM) no se cuentan como
      // columnas nuevas.
      const c = /^ {2}(\w+)\s+\S/.exec(linea);
      if (c && !palabrasClave.test(c[1])) columnas.add(c[1]);
    }
    columnasSql.set(m[1], columnas);
  }

  verificar(`el script crea las ${columnasEsquema.size} tablas del esquema`, columnasSql.size === columnasEsquema.size, `crea ${columnasSql.size}`);

  const tablasInventadas = [...columnasSql.keys()].filter((t) => !columnasEsquema.has(t));
  verificar("ninguna tabla del script falta en schema.prisma", tablasInventadas.length === 0, tablasInventadas.join(", "));

  const tablasFaltantes = [...columnasEsquema.keys()].filter((t) => !columnasSql.has(t));
  verificar("ninguna tabla del esquema falta en el script", tablasFaltantes.length === 0, tablasFaltantes.join(", "));

  // Columna por columna, en los dos sentidos. Es lo que separa un script que
  // "tiene las 22 tablas" de uno que describe el mismo modelo.
  const columnasPerdidas = [];
  const columnasSobrantes = [];
  for (const [tabla, esperadas] of columnasEsquema) {
    const hay = columnasSql.get(tabla);
    if (!hay) continue;
    for (const c of esperadas) if (!hay.has(c)) columnasPerdidas.push(`${tabla}.${c}`);
    for (const c of hay) if (!esperadas.has(c)) columnasSobrantes.push(`${tabla}.${c}`);
  }
  verificar("ninguna columna del esquema falta en el script", columnasPerdidas.length === 0, columnasPerdidas.join(", "));
  verificar("el script no inventa columnas", columnasSobrantes.length === 0, columnasSobrantes.join(", "));

  // --- Las claves foráneas, contra las migraciones -------------------------
  const dirMig = path.join(raiz, "backend/prisma/migrations");
  let sqlMig = "";
  for (const d of readdirSync(dirMig)) {
    const f = path.join(dirMig, d, "migration.sql");
    if (existsSync(f)) sqlMig += `${readFileSync(f, "utf8")}\n`;
  }
  const fkEsquema = new Set();
  const patron = /ALTER TABLE "(\w+)" ADD CONSTRAINT "\w+" FOREIGN KEY \("(\w+)"\) REFERENCES "(\w+)"\("\w+"\) ON DELETE (CASCADE|RESTRICT|SET NULL|SET DEFAULT|NO ACTION)/g;
  for (const m of sqlMig.matchAll(patron)) {
    if (!columnasEsquema.has(m[1])) continue;
    fkEsquema.add(`${m[1]}.${m[2]}->${m[3]}:${m[4]}`);
  }

  // En el script las FK van DENTRO del CREATE TABLE, repartidas en varias
  // líneas, así que el patrón cruza saltos de línea. La tabla se toma del
  // bloque que la contiene y no del nombre de la restricción: deducirla del
  // nombre corta mal en cuanto la tabla lleva guion bajo
  // (`unidades_territoriales_organization_id_fkey` → «unidades»).
  const fkSql = new Set();
  const patronSql = /CONSTRAINT\s+(\w+)\s+FOREIGN KEY\s*\((\w+)\)\s*REFERENCES\s+(\w+)\s*\(\w+\)\s*ON DELETE\s+(CASCADE|RESTRICT|SET NULL|SET DEFAULT|NO ACTION)/g;
  const nombresFk = [];
  for (const bloque of sqlEntrega.matchAll(/CREATE TABLE (\w+) \(([\s\S]*?)\n\)/g)) {
    for (const m of bloque[2].matchAll(patronSql)) {
      nombresFk.push(m[1]);
      fkSql.add(`${bloque[1]}.${m[2]}->${m[3]}:${m[4]}`);
    }
  }

  verificar(`el script declara las ${fkEsquema.size} claves foráneas del esquema`, fkSql.size === fkEsquema.size, `declara ${fkSql.size}`);
  const fkSobran = [...fkSql].filter((f) => !fkEsquema.has(f));
  const fkFaltan = [...fkEsquema].filter((f) => !fkSql.has(f));
  verificar("ninguna clave foránea del script está inventada", fkSobran.length === 0, fkSobran.join(", "));
  verificar("ninguna clave foránea del esquema falta en el script", fkFaltan.length === 0, fkFaltan.join(", "));

  // El nombre de cada FK es el de Prisma (`tabla_columna_fkey`). No es
  // cosmético: es lo que deja seguir una restricción del script hasta la
  // migración que la creó.
  const nombresRaros = nombresFk.filter((n) => !/_fkey$/.test(n));
  verificar("las claves foráneas conservan el nombre del esquema", nombresRaros.length === 0, nombresRaros.join(", "));

  // --- El orden de creación (rúbrica §5.7) ---------------------------------
  // «CREATE TABLE ordenadas correctamente (dependencias de FK)». Si una tabla
  // referencia a otra que todavía no existe, el script no corre.
  const yaCreadas = new Set();
  const fueraDeOrden = [];
  for (const m of sqlEntrega.matchAll(/CREATE TABLE (\w+) \(([\s\S]*?)\n\)/g)) {
    for (const ref of m[2].matchAll(/REFERENCES\s+(\w+)\s*\(/g)) {
      if (!yaCreadas.has(ref[1]) && ref[1] !== m[1]) fueraDeOrden.push(`${m[1]} → ${ref[1]}`);
    }
    yaCreadas.add(m[1]);
  }
  verificar("las tablas se crean en orden de dependencia de FK", fueraDeOrden.length === 0, fueraDeOrden.join(", "));

  // --- Lo que el DER prometió, y el script tiene que cumplir ---------------
  verificar("el script selecciona la base explícitamente", /CREATE DATABASE\s+sgr/i.test(sqlEntrega) && /^USE sgr;/m.test(sqlEntrega));
  // El cuerpo de cada disparador va entre `CREATE TRIGGER` y el `END$$` que lo
  // cierra. Se mira el cuerpo y no el archivo entero: contar apariciones de
  // SIGNAL en todo el .sql cuenta también las de los comentarios.
  const cuerpos = new Map();
  for (const m of sqlEntrega.matchAll(/CREATE TRIGGER (\w+)([\s\S]*?)END\$\$/g)) cuerpos.set(m[1], m[2]);
  for (const disparador of ["auditoria_sin_update", "auditoria_sin_delete", "actividad_codigo_no_cambia"]) {
    verificar(`el script reproduce el disparador ${disparador}`, cuerpos.has(disparador));
    verificar(
      `${disparador} aborta con SIGNAL SQLSTATE '45000'`,
      /SIGNAL SQLSTATE '45000'/.test(cuerpos.get(disparador) ?? "")
    );
  }

  const checksEsperados = ["users_rut_formato", "personas_rut_formato", "periodo_fechas_coherentes", "meta_valor_positivo", "ponderador_en_rango"];
  const checksFaltantes = checksEsperados.filter((c) => !new RegExp(`CONSTRAINT ${c}\\s`).test(sqlEntrega));
  verificar("el script trae los 5 CHECK de la migración", checksFaltantes.length === 0, checksFaltantes.join(", "));

  // El desvío D-d: el script refleja el sistema que hay, no el que quisiéramos.
  verificar(
    "el script NO inventa la FK de periodos.cerrado_por_id (desvío D-d)",
    !/FOREIGN KEY\s*\(cerrado_por_id\)/.test(sqlEntrega)
  );
  // Y las tres referencias polimórficas o deliberadamente sin FK siguen así.
  for (const columna of ["usuario_id", "entidad_id"]) {
    verificar(`${columna} sigue sin clave foránea en el script`, !new RegExp(`FOREIGN KEY\\s*\\(${columna}\\)`).test(sqlEntrega));
  }

  verificar("todas las tablas son InnoDB con utf8mb4", /default_storage_engine = INNODB/i.test(sqlEntrega) && /CHARACTER SET utf8mb4/i.test(sqlEntrega));

  // Regla 12: datos ficticios. Un correo de una persona real en el script
  // sería una fuga, y el script se entrega y se publica en el repositorio.
  verificar("los datos de prueba no usan las cuentas del seed", !/@sgr\.demo/.test(sqlEntrega));

  // --- Coherencia con el documento del criterio 7 --------------------------
  const rutaDocSql = path.join(entrega, "script-sql.md");
  if (!existsSync(rutaDocSql)) {
    console.log("  ··   todavía no existe script-sql.md; nada más que comprobar");
  } else {
    const docSql = readFileSync(rutaDocSql, "utf8");
    verificar("script-sql.md apunta al .sql que existe", docSql.includes("sgr-mysql.sql"));
    verificar(
      `script-sql.md nombra las ${columnasEsquema.size} tablas`,
      [...columnasEsquema.keys()].every((t) => docSql.includes(t)),
      [...columnasEsquema.keys()].filter((t) => !docSql.includes(t)).join(", ")
    );
  }
}

// ---------------------------------------------------------------------------
// 10. El informe. Se activa cuando el artefacto existe.
//
// El informe REÚNE lo que dicen los demás documentos, y ese es justamente su
// riesgo: es el artefacto que más barato se desincroniza, porque copiar una
// tabla no deja rastro de su origen. Estas comprobaciones lo atan a su fuente.
// ---------------------------------------------------------------------------
titulo("Criterio 9 · informe");

const rutaInforme = path.join(entrega, "informe.md");
if (!existsSync(rutaInforme)) {
  console.log("  ··   todavía no existe informe.md; nada que comprobar");
} else {
  const informe = readFileSync(rutaInforme, "utf8");

  verificar(
    "el informe trae el enlace del repositorio (rúbrica §2)",
    /github\.com\/TIbacache\/matriz-sgr/.test(informe)
  );

  // --- 10.1 RF → CU: el informe no puede decir otra cosa que el criterio 2 --
  const cuDelInforme = new Map();
  for (const linea of informe.split("\n")) {
    if (!/^\|\s*RF-\d{3}\s*\|/.test(linea)) continue;
    const c = celdas(linea);
    if (c.length >= 3) cuDelInforme.set(c[0], c[2]);
  }
  verificar("el informe traza los 38 RF", cuDelInforme.size === 38, `son ${cuDelInforme.size}`);

  // `rfACu` viene del bloque 1, leído de requerimientos.md §12.
  const discrepan = [];
  for (const [rf, celdaInforme] of cuDelInforme) {
    // `rfACu` viene como Set desde el bloque 1.
    const esperados = [...(rfACu.get(rf) ?? [])];
    const traidos = celdaInforme.match(/CU-[0-9IE]\d?/g) ?? [];
    const faltan = esperados.filter((x) => !traidos.includes(x));
    const sobran = traidos.filter((x) => !esperados.includes(x));
    if (faltan.length || sobran.length) {
      discrepan.push(`${rf}${faltan.length ? ` faltan ${faltan.join("/")}` : ""}${sobran.length ? ` sobran ${sobran.join("/")}` : ""}`);
    }
  }
  verificar(
    "RF → CU del informe coincide con requerimientos.md §12",
    discrepan.length === 0,
    discrepan.join(" · ")
  );

  // --- 10.2 CU → mockup: los doce, y cada imagen existe --------------------
  const pngsInforme = new Set([...informe.matchAll(/\.\.\/mockups\/([\w-]+\.png)/g)].map((m) => m[1]));
  verificar("el informe enlaza pantallas del mockup", pngsInforme.size > 0);
  for (const png of [...pngsInforme].sort()) {
    verificar(`informe → docs/mockups/${png} existe`, existsSync(path.join(raiz, "docs/mockups", png)));
  }

  // --- 10.3 y 10.4 CU → clase y CU → tabla --------------------------------
  // Ninguna clase ni tabla inventada: las dos listas salen de los documentos
  // de los criterios 5 y 6, que a su vez el verificador ya comparó contra
  // schema.prisma y contra las migraciones.
  const seccion = (desde, hasta) => {
    const i = informe.indexOf(desde);
    if (i < 0) return "";
    const f = informe.indexOf(hasta, i + 1);
    return informe.slice(i, f < 0 ? undefined : f);
  };

  // La tabla clase ↔ tabla de clases.md §10 da las dos listas de una vez, y ya
  // viene comparada contra schema.prisma y contra las migraciones por los
  // bloques 7 y 8: apoyarse en ella evita una tercera lista que mantener.
  // Solo la tabla del §10: clases.md tiene otras con la misma forma.
  const docClases = leer("clases.md");
  const i10 = docClases.indexOf("## 10.");
  const f10 = docClases.indexOf("## 11.", i10 + 1);
  const tabla10 = docClases.slice(i10, f10 < 0 ? undefined : f10);
  const pares = [...tabla10.matchAll(/^\|\s*`([A-Z][A-Za-z]+)`\s*\|\s*`([a-z][a-z_]*)`\s*\|/gm)];
  const clasesReales = new Set(pares.map((m) => m[1]));
  const tablasReales = new Set(pares.map((m) => m[2]));
  verificar("clases.md §10 entrega las 22 clases con su tabla", pares.length === 22, `son ${pares.length}`);

  const clasesInforme = new Set(
    [...seccion("### 5.3", "### 5.4").matchAll(/`([A-Z][A-Za-z]+)`/g)].map((m) => m[1])
  );
  const inventadas = [...clasesInforme].filter(
    (c) => !clasesReales.has(c) && !c.startsWith("Servicio")
  );
  verificar("el informe no nombra ninguna clase que no esté en clases.md", inventadas.length === 0, inventadas.join(", "));

  const tablasInforme = new Set(
    [...seccion("### 5.4", "## 6.").matchAll(/`([a-z][a-z_]+)`/g)].map((m) => m[1])
  );
  const noSonTabla = [...tablasInforme].filter((t) => !tablasReales.has(t));
  verificar(
    "el informe no nombra ninguna tabla que no esté en el modelo",
    noSonTabla.length === 0,
    noSonTabla.join(", ")
  );

  // --- 10.5 Los doce casos, presentes en las tres tablas -------------------
  for (const seccionCu of [
    ["### 5.2", "### 5.3", "CU → mockup"],
    ["### 5.3", "### 5.4", "CU → clase"],
    ["### 5.4", "## 6.", "CU → tabla"],
  ]) {
    const texto = seccion(seccionCu[0], seccionCu[1]);
    const presentes = new Set([...texto.matchAll(/\bCU-(\d{2})\b/g)].map((m) => m[1]));
    const faltan = [];
    for (let n = 1; n <= 12; n++) {
      const id = String(n).padStart(2, "0");
      if (!presentes.has(id)) faltan.push(`CU-${id}`);
    }
    verificar(`${seccionCu[2]} cubre los doce casos`, faltan.length === 0, faltan.join(", "));
  }

  // --- 10.6 Los desvíos y las decisiones no se pierden ---------------------
  for (const desvio of ["D-a", "D-b", "D-c", "D-d"]) {
    verificar(`el informe declara el desvío ${desvio}`, informe.includes(`**${desvio}**`));
  }
  verificar(
    "el informe declara que el modelo va en MySQL y el sistema corre en PostgreSQL",
    /MySQL/.test(informe) && /PostgreSQL 16/.test(informe)
  );
}

console.log(`\n${total - fallas}/${total} verificaciones de la entrega en verde`);

// Aviso, no verificación: los documentos citan cuántas comprobaciones hay, y
// ese número envejece cada vez que se agrega una. No puede comprobarse como
// una más —se contaría a sí misma—, así que se avisa después del resumen.
{
  const citas = [
    ["docs/entrega/informe.md", /\b(\d{3}) comprobaciones, sin tocar la red/],
    ["docs/entrega/README.md", /\*\*(\d{3}) comprobaciones\*\*, sin tocar la red/],
    ["CLAUDE.md", /verificar:entrega\s+#\s*(\d{3}) comprobaciones/],
  ];
  const desfasadas = citas
    .map(([archivo, patrón]) => {
      const ruta = path.join(raiz, archivo);
      if (!existsSync(ruta)) return null;
      const m = patrón.exec(readFileSync(ruta, "utf8"));
      return m && Number(m[1]) !== total ? `${archivo} dice ${m[1]}` : null;
    })
    .filter(Boolean);
  if (desfasadas.length) {
    console.log(`\n⚠  la cifra citada quedó desfasada (son ${total}): ${desfasadas.join(" · ")}`);
  }
}

process.exit(fallas ? 1 : 0);
