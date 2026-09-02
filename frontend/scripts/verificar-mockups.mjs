// Abre los mockups desde file:// con la red BLOQUEADA y sin los servidores:
// es exactamente lo que hará el docente al bajar el adjunto de Planner.
import { readdir } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright-core";

const dir = path.resolve("..", "docs", "mockups");
const salida = process.argv[2];
const b = await chromium.launch({ channel: "msedge" });
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
await ctx.route("http://**", (r) => r.abort());
await ctx.route("https://**", (r) => r.abort());
const page = await ctx.newPage();
const errores = [];
page.on("pageerror", (e) => errores.push(String(e)));

for (const f of (await readdir(dir)).filter((f) => f.endsWith(".html"))) {
  await page.goto(pathToFileURL(path.join(dir, f)).href, { waitUntil: "load" });
  await page.waitForTimeout(700);
  const info = await page.evaluate(() => ({
    reglas: [...document.styleSheets].reduce((n, h) => { try { return n + h.cssRules.length; } catch { return n; } }, 0),
    scripts: document.querySelectorAll("script").length,
    imgs: [...document.querySelectorAll("img")].map((i) => i.naturalWidth > 0),
    fondoBarra: getComputedStyle(document.querySelector(".layout-sidebar") ?? document.body).backgroundColor,
  }));
  const imgsOk = info.imgs.length === 0 ? "sin imgs" : `${info.imgs.filter(Boolean).length}/${info.imgs.length} imgs`;
  console.log(`${f}: ${info.reglas} reglas CSS · ${info.scripts} scripts · ${imgsOk} · barra ${info.fondoBarra}`);
  if (salida) await page.screenshot({ path: path.join(salida, f.replace(".html", "-offline.png")), fullPage: true });
}
console.log(errores.length ? `ERRORES: ${errores.join(" | ")}` : "sin errores de JS");
await b.close();
