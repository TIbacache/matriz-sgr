// Verifica que los RUT ficticios del seed sean válidos (módulo 11) y de paso
// sirve de prueba de lib/rut.ts. Ejecutar: npx tsx scripts/verificar-ruts.ts
import { calcularDv, normalizarRut, formatearRut } from "../src/lib/rut.js";

const DEL_SEED = [
  "11111111-1", "12345678-5", "13579246-2", "15975348-4", "14725836-4",
  "16182420-8", "17342896-0", "18456123-9", "19234567-7", "10203040-0",
  "9876543-3", "20123456-5", "16543210-K",
  "13111222-K", "14222333-3", "15333444-7",
];

let invalidos = 0;
for (const r of DEL_SEED) {
  if (!normalizarRut(r)) {
    invalidos++;
    const cuerpo = r.split("-")[0]!;
    console.log(`INVÁLIDO ${r}  → correcto: ${cuerpo}-${calcularDv(cuerpo)}`);
  }
}
console.log(invalidos === 0 ? `✔ ${DEL_SEED.length} RUT del seed válidos` : `✘ ${invalidos} inválidos`);

// Casos de la propia utilidad
const casos: [string, string | null][] = [
  ["17.721.947-9", null],            // del PPT: se calcula abajo si es válido
  ["17,721,947-9", null],            // formato Google Sheets
  ["12345678-9", null],              // DV incorrecto → debe rechazarse
  ["216944", null],                  // dato sucio real de la planilla
  ["", null],
];
console.log("\nNormalización:");
for (const [entrada] of casos) {
  const salida = normalizarRut(entrada);
  console.log(`  "${entrada}" → ${salida ?? "RECHAZADO"}${salida ? `  (muestra: ${formatearRut(salida)})` : ""}`);
}
process.exit(invalidos === 0 ? 0 : 1);
