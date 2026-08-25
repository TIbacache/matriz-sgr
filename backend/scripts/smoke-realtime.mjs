// Prueba de humo del tiempo real y permisos de Matriz SGR.
// Ejecutar desde /backend: node <ruta>/smoke-realtime.mjs
import { io } from "socket.io-client";

const API = "http://localhost:4000";
const resultados = [];
// Cinturón de seguridad: si algo cuelga, reportar y salir con error.
setTimeout(() => {
  console.log(resultados.join("\n"));
  console.error("TIMEOUT GLOBAL: alguna prueba quedó colgada");
  process.exit(1);
}, 30_000);
const check = (nombre, ok, detalle = "") =>
  resultados.push(`${ok ? "PASS" : "FAIL"} - ${nombre}${detalle ? ` (${detalle})` : ""}`);

async function login(email) {
  const r = await fetch(`${API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: "matriz123" }),
  });
  return (await r.json());
}

// 1. Socket sin token debe rechazarse en el handshake
await new Promise((resolve) => {
  const s = io(API, { reconnection: false });
  s.on("connect", () => { check("handshake sin token rechazado", false); s.close(); resolve(); });
  s.on("connect_error", (e) => { check("handshake sin token rechazado", true, e.message); resolve(); });
});

const admin = await login("admin@demo.cl");
const func1 = await login("funcionario1@demo.cl");

// 2. Datos base: unidad Norte y una tarea de funcionaria2 (ajena a funcionario1)
const unidades = await (await fetch(`${API}/unidades`, { headers: { Authorization: `Bearer ${admin.token}` } })).json();
const norte = unidades.find((u) => u.nombre.includes("Norte"));
const tareas = await (await fetch(`${API}/tareas?unidad=${norte.id}`, { headers: { Authorization: `Bearer ${admin.token}` } })).json();
const tareaAjena = tareas.find((t) => t.responsable?.nombre.includes("Francisca"));
const tareaPropia = tareas.find((t) => t.responsable?.nombre.includes("Fernando"));

// 3. funcionario1 NO puede mover tarea ajena → 403
const r403 = await fetch(`${API}/tareas/${tareaAjena.id}`, {
  method: "PATCH",
  headers: { "Content-Type": "application/json", Authorization: `Bearer ${func1.token}` },
  body: JSON.stringify({ estado: "realizado" }),
});
check("usuario no mueve tarea ajena", r403.status === 403, `status ${r403.status}`);

// 4. Socket autenticado entra al room Norte y recibe presencia + evento de tarea
const socket = io(API, { auth: { token: func1.token }, reconnection: false });
await new Promise((resolve, reject) => {
  socket.on("connect", resolve);
  socket.on("connect_error", reject);
});
// El servidor emite presencia ANTES de responder el ack del join:
// registrar el listener primero para no perder el evento.
const presenciaPromise = new Promise((res) => socket.once("presencia:actualizada", res));
const joinOk = await new Promise((res) => socket.emit("unidad:join", norte.id, res));
check("join al room de su unidad", joinOk === true);

const presencia = await presenciaPromise;
check("presencia en vivo", presencia.conectados.some((c) => c.nombre.includes("Fernando")),
  `${presencia.conectados.length} conectados`);

// join a unidad de otra org inexistente → false
const joinMalo = await new Promise((res) => socket.emit("unidad:join", "00000000-0000-0000-0000-00000000dead", res));
check("join a unidad ajena/inexistente rechazado", joinMalo === false);

// 5. funcionario1 mueve SU tarea → 200 y el room recibe tarea:actualizada
const eventoPromise = new Promise((res) => socket.once("tarea:actualizada", res));
const rOk = await fetch(`${API}/tareas/${tareaPropia.id}`, {
  method: "PATCH",
  headers: { "Content-Type": "application/json", Authorization: `Bearer ${func1.token}` },
  body: JSON.stringify({ estado: "en_proceso" }),
});
check("usuario mueve su propia tarea", rOk.status === 200, `status ${rOk.status}`);
const evento = await Promise.race([eventoPromise, new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 3000))])
  .catch((e) => null);
check("evento tarea:actualizada llega al room", evento?.id === tareaPropia.id && evento?.estado === "en_proceso");

socket.close();
console.log(resultados.join("\n"));
process.exit(resultados.some((r) => r.startsWith("FAIL")) ? 1 : 0);
