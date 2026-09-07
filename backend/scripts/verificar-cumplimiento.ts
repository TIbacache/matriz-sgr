// Verifica el motor de cálculo por funcionario contra las reglas del PDF.
// Ejecutar: npx tsx scripts/verificar-cumplimiento.ts
import { prisma } from "../src/lib/prisma.js";
import {
  calcularPeriodo,
  calcularCumplimientoItem,
  calcularSemaforo,
  consolidarPeriodo,
  proyectarCumplimiento,
} from "../src/services/cumplimiento.js";
import { obtenerParametros, CLAVES } from "../src/services/parametros.js";
import { estadoPorDias } from "../src/services/actividad-usuarios.js";
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

// --- Control de actividad de usuarios (RF-030) — regla de estado ------------
// El umbral es el parámetro `dias_sin_ingreso_alerta`, así que la función se
// prueba con umbrales distintos: si alguien lo escribiera fijo, estas fallan.
check("RF-030 nunca registró → sin registro", estadoPorDias(null, 7) === "sin_registro");
check("RF-030 registró hoy → al día", estadoPorDias(0, 7) === "al_dia");
check("RF-030 el día del umbral ya es atraso", estadoPorDias(7, 7) === "atrasado");
check("RF-030 un día antes del umbral todavía no", estadoPorDias(6, 7) === "al_dia");
check(
  "RF-030 el umbral es configurable, no un 7 escrito en el código",
  estadoPorDias(6, 3) === "atrasado" && estadoPorDias(6, 30) === "al_dia"
);


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

// --- Consolidación por delegación (Bloque C) — RF-029 · ADR-014 -------------
// Reemplaza a la vista materializada v1. Lo que hay que demostrar no es que
// sume, sino que consolide con las MISMAS reglas del cálculo individual.

// Proyección: regla de tres con el TOPE del parámetro, no con un 150 escrito
// en el código (RF-024, ADR-007). Antes vivía en el frontend, a mano.
check(
  "RF-024 la proyección respeta el tope configurado",
  proyectarCumplimiento(60, 30, 92, 1.5) === 150,
  `60% en 30 de 92 días → 184% sin tope, ${proyectarCumplimiento(60, 30, 92, 1.5)}% con tope 1,5`
);
check("RF-024 un tope distinto da una proyección distinta", proyectarCumplimiento(60, 30, 92, 1.2) === 120);
check("La proyección sin días transcurridos no divide por cero", proyectarCumplimiento(40, 0, 92, 1.5) === 40);

const consolidado = await consolidarPeriodo(ORG, periodo.id);
check(
  "RF-029 el período se consolida por delegación",
  consolidado.delegaciones.length > 1,
  `${consolidado.delegaciones.length} con medición, ${consolidado.sinMedicion.length} sin medición`
);

// ADR-014: la delegación es el PROMEDIO de su gente. Se comprueba recalculándolo
// a mano sobre el resultado individual del mismo motor.
const unaDelegacion = consolidado.delegaciones[0]!;
const suGente = cumplimiento.filter((c) => c.unidadTerritorialId === unaDelegacion.unidadTerritorialId);
const promedioAMano =
  Math.round((suGente.reduce((s, c) => s + c.cumplimientoFinal, 0) / suGente.length) * 10) / 10;
check(
  "ADR-014 la delegación es el promedio de sus funcionarios",
  unaDelegacion.cumplimiento === promedioAMano && unaDelegacion.funcionarios === suGente.length,
  `${unaDelegacion.nombre}: ${unaDelegacion.cumplimiento}% sobre ${suGente.length} personas`
);

// El color de la delegación sale de la MISMA función que el individual, con los
// umbrales de la tabla de parámetros. La vista v1 los tenía escritos en SQL.
check(
  "RF-027 el semáforo de la delegación usa los umbrales configurados",
  consolidado.delegaciones.every(
    (d) =>
      d.semaforo ===
      calcularSemaforo(
        d.avanceRelativo,
        params[CLAVES.semaforoVerde]!.valor,
        params[CLAVES.semaforoNaranjo]!.valor
      )
  )
);

// La diferencia que la v1 no sabía hacer: sin medición no es 0%.
check(
  "Una delegación sin nadie con meta NO aparece como 0% de cumplimiento",
  consolidado.sinMedicion.length > 0 &&
    consolidado.sinMedicion.every(
      (u) => !consolidado.delegaciones.some((d) => d.unidadTerritorialId === u.unidadTerritorialId)
    ),
  consolidado.sinMedicion.map((u) => u.nombre).join(", ") || "ninguna sin medición"
);

// El eje del mapa de calor es el área del cargo, no la categoría del tubo.
check(
  "El consolidado agrupa por área del cargo",
  consolidado.areas.length >= 3 && consolidado.delegaciones.every((d) => d.porArea.length > 0),
  consolidado.areas.join(", ")
);

// Cada área se juzga contra SU objetivo, no contra un 100% crudo.
const areasMalCalculadas = consolidado.delegaciones.flatMap((d) =>
  d.porArea.filter(
    (a) =>
      a.objetivoAlDia > 0 &&
      Math.abs(a.avanceRelativo - Math.round((a.cumplimiento / a.objetivoAlDia) * 1000) / 10) > 0.11
  )
);
check(
  "RN-008 el avance relativo por área es cumplimiento/objetivo",
  areasMalCalculadas.length === 0,
  `${consolidado.delegaciones.reduce((s, d) => s + d.porArea.length, 0)} celdas del mapa`
);

// Nadie se pierde por el camino al consolidar.
const conDelegacion = cumplimiento.filter((c) => c.unidadTerritorialId !== null).length;
const sumados = consolidado.delegaciones.reduce((s, d) => s + d.funcionarios, 0);
check(
  "Ningún funcionario medido se pierde al consolidar",
  sumados === conDelegacion && consolidado.totales.funcionarios === cumplimiento.length,
  `${sumados} en delegaciones + ${consolidado.totales.funcionariosSinDelegacion} sin delegación = ${consolidado.totales.funcionarios}`
);

// El tablero necesita los tres colores para que el semáforo signifique algo:
// es una propiedad de los DATOS DE DEMOSTRACIÓN, y por eso se verifica.
const coloresDelegacion = [...new Set(consolidado.delegaciones.map((d) => d.semaforo))];
check(
  "El semáforo por delegación muestra los tres colores",
  coloresDelegacion.length === 3,
  coloresDelegacion.join(", ")
);


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
