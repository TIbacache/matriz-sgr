// Mockups navegables: un .html AUTOCONTENIDO por pantalla, más su captura PNG.
//
// Para qué: el docente solo revisa el Planner (CLAUDE.md regla 19) y ahí se
// adjuntan archivos. Un .html se abre con doble clic, sin instalar nada, sin
// servidor y sin base de datos, y se ve exactamente como la aplicación real
// —porque SALE de la aplicación real corriendo, no es un dibujo—. El PNG es
// para que la pantalla se vea en GitHub, donde Markdown no ejecuta HTML.
//
// Qué hace para que el archivo sea autocontenido:
//   1. Inserta el CSS de la aplicación en un <style> (Vite lo sirve por JS en
//      desarrollo, así que sin esto el .html saldría sin estilos).
//   2. Convierte cada <img> a data: URI — las evidencias viven tras un
//      endpoint con token y de otro modo saldrían rotas.
//   3. Convierte cada <canvas> a <img>: ECharts pinta en canvas y los píxeles
//      NO sobreviven a serializar el HTML. Sin esto, el tablero —la pantalla
//      con más gráficos— se guardaba con las tarjetas vacías.
//   4. Quita todos los <script>: el mockup no debe intentar llamar a la API.
//   5. Deja los <link> de fuentes: con internet se ven idénticas, y sin
//      internet caen a la pila de reserva declarada en tokens.css.
//
//   node scripts/mockups.mjs [carpeta-destino]
//
// Necesita el backend en :4000 y el frontend en :5173 corriendo.
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright-core";

const API = process.env.SGR_API ?? "http://localhost:4000";
const UI = process.env.SGR_UI ?? "http://localhost:5173";
const destino = path.resolve(process.argv[2] ?? path.join("..", "docs", "mockups"));

// Cada pantalla con la cuenta que mejor la representa (docs/estado-proyecto §1).
const PANTALLAS = [
  { archivo: "01-login", ruta: "/login", cuenta: null, titulo: "Ingreso al sistema" },
  { archivo: "02-tubo", ruta: "/", cuenta: "delegado.centro@sgr.demo", titulo: "Tubo de trabajo" },
  { archivo: "03-ficha", ruta: "/ficha", cuenta: "territorial.centro@sgr.demo", titulo: "Ficha personal" },
  { archivo: "04-verificacion", ruta: "/verificacion", cuenta: "verificador@sgr.demo", titulo: "Bandeja del verificador" },
  { archivo: "05-metas", ruta: "/metas", cuenta: "coordinador@sgr.demo", titulo: "Configuración de metas" },
  {
    archivo: "06-vecino",
    // Con el RUT del caso emblemático: la ficha sin búsqueda está en blanco.
    ruta: "/vecinos?q=13.111.222-K",
    cuenta: "coordinador@sgr.demo",
    titulo: "Ficha del vecino",
  },
  { archivo: "07-dashboard", ruta: "/dashboard", cuenta: "admin@sgr.demo", titulo: "Tablero de control" },
];

async function sesion(email) {
  const r = await fetch(`${API}/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password: "matriz123" }),
  });
  if (!r.ok) throw new Error(`login ${email}: ${r.status}`);
  return r.json();
}

await mkdir(destino, { recursive: true });
const navegador = await chromium.launch({ channel: "msedge", headless: true });
const generados = [];

try {
  for (const pantalla of PANTALLAS) {
    // Escala 1: el PNG es un índice para GitHub y la ficha mide ~9.000 px de
    // alto; a 2x pesaba 2,7 MB ella sola. El detalle fino vive en el .html.
    const ctx = await navegador.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
    if (pantalla.cuenta) {
      const s = await sesion(pantalla.cuenta);
      await ctx.addInitScript((s) => localStorage.setItem("matriz.auth", JSON.stringify(s)), s);
    }
    const page = await ctx.newPage();
    await page.goto(`${UI}${pantalla.ruta}`, { waitUntil: "networkidle" });
    // Que terminen las entradas en cascada, los contadores y los gráficos
    await page.waitForTimeout(1800);

    await page.screenshot({ path: path.join(destino, `${pantalla.archivo}.png`), fullPage: true });

    const html = await page.evaluate(async (titulo) => {
      // 1. El CSS de la aplicación, que en desarrollo lo inyecta Vite por JS
      let css = "";
      for (const hoja of document.styleSheets) {
        try {
          for (const regla of hoja.cssRules) css += regla.cssText + "\n";
        } catch {
          /* hoja de otro origen (fuentes): se conserva su <link> */
        }
      }

      // 2. Las imágenes, a data: URI (las evidencias exigen token)
      const aDataUri = async (url) => {
        try {
          const r = await fetch(url, { credentials: "include" });
          const blob = await r.blob();
          return await new Promise((ok) => {
            const fr = new FileReader();
            fr.onload = () => ok(fr.result);
            fr.readAsDataURL(blob);
          });
        } catch {
          return null;
        }
      };
      for (const img of document.querySelectorAll("img")) {
        if (img.src.startsWith("data:")) continue;
        const uri = await aDataUri(img.src);
        if (uri) img.src = uri;
      }

      // 3. Los gráficos: canvas → img, antes de clonar
      for (const canvas of document.querySelectorAll("canvas")) {
        try {
          const img = document.createElement("img");
          img.src = canvas.toDataURL("image/png");
          // ECharts apila varias capas de canvas posicionadas en absoluto:
          // hay que conservar su style, o la capa de las series se desplaza
          // y el heatmap queda con los ejes pero sin celdas.
          const estilo = canvas.getAttribute("style");
          if (estilo) img.setAttribute("style", estilo);
          const caja = canvas.getBoundingClientRect();
          img.style.width = `${caja.width}px`;
          img.style.height = `${caja.height}px`;
          img.alt = "Gráfico del tablero";
          canvas.replaceWith(img);
        } catch {
          /* canvas contaminado: se deja como está */
        }
      }

      const doc = document.documentElement.cloneNode(true);
      // 4. Fuera todo el JavaScript: el mockup no llama a la API
      doc.querySelectorAll("script").forEach((s) => s.remove());
      doc.querySelectorAll('link[rel="stylesheet"]').forEach((l) => {
        if (!l.href.includes("fonts.googleapis") && !l.href.includes("fontshare")) l.remove();
      });

      const estilo = document.createElement("style");
      estilo.textContent = css;
      doc.querySelector("head").appendChild(estilo);

      // El aviso es fijo: se reserva su alto para que no tape la última fila
      const respiro = document.createElement("style");
      respiro.textContent = "body { padding-bottom: 34px !important; }";
      doc.querySelector("head").appendChild(respiro);

      const aviso = document.createElement("div");
      aviso.setAttribute(
        "style",
        "position:fixed;left:0;right:0;bottom:0;z-index:999;padding:6px 12px;" +
          "background:#1a1a1a;color:#fff;font:12px/1.4 system-ui,sans-serif;text-align:center"
      );
      aviso.textContent =
        `SGR — ${titulo} · Mockup estático generado desde la aplicación real. ` +
        "Datos ficticios. Los botones no responden: es una fotografía navegable, no la aplicación.";
      doc.querySelector("body").appendChild(aviso);

      const t = doc.querySelector("title");
      if (t) t.textContent = `SGR — ${titulo} (mockup)`;
      return "<!doctype html>\n" + doc.outerHTML;
    }, pantalla.titulo);

    await writeFile(path.join(destino, `${pantalla.archivo}.html`), html, "utf8");
    generados.push({ ...pantalla, bytes: Buffer.byteLength(html) });
    await ctx.close();
  }
} finally {
  await navegador.close();
}

for (const g of generados) {
  console.log(`${g.archivo}.html  ${(g.bytes / 1024).toFixed(0)} KB  ${g.titulo}`);
}
console.log(`\n${generados.length} mockups (.html + .png) en ${destino}`);
