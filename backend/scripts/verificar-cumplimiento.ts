// Verifica el motor de cálculo por funcionario contra las reglas del PDF.
// Ejecutar: npx tsx scripts/verificar-cumplimiento.ts
import { prisma } from "../src/lib/prisma.js";
import { calcularPeriodo, calcularCumplimientoItem, calcularSemaforo } from "../src/services/cumplimiento.js";
import { obtenerParametros, CLAVES } from "../src/services/parametros.js";
import { diasDelPeriodo, diasTranscurridos } from "../src/lib/fechas.js";

const ORG = "00000000-0000-0000-0000-000000000001";
const resultados: string[] = [];
const check = (nombre: string, ok: boolean, detalle = "") =>
  resultados.push(`${ok ? "PASS" : "FAIL"} - ${nombre}${detalle ? ` (${detalle})` : ""}`);

// --- Pruebas unitarias de las fórmulas (PDF §14.3: unitarias de fórmulas) ---

// RN-004: cumplimiento = avance/meta
check("RN-004 cumplimiento normal", calcularCumplimientoItem(30, 20, "mayor_mejor", 1.5) === (20 / 30) * 100,
  `20/30 = ${calcularCumplimientoItem(30, 20, "mayor_mejor", 1.5).toFixed(1)}%`);

// RN-005: tope configurable
check("RN-005 tope 150% aplicado", calcularCumplimientoItem(32, 66, "mayor_mejor", 1.5) === 150,
  `66/32 = 206% → recortado a ${calcularCumplimientoItem(32, 66, "mayor_mejor", 1.5)}%`);

// ADR-009: ítem inverso ("Pendientes en tubo menor a 10%")
const inverso = calcularCumplimientoItem(10, 11, "menor_mejor", 1.5);
check("ADR-009 ítem inverso penaliza exceso", inverso < 100,
  `meta 10, avance 11 → ${inverso.toFixed(1)}% (no 110%)`);
check("ADR-009 ítem inverso premia estar bajo la meta",
  calcularCumplimientoItem(10, 5, "menor_mejor", 1.5) === 150,
  `meta 10, avance 5 → ${calcularCumplimientoItem(10, 5, "menor_mejor", 1.5)}%`);

// RN-002: meta cero no divide por cero
check("RN-002 meta cero no rompe", calcularCumplimientoItem(0, 5, "mayor_mejor", 1.5) === 0);

// RN-008: los tres colores del semáforo
check("RN-008 verde", calcularSemaforo(105, 1.0, 0.6) === "verde");
check("RN-008 naranjo", calcularSemaforo(88, 1.0, 0.6) === "naranjo");
check("RN-008 rojo", calcularSemaforo(45, 1.0, 0.6) === "rojo");
// Caso real de la planilla: objetivo 50,55 · avance 98 → relativo 193,9 → verde
check("RN-008 caso real planilla (98 vs 50,55)",
  calcularSemaforo((98 / 50.55) * 100, 1.0, 0.6) === "verde");
// Caso real: Katherine Bozzo, objetivo 39,56 · avance 15,5 → 39,2% → rojo
check("RN-008 caso real planilla (15,5 vs 39,56)",
  calcularSemaforo((15.5 / 39.56) * 100, 1.0, 0.6) === "rojo");

// --- ADR-007: los parámetros salen de la base, no del código ---
const params = await obtenerParametros(ORG);
check("ADR-007 parámetros configurados",
  params[CLAVES.topeCumplimientoItem]?.valor === 1.5 && params[CLAVES.semaforoNaranjo]?.valor === 0.6,
  `${Object.keys(params).length} parámetros`);
const sinConfirmar = Object.entries(params).filter(([, v]) => !v.confirmado).map(([k]) => k);
check("ADR-007 marca los pendientes de confirmación", sinConfirmar.length > 0,
  sinConfirmar.join(", "));

// --- RF-005: el período se calcula desde las fechas, no está fijo ---
const periodo = await prisma.periodo.findFirstOrThrow({ where: { organizationId: ORG } });
const dias = diasDelPeriodo(periodo.fechaInicio, periodo.fechaTermino);
check("RF-005 días del período calculados", dias === 92,
  `1/7 a 30/9 = ${dias} días (la planilla indica 91: consulta abierta al docente)`);

// --- Cálculo completo ---
const cumplimiento = await calcularPeriodo(ORG, periodo.id);
check("Cálculo por funcionario produce resultados", cumplimiento.length > 0,
  `${cumplimiento.length} funcionarios`);

// RN-001: los ponderadores de cada funcionario suman 100%
const malPonderados = cumplimiento.filter((c) => {
  const suma = c.items.reduce((s, i) => s + i.ponderador, 0);
  return Math.abs(suma - 1) > 0.001;
});
check("RN-001 ponderadores suman 100% por funcionario", malPonderados.length === 0,
  malPonderados.map((c) => `${c.nombre}: ${c.items.reduce((s, i) => s + i.ponderador, 0)}`).join(" | "));

// El descuento de ausencias produce un objetivo distinto (como en la planilla)
const objetivos = [...new Set(cumplimiento.map((c) => c.objetivoAlDia))];
check("Ausencias producen objetivo al día distinto por persona", objetivos.length > 1,
  `objetivos: ${objetivos.join("%, ")}%`);

// RN-009: solo lo validado suma
const pendientes = await prisma.validacion.count({ where: { organizationId: ORG, decision: "pendiente" } });
const aprobadas = await prisma.validacion.count({ where: { organizationId: ORG, decision: "aprobada" } });
const totalActividades = await prisma.actividad.count({ where: { organizationId: ORG } });
const sumaAvances = cumplimiento.reduce((s, c) => s + c.items.reduce((s2, i) => s2 + i.avance, 0), 0);
check("RN-009 solo las actividades con validación aprobada suman",
  sumaAvances === aprobadas && aprobadas < totalActividades,
  `${totalActividades} actividades, ${aprobadas} aprobadas, ${pendientes} pendientes, avance contado = ${sumaAvances}`);

// El semáforo muestra variedad
const colores = [...new Set(cumplimiento.map((c) => c.semaforo))];
check("El semáforo produce más de un color", colores.length >= 2, colores.join(", "));

// RF-011: códigos únicos
const codigos = await prisma.actividad.findMany({ where: { organizationId: ORG }, select: { codigo: true } });
check("RF-011 códigos de evidencia únicos",
  new Set(codigos.map((c) => c.codigo)).size === codigos.length,
  `${codigos.length} códigos`);
check("ADR-004 formato de código no ambiguo",
  codigos.every((c) => /^[A-Z]{3}-\d{8}-\d{4}$/.test(c.codigo)),
  `ejemplo: ${codigos[0]?.codigo}`);

// ADR-008: trazabilidad del vecino entre delegaciones
const vecinoMultiple = await prisma.personaUsuaria.findFirst({
  where: { organizationId: ORG },
  include: { tareas: { include: { unidad: { select: { nombre: true } } } } },
});
const delegacionesDelVecino = new Set(vecinoMultiple?.tareas.map((t) => t.unidad.nombre) ?? []);
check("ADR-008 un vecino es rastreable entre delegaciones",
  delegacionesDelVecino.size > 1,
  `${vecinoMultiple?.nombres} ${vecinoMultiple?.apellidoPaterno} aparece en: ${[...delegacionesDelVecino].join(", ")}`);

console.log("\n" + resultados.join("\n"));
console.log("\n--- Muestra del cálculo ---");
for (const c of cumplimiento.slice(0, 6)) {
  console.log(
    `${c.semaforo.padEnd(8)} ${c.nombre.padEnd(24)} ${String(c.cargo).padEnd(24)} ` +
      `cumpl=${String(c.cumplimientoFinal).padStart(6)}%  objetivo=${String(c.objetivoAlDia).padStart(5)}%  ` +
      `relativo=${String(c.avanceRelativo).padStart(6)}%  ingresos=${c.totalIngresos}`
  );
}

await prisma.$disconnect();
process.exit(resultados.some((r) => r.startsWith("FAIL")) ? 1 : 0);
