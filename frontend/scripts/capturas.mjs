// Capturas de cada pantalla con cada una de las seis cuentas, en los dos temas
// (DESIGN §10.5.7: "cada pantalla se prueba con los seis roles"). Usa el Edge
// instalado vía playwright-core: sin descarga de navegador, costo cero.
//
//   node scripts/capturas.mjs [carpeta-destino] [--solo=login,ficha] [--movil]
//
// Necesita el backend en :4000 y el frontend en :5173 corriendo.
import { mkdirSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright-core";

const API = process.env.SGR_API ?? "http://localhost:4000";
const UI = process.env.SGR_UI ?? "http://localhost:5173";
const args = process.argv.slice(2);
const destino = path.resolve(args.find((a) => !a.startsWith("--")) ?? "capturas");
const solo = args.find((a) => a.startsWith("--solo="))?.slice(7).split(",");
const movil = args.includes("--movil");

// Una por rol: docs/estado-proyecto.md §1 es la fuente única de cuentas.
const CUENTAS = [
  ["admin", "admin@sgr.demo"],
  ["coordinador", "coordinador@sgr.demo"],
  ["verificador", "verificador@sgr.demo"],
  ["consulta", "consulta@sgr.demo"],
  ["delegado", "delegado.centro@sgr.demo"],
  ["territorial", "territorial.centro@sgr.demo"],
];
const RUTAS = [
  ["tubo", "/"],
  ["ficha", "/ficha"],
  ["verificacion", "/verificacion"],
  ["metas", "/metas"],
  // La ficha del vecino nace vacía: sin una búsqueda hecha no hay nada que
  // mirar. Se entra con el RUT del caso emblemático del seed (ADR-008) para
  // que la captura muestre lo que la pantalla existe para mostrar.
  ["vecinos", "/vecinos?q=13.111.222-K"],
  ["dashboard", "/dashboard"],
  // Solo admin y coordinador entran (ADR-015). Con los otros cuatro roles la
  // captura debe mostrar el motivo escrito, no un vacío: por eso se captura
  // con los seis y no solo con quien tiene permiso.
  ["actividad", "/actividad"],
];
const TEMAS = ["claro", "oscuro"];

async function iniciarSesion(email) {
  const r = await fetch(`${API}/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password: "matriz123" }),
  });
  if (!r.ok) throw new Error(`login ${email}: ${r.status}`);
  return r.json();
}

mkdirSync(destino, { recursive: true });
const navegador = await chromium.launch({ channel: "msedge", headless: true });
const viewport = movil ? { width: 390, height: 844 } : { width: 1440, height: 900 };
let n = 0;

try {
  for (const tema of TEMAS) {
    // Login sin sesión
    if (!solo || solo.includes("login")) {
      const ctx = await navegador.newContext({ viewport, colorScheme: tema === "oscuro" ? "dark" : "light" });
      const page = await ctx.newPage();
      await page.goto(`${UI}/login`, { waitUntil: "networkidle" });
      await page.waitForTimeout(600);
      await page.screenshot({ path: path.join(destino, `login-${tema}${movil ? "-movil" : ""}.png`), fullPage: true });
      n++;
      await ctx.close();
    }

    for (const [rol, email] of CUENTAS) {
      const sesion = await iniciarSesion(email);
      const ctx = await navegador.newContext({ viewport, colorScheme: tema === "oscuro" ? "dark" : "light" });
      await ctx.addInitScript(
        ({ sesion, tema }) => {
          localStorage.setItem("matriz.auth", JSON.stringify(sesion));
          localStorage.setItem("matriz.tema", tema);
        },
        { sesion, tema }
      );
      const page = await ctx.newPage();
      for (const [nombre, ruta] of RUTAS) {
        if (solo && !solo.includes(nombre)) continue;
        await page.goto(`${UI}${ruta}`, { waitUntil: "networkidle" });
        // Que terminen las entradas en cascada y los gráficos
        await page.waitForTimeout(900);
        await page.screenshot({
          path: path.join(destino, `${nombre}-${rol}-${tema}${movil ? "-movil" : ""}.png`),
          fullPage: true,
        });
        n++;
      }
      await ctx.close();
    }
  }
} finally {
  await navegador.close();
}

console.log(`${n} capturas en ${destino}`);
