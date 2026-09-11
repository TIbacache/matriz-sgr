// Los PDF de la entrega del 15 de septiembre, de una sola vez.
//
//   npm run pdf:entrega
//
// Para qué existe este archivo y no una lista de comandos en un documento:
// **el docente solo revisa el Planner** (regla 19 del proyecto) y ahí se adjuntan
// archivos. Un `.md` adjunto se lee como texto plano —sin tablas y sin
// diagramas—, así que todo documento que vaya al tablero va en PDF.
//
// La lista de abajo ES la definición de qué se entrega. Si un documento no
// está aquí, no se adjunta; si se agrega uno, se agrega aquí y deja de
// depender de que alguien se acuerde.
//
// Lo que NO está, y es a propósito:
//   - `entrega/README.md`, `guia-planner-hector.md` y `planner-delta.md` son
//     material de trabajo interno: no se entregan.
//   - Los mockups no son documentos: van como `.html` autocontenido al Planner
//     y como `.png` a GitHub. Un PDF de ellos sería una foto de una foto.
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const aquí = path.dirname(fileURLToPath(import.meta.url));

// [documento .md, qué es, salida opcional]. Todos los PDF terminan en
// `docs/entrega/`: son los que se adjuntan al Planner y conviene que estén en
// una sola carpeta, con un nombre que se entienda fuera de su contexto —
// `README.pdf` no dice nada colgando de una tarjeta.
const DOCUMENTOS = [
  ["../docs/entrega/informe.md", "El informe, con las cuatro tablas de trazabilidad"],
  ["../docs/entrega/requerimientos.md", "Criterio 2 · diagramas de requerimientos"],
  ["../docs/entrega/casos-uso-general.md", "Criterio 3 · caso de uso general"],
  ["../docs/entrega/casos-uso-detalle.md", "Criterio 4 · las 12 fichas"],
  ["../docs/entrega/clases.md", "Criterio 5 · diagrama de clases"],
  ["../docs/entrega/der.md", "Criterio 6 · DER MySQL"],
  ["../docs/entrega/script-sql.md", "Criterio 7 · el script y su evidencia"],
  [
    "../docs/mockups/README.md",
    "Criterio 8 · el README del mockup que pide la rúbrica §5.8",
    "../docs/entrega/mockup-pantallas.pdf",
  ],
  // No se adjunta al Planner: es la visita guiada al sistema, para el equipo.
  // Se regenera aquí para que no envejezca, que es lo único que la haría
  // inútil — un documento de puesta al día desactualizado desinforma.
  ["../docs/entrega/estado-del-sistema.md", "Visita guiada al sistema (para el equipo, no se entrega)"],
];

let fallas = 0;
for (const [relativo, qué, salida] of DOCUMENTOS) {
  const args = [path.join(aquí, "pdf.mjs"), relativo];
  if (salida) args.push(salida);
  const r = spawnSync(process.execPath, args, { cwd: aquí, encoding: "utf8" });
  const ok = r.status === 0;
  if (!ok) fallas += 1;
  const nombre = path.basename(salida ?? relativo).replace(/\.md$/, ".pdf");
  console.log(`${ok ? "  ok  " : "FALLA "} ${nombre.padEnd(26)} ${qué}`);
  if (!ok) console.log((r.stderr || r.stdout || "").trim());
}

// --------------------------------------------------------- Las 17 pantallas
//
// Planner admite **10 adjuntos por tarea**, y las pantallas del mockup son 17.
// Van comprimidas en un solo archivo: es eso o dejar la mitad fuera, que
// ademas se veria como un entregable incompleto.
//
// Se arma aqui, y no a mano, para que no envejezca: si se regeneran los
// mockups y nadie rehace el zip, el adjunto muestra pantallas viejas.
// Compress-Archive viene con Windows, asi que no agrega dependencias (regla 13).
const zip = path.resolve(aquí, "../../docs/entrega/mockup-17-pantallas.zip");
const origen = path.resolve(aquí, "../../docs/mockups/*.html");
const z = spawnSync(
  "powershell",
  [
    "-NoProfile",
    "-Command",
    `if (Test-Path '${zip}') { Remove-Item '${zip}' }; Compress-Archive -Path '${origen}' -DestinationPath '${zip}' -CompressionLevel Optimal`,
  ],
  { encoding: "utf8" }
);
if (z.status === 0) {
  console.log(`  ok   mockup-17-pantallas.zip     Las 17 pantallas, porque Planner solo admite 10 adjuntos`);
} else {
  fallas += 1;
  console.log("FALLA  mockup-17-pantallas.zip", (z.stderr || "").trim());
}

console.log(
  `\n${DOCUMENTOS.length - fallas}/${DOCUMENTOS.length} PDF de la entrega generados en docs/entrega/, más el zip de las 17 pantallas`
);
process.exit(fallas ? 1 : 0);
