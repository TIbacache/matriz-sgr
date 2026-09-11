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
// Hay DOS familias de pantalla, y la rúbrica pide las dos (§5.8 y §6: «los
// mockups deben representar las pantallas necesarias para ejecutar los casos de
// uso Y TAMBIÉN contemplar los escenarios alternativos modelados»):
//
//   1. El CAMINO FELIZ — una toma por pantalla, tal como se abre.
//   2. Los ESCENARIOS ALTERNATIVOS — los «include» y «extend» de
//      docs/entrega/casos-uso-general.md §7 y §8. Cada uno declara su `cu`, y
//      esa es la casilla del mapa CU → mockup.
//
// Los escenarios que no se ven con solo abrir una ruta traen un hook
// `acciones({ page, api })`, que corre DESPUÉS del goto y ANTES de la captura:
//   - `page` es la pestaña real, así que el escenario se produce haciendo lo
//     mismo que haría una persona: escribir, salir del campo, apretar el botón.
//   - `api` habla con el backend como una SEGUNDA SESIÓN. Es lo que permite
//     provocar de verdad el conflicto de versión (409): alguien más guardó
//     primero, que es exactamente la condición de CU-E4.
// Nada se simula: si el 403 sale en pantalla es porque el servidor lo devolvió.
//
// Y traen `foco`, un selector opcional: el PNG se recorta a ese elemento en vez
// de retratar la página entera. Un mensaje de campo obligatorio dentro de una
// ficha de 9.000 px de alto es ilegible en GitHub, y el mensaje ES el
// entregable. El .html sigue completo.
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

// El caso emblemático del cliente: la misma persona atendida en más de una
// delegación (ADR-008, seed.ts). Es el RUT que hace aparecer el aviso ámbar.
const RUT_CASO = "13.111.222-K";

// Cada pantalla con la cuenta que mejor la representa (docs/estado-proyecto §1).
const CAMINO_FELIZ = [
  { archivo: "01-login", ruta: "/login", cuenta: null, titulo: "Ingreso al sistema" },
  { archivo: "02-tubo", ruta: "/", cuenta: "delegado.centro@sgr.demo", titulo: "Tubo de trabajo" },
  { archivo: "03-ficha", ruta: "/ficha", cuenta: "territorial.centro@sgr.demo", titulo: "Ficha personal" },
  { archivo: "04-verificacion", ruta: "/verificacion", cuenta: "verificador@sgr.demo", titulo: "Bandeja del verificador" },
  { archivo: "05-metas", ruta: "/metas", cuenta: "coordinador@sgr.demo", titulo: "Configuración de metas" },
  {
    archivo: "06-vecino",
    // Con el RUT del caso emblemático: la ficha sin búsqueda está en blanco.
    ruta: `/vecinos?q=${RUT_CASO}`,
    cuenta: "coordinador@sgr.demo",
    titulo: "Ficha del vecino",
  },
  { archivo: "07-dashboard", ruta: "/dashboard", cuenta: "admin@sgr.demo", titulo: "Tablero de control" },
  {
    archivo: "08-actividad",
    ruta: "/actividad",
    // Con el coordinador, que es uno de los dos roles que entran (ADR-015).
    cuenta: "coordinador@sgr.demo",
    titulo: "Control de actividad",
  },
];

// Los escenarios alternativos de docs/entrega/casos-uso-general.md §7 y §8.
// `cu` NO es decorativo: es la casilla del mapa CU → mockup, y el verificador
// de la entrega comprueba que cada «include» y cada «extend» tenga la suya.
//
// Dos de los nueve NO están aquí, y es una decisión, no un olvido:
//   - CU-I2 (generar el código único) no es pantalla propia: el código se ve en
//     la ficha, y su casilla apunta a 03-ficha.
//   - CU-I3 (registrar en la bitácora) NO TIENE PANTALLA. Es el desvío D-c:
//     RF-036 pide trazabilidad consultable y todavía no está construida.
//     Dibujarle un mockup sería describir un sistema que no existe.
const ESCENARIOS = [
  {
    cu: "CU-I1",
    archivo: "09-alt-datos-invalidos",
    ruta: "/ficha",
    cuenta: "territorial.centro@sgr.demo",
    titulo: "Validar los datos del registro",
    foco: ".ficha-nueva",
    // Los dos controles de RF-010 a la vez: el FORMATO se avisa al salir del
    // campo (DESIGN §8.2) y la OBLIGATORIEDAD mantiene el botón deshabilitado
    // mientras «Actividad o solicitud» esté vacía.
    acciones: async ({ page }) => {
      await page.fill("#na-fono", "1234");
      // Se sale del campo sin entrar a otro: llevar el foco al de al lado le
      // pinta SU anillo de foco y la captura sugeriría dos campos con problema.
      await page.locator("#na-fono").blur();
      await page.waitForSelector("#na-fono-error");
    },
  },
  {
    cu: "CU-E1",
    archivo: "10-alt-duplicidad",
    ruta: `/vecinos?q=${RUT_CASO}`,
    cuenta: "coordinador@sgr.demo",
    titulo: "Aviso de posible atención duplicada",
    // Toma propia del aviso, aunque la ficha completa ya esté en 06-vecino: el
    // mapa CU → mockup necesita su casilla, y el aviso es el control que el
    // cliente vino a buscar (ADR-008, CA-04).
    foco: ".vecinos-aviso",
  },
  {
    cu: "CU-E2",
    archivo: "11-alt-observacion-obligatoria",
    ruta: "/verificacion",
    cuenta: "verificador@sgr.demo",
    titulo: "Exigir observación de la decisión",
    foco: ".bandeja-panel",
    // Rechazar sin escribir por qué. El aviso se arma en el cliente y ni sale
    // la petición: el backend lo exige igual, pero avisar antes ahorra el viaje.
    acciones: async ({ page }) => {
      // A la siguiente de la cola: la primera es la del caso de CU-E3 y las dos
      // capturas saldrían con la misma evidencia, como si fueran la misma cosa.
      await page.keyboard.press("j");
      await page.getByRole("button", { name: "Rechazar" }).click();
      await page.waitForSelector(".bandeja-error");
    },
  },
  {
    cu: "CU-E3",
    archivo: "12-alt-validacion-propia",
    ruta: "/verificacion",
    // El coordinador subió la evidencia que encabeza la cola (caso deliberado
    // del seed) y por eso no puede validarla: RNF-005, segregación de
    // funciones. El 403 lo devuelve el servidor de verdad.
    cuenta: "coordinador@sgr.demo",
    titulo: "Rechazar la validación propia",
    foco: ".bandeja-panel",
    acciones: async ({ page }) => {
      await page.getByRole("button", { name: "Aprobar" }).click();
      await page.waitForSelector(".bandeja-error");
    },
  },
  {
    cu: "CU-E4",
    archivo: "13-alt-conflicto-version",
    ruta: `/vecinos?q=${RUT_CASO}`,
    cuenta: "coordinador@sgr.demo",
    titulo: "Informar conflicto de versión",
    foco: ".vecinos-correccion",
    // El 409 de verdad: se abre la corrección, OTRA SESIÓN guarda primero y
    // recién entonces se aprieta Guardar. La segunda sesión escribe los MISMOS
    // valores —lo único que cambia es la `version`—, así que el conflicto es
    // real y el dato no se altera (RF-034, CA-08, ADR-005).
    acciones: async ({ page, api }) => {
      await page.getByRole("button", { name: "Corregir datos" }).click();
      await page.waitForSelector(".vecinos-correccion");

      const { personas } = await api.get(`/vecinos?q=${encodeURIComponent(RUT_CASO)}`);
      const id = personas[0]?.id;
      if (!id) throw new Error(`CU-E4: no se encontró al vecino ${RUT_CASO}`);
      const v = await api.get(`/vecinos/${id}`);
      await api.patch(`/vecinos/${id}`, {
        nombres: v.persona.nombres,
        apellidoPaterno: v.persona.apellidoPaterno,
        apellidoMaterno: v.persona.apellidoMaterno,
        telefono: v.persona.telefono,
        direccion: v.persona.direccion,
        sector: v.persona.sector,
        version: v.persona.version,
      });

      await page.getByRole("button", { name: "Guardar corrección" }).click();
      await page.waitForSelector(".vecinos-conflicto");
    },
  },
  {
    cu: "CU-E5",
    archivo: "14-alt-alcance-vecino",
    ruta: `/vecinos?q=${RUT_CASO}`,
    // El verificador valida evidencias; no necesita la identidad del vecino
    // (ADR-012, RNF-005). La pantalla escribe el motivo, no un «sin permisos».
    cuenta: "verificador@sgr.demo",
    titulo: "Denegar por alcance · ficha del vecino",
    foco: ".vecinos-bloqueo",
  },
  {
    cu: "CU-E5",
    archivo: "15-alt-alcance-actividad",
    ruta: "/actividad",
    // El panel lo ven solo administrador y coordinador (ADR-015). A un
    // funcionario el servidor le responde 403 y la pantalla muestra ESE texto.
    cuenta: "territorial.centro@sgr.demo",
    titulo: "Denegar por alcance · control de actividad",
    foco: ".act-403",
  },
  {
    cu: "CU-E6",
    archivo: "16-alt-sin-medicion",
    ruta: "/dashboard",
    cuenta: "admin@sgr.demo",
    titulo: "Informar delegación sin medición",
    // La Pampa no tiene a nadie con metas: se informa «sin medición», nunca 0%
    // (ADR-014). Está así a propósito en el seed.
    //
    // El tablero tiene DOS avisos con la misma clase —el otro declara que los
    // parámetros esperan definición del docente— y el de arriba es el otro.
    foco: '.dash-aviso:has-text("Sin medición")',
  },
  {
    // No es uno de los nueve, pero es el mismo tipo de escenario y sale de la
    // misma decisión legal: para un delegado, la atención de otra delegación
    // viaja reducida (ADR-012). Se captura porque es lo que hace visible que la
    // trazabilidad del vecino NO abre el libro ajeno.
    cu: "ADR-012",
    archivo: "17-alt-alcance-reducido",
    ruta: `/vecinos?q=${RUT_CASO}`,
    cuenta: "delegado.centro@sgr.demo",
    titulo: "Alcance reducido entre delegaciones",
    foco: ".vecinos-reserva",
    // Con el historial debajo: el aviso dice «35 atenciones se ven reducidas» y
    // sin las filas a la vista no se entiende de qué está hablando.
    focoExtra: 360,
  },
];

const PANTALLAS = [...CAMINO_FELIZ, ...ESCENARIOS];

async function sesion(email) {
  const r = await fetch(`${API}/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password: "matriz123" }),
  });
  if (!r.ok) throw new Error(`login ${email}: ${r.status}`);
  return r.json();
}

/**
 * El backend visto como una SEGUNDA SESIÓN de la misma cuenta. Es lo que
 * permite que el conflicto de versión sea real: alguien más guardó primero.
 */
function apiDe(s, archivo) {
  const pedir = async (metodo, ruta, cuerpo) => {
    if (!s) throw new Error(`${archivo}: el hook pide la API y la pantalla no tiene cuenta`);
    const r = await fetch(`${API}${ruta}`, {
      method: metodo,
      headers: {
        authorization: `Bearer ${s.token}`,
        ...(cuerpo ? { "content-type": "application/json" } : {}),
      },
      body: cuerpo ? JSON.stringify(cuerpo) : undefined,
    });
    if (!r.ok) throw new Error(`${archivo}: ${metodo} ${ruta} → ${r.status}`);
    return r.json();
  };
  return {
    get: (ruta) => pedir("GET", ruta),
    patch: (ruta, cuerpo) => pedir("PATCH", ruta, cuerpo),
    post: (ruta, cuerpo) => pedir("POST", ruta, cuerpo),
  };
}

/**
 * Qué área retrata el PNG. Sin `foco`, la página entera, como siempre.
 * Con `foco`, una FRANJA de ancho completo alrededor del elemento: el mensaje
 * se lee, y sigue pareciendo la aplicación y no un recorte flotante.
 *
 * Si el elemento no está, esto REVIENTA a propósito. Un escenario que no se
 * produjo y se guarda igual como página entera es un entregable que miente.
 */
async function encuadre(page, selector, archivo, extra = 0) {
  if (!selector) return { fullPage: true };
  const elemento = page.locator(selector).first();
  if ((await elemento.count()) === 0) {
    throw new Error(`${archivo}: el escenario no se produjo — no existe "${selector}" en la página`);
  }
  await elemento.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  const caja = await elemento.boundingBox();
  if (!caja) throw new Error(`${archivo}: "${selector}" existe pero no es visible`);
  const vista = page.viewportSize();
  const margen = 28;
  const y = Math.max(0, caja.y - margen);
  return {
    clip: {
      x: 0,
      y,
      width: vista.width,
      // `extra` estira la franja hacia abajo: hay mensajes que solo se
      // entienden con lo que están calificando a la vista.
      height: Math.min(vista.height - y, caja.height + margen * 2 + extra),
    },
  };
}

await mkdir(destino, { recursive: true });
const navegador = await chromium.launch({ channel: "msedge", headless: true });
const generados = [];

try {
  for (const pantalla of PANTALLAS) {
    // Escala 1: el PNG es un índice para GitHub y la ficha mide ~9.000 px de
    // alto; a 2x pesaba 2,7 MB ella sola. El detalle fino vive en el .html.
    const ctx = await navegador.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
    let credenciales = null;
    if (pantalla.cuenta) {
      credenciales = await sesion(pantalla.cuenta);
      await ctx.addInitScript((s) => localStorage.setItem("matriz.auth", JSON.stringify(s)), credenciales);
    }
    const page = await ctx.newPage();
    await page.goto(`${UI}${pantalla.ruta}`, { waitUntil: "networkidle" });
    // Que terminen las entradas en cascada, los contadores y los gráficos
    await page.waitForTimeout(1800);

    // El escenario alternativo se PRODUCE, no se dibuja: se opera la pantalla
    // igual que una persona y, si hace falta, otra sesión escribe en paralelo.
    if (pantalla.acciones) {
      await pantalla.acciones({ page, api: apiDe(credenciales, pantalla.archivo) });
      await page.waitForTimeout(700); // que se pinte lo que la acción produjo
    }

    await page.screenshot({
      path: path.join(destino, `${pantalla.archivo}.png`),
      ...(await encuadre(page, pantalla.foco, pantalla.archivo, pantalla.focoExtra ?? 0)),
    });

    const html = await page.evaluate(async ({ titulo, cu }) => {
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
        `SGR — ${cu ? `${cu} · ` : ""}${titulo} · Mockup estático generado desde la aplicación real. ` +
        "Datos ficticios. Los botones no responden: es una fotografía navegable, no la aplicación.";
      doc.querySelector("body").appendChild(aviso);

      const t = doc.querySelector("title");
      if (t) t.textContent = `SGR — ${titulo} (mockup)`;
      return "<!doctype html>\n" + doc.outerHTML;
    }, { titulo: pantalla.titulo, cu: pantalla.cu ?? null });

    await writeFile(path.join(destino, `${pantalla.archivo}.html`), html, "utf8");
    generados.push({ ...pantalla, bytes: Buffer.byteLength(html) });
    await ctx.close();
  }
} finally {
  await navegador.close();
}

for (const g of generados) {
  const etiqueta = g.cu ? `${g.cu.padEnd(6)} ` : "       ";
  console.log(`${etiqueta}${g.archivo}.html  ${(g.bytes / 1024).toFixed(0)} KB  ${g.titulo}`);
}
const escenarios = generados.filter((g) => g.cu).length;
console.log(
  `\n${generados.length} mockups (.html + .png) en ${destino}: ` +
    `${generados.length - escenarios} del camino feliz y ${escenarios} escenarios alternativos`
);
