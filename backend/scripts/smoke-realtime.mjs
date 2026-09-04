// Prueba de humo del tiempo real, permisos y visibilidad de Matriz SGR.
// Ejecutar desde /backend con el servidor corriendo: npm run smoke
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

const admin = await login("admin@sgr.demo");
const funcionario = await login("territorial.centro@sgr.demo"); // Gabriel, delegación Centro

// 2. Datos base: delegaciones Centro y Avenida del Mar; tareas del Centro
const unidadesAdmin = await (await fetch(`${API}/unidades`, { headers: { Authorization: `Bearer ${admin.token}` } })).json();
const centro = unidadesAdmin.find((u) => u.nombre === "Centro");
const otraUnidad = unidadesAdmin.find((u) => u.nombre === "Rural");
const tareas = await (await fetch(`${API}/tareas?unidad=${centro.id}`, { headers: { Authorization: `Bearer ${admin.token}` } })).json();
const tareaAjena = tareas.find((t) => t.responsable?.nombre.includes("Javiera"));
const tareaPropia = tareas.find((t) => t.responsable?.nombre.includes("Gabriel"));

// 3. VISIBILIDAD (libro privado por delegación, reunión 00:37:11):
// el funcionario del Centro ve su libro pero NO el de Avenida del Mar.
const unidadesFunc = await (await fetch(`${API}/unidades`, { headers: { Authorization: `Bearer ${funcionario.token}` } })).json();
const otraUnidadFunc = unidadesFunc.find((u) => u.nombre === "Rural");
const centroFunc = unidadesFunc.find((u) => u.nombre === "Centro");
check("funcionario: Centro con libro visible", centroFunc?.puedeVerLibro === true);
check("funcionario: Rural sin libro", otraUnidadFunc?.puedeVerLibro === false);
const rLibroAjeno = await fetch(`${API}/tareas?unidad=${otraUnidad.id}`, {
  headers: { Authorization: `Bearer ${funcionario.token}` },
});
check("GET tareas de otra delegación → 404", rLibroAjeno.status === 404, `status ${rLibroAjeno.status}`);

// 4. El semáforo consolidado SÍ es visible para todos (Efecto Hawthorne).
// Bloque C: antes se leía de `GET /kpis/cumplimiento` (vista materializada v1).
// Hoy sale del motor por funcionario, consolidado por delegación.
const periodos = await (await fetch(`${API}/periodos`, {
  headers: { Authorization: `Bearer ${funcionario.token}` },
})).json();
const periodoAbierto = periodos.find((p) => p.estado === "abierto") ?? periodos[0];
const rCons = await fetch(`${API}/cumplimiento/${periodoAbierto.id}/consolidado`, {
  headers: { Authorization: `Bearer ${funcionario.token}` },
});
const cons = await rCons.json();
check("funcionario ve el semáforo consolidado", rCons.status === 200 && cons.delegaciones.length >= 2,
  `${cons.delegaciones?.length} delegaciones, ${cons.totales?.funcionarios} funcionarios medidos`);
const colores = new Set(cons.delegaciones.map((d) => d.semaforo));
check("semáforo con verde/naranjo/rojo", ["verde", "naranjo", "rojo"].every((c) => colores.has(c)),
  [...colores].join(","));
const filaRural = cons.delegaciones.find((d) => d.nombre === "Rural");
check("el consolidado expone objetivo al día y avance relativo",
  typeof filaRural?.objetivoAlDia === "number" && typeof filaRural?.avanceRelativo === "number",
  `objetivo=${filaRural?.objetivoAlDia} relativo=${filaRural?.avanceRelativo}`);
// Lo que la vista v1 no sabía decir: una delegación sin nadie medido no es 0%.
check("una delegación sin funcionarios medidos se informa aparte, no como 0%",
  cons.sinMedicion.length > 0 &&
    !cons.delegaciones.some((d) => d.unidadTerritorialId === cons.sinMedicion[0].unidadTerritorialId),
  cons.sinMedicion.map((u) => u.nombre).join(", "));
check("el mapa se agrupa por área del cargo", cons.areas.length >= 3, cons.areas.join(", "));
// El cálculo v1 ya no existe: si respondiera, habría dos verdades otra vez.
const rV1 = await fetch(`${API}/kpis/cumplimiento?trimestre=2026-Q3`, {
  headers: { Authorization: `Bearer ${funcionario.token}` },
});
const rMetasV1 = await fetch(`${API}/metas`, {
  headers: { Authorization: `Bearer ${funcionario.token}` },
});
check("el cálculo v1 dejó de existir (/kpis/cumplimiento y /metas → 404)",
  rV1.status === 404 && rMetasV1.status === 404, `kpis ${rV1.status}, metas ${rMetasV1.status}`);

// 5. Permisos de edición: el funcionario no mueve tareas ajenas.
// El cuerpo lleva `version` a propósito: la petición debe fallar por PERMISOS
// (403), no por estar mal formada (400), o la prueba dejaría de probar lo suyo.
const r403 = await fetch(`${API}/tareas/${tareaAjena.id}`, {
  method: "PATCH",
  headers: { "Content-Type": "application/json", Authorization: `Bearer ${funcionario.token}` },
  body: JSON.stringify({ estado: "realizado", version: tareaAjena.version }),
});
check("usuario no mueve tarea ajena", r403.status === 403, `status ${r403.status}`);

// 6. Socket: join a su delegación OK (con presencia), join a ajena rechazado
const socket = io(API, { auth: { token: funcionario.token }, reconnection: false });
await new Promise((resolve, reject) => {
  socket.on("connect", resolve);
  socket.on("connect_error", reject);
});
// El servidor emite presencia ANTES de responder el ack del join:
// registrar el listener primero para no perder el evento.
const presenciaPromise = new Promise((res) => socket.once("presencia:actualizada", res));
const joinOk = await new Promise((res) => socket.emit("unidad:join", centro.id, res));
check("join al room de su delegación", joinOk === true);
const presencia = await presenciaPromise;
check("presencia en vivo", presencia.conectados.some((c) => c.nombre.includes("Gabriel")),
  `${presencia.conectados.length} conectados`);
const joinAjeno = await new Promise((res) => socket.emit("unidad:join", otraUnidad.id, res));
check("join al room de otra delegación rechazado", joinAjeno === false);

// 7. Mueve SU tarea → 200 y el room recibe tarea:actualizada
const eventoPromise = new Promise((res) => socket.once("tarea:actualizada", res));
const rOk = await fetch(`${API}/tareas/${tareaPropia.id}`, {
  method: "PATCH",
  headers: { "Content-Type": "application/json", Authorization: `Bearer ${funcionario.token}` },
  body: JSON.stringify({ estado: "en_proceso", version: tareaPropia.version }),
});
check("usuario mueve su propia tarea", rOk.status === 200, `status ${rOk.status}`);

// 7.bis CA-08 · ADR-005: repetir el movimiento con la versión ya consumida no
// sobrescribe, responde 409 con el registro vigente. Era el hueco del tubo.
const rConflicto = await fetch(`${API}/tareas/${tareaPropia.id}`, {
  method: "PATCH",
  headers: { "Content-Type": "application/json", Authorization: `Bearer ${funcionario.token}` },
  body: JSON.stringify({ estado: "realizado", version: tareaPropia.version }),
});
const conflicto = await rConflicto.json();
check("CA-08 mover con versión vencida → 409 con el registro vigente",
  rConflicto.status === 409 && conflicto.versionActual === tareaPropia.version + 1 &&
  conflicto.registro?.estado === "en_proceso",
  `status ${rConflicto.status} versionActual=${conflicto.versionActual}`);
const evento = await Promise.race([
  eventoPromise,
  new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 3000)),
]).catch(() => null);
check("evento tarea:actualizada llega al room", evento?.id === tareaPropia.id && evento?.estado === "en_proceso");

// 8. Endpoints de Fase 4: directorio de usuarios y estadísticas del tubo
const delegado = await login("delegado.centro@sgr.demo");
const equipo = await (await fetch(`${API}/usuarios?unidad=${centro.id}`, {
  headers: { Authorization: `Bearer ${delegado.token}` },
})).json();
// El cargo se busca por el nombre que define el seed. Antes decía "Territorial 1",
// que solo existía en las cuentas @demo.cl de la Fase 2: la comprobación pasaba
// gracias a datos fósiles que ningún seed regeneraba (Bloque C).
check("GET /usuarios con cargos", equipo.some((m) => m.cargo === "Territorial OO.CC. 1"),
  `${equipo.length} miembros`);
const tuboStats = await (await fetch(`${API}/kpis/tubo`, {
  headers: { Authorization: `Bearer ${funcionario.token}` },
})).json();
const statCentro = tuboStats.find((s) => s.unidadNombre === "Centro");
check("GET /kpis/tubo agregado", tuboStats.length === 6 && typeof statCentro?.vencidas === "number",
  `Centro: ${JSON.stringify(statCentro?.estados)} vencidas=${statCentro?.vencidas}`);

// 9. El delegado crea una tarea (HU-3.2) → 201 y el room recibe tarea:creada
const creadaPromise = new Promise((res) => socket.once("tarea:creada", res));
const rCrear = await fetch(`${API}/tareas`, {
  method: "POST",
  headers: { "Content-Type": "application/json", Authorization: `Bearer ${delegado.token}` },
  body: JSON.stringify({
    titulo: "Tarea de prueba smoke",
    unidadTerritorialId: centro.id,
    categoriaId: tareaPropia.categoriaId,
    responsableId: funcionario.usuario.id,
  }),
});
const creada = await rCrear.json();
check("delegado crea tarea", rCrear.status === 201, `status ${rCrear.status}`);
const eventoCreada = await Promise.race([
  creadaPromise,
  new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 3000)),
]).catch(() => null);
check("evento tarea:creada llega al room", eventoCreada?.id === creada.id);
// limpieza
await fetch(`${API}/tareas/${creada.id}`, {
  method: "DELETE",
  headers: { Authorization: `Bearer ${delegado.token}` },
});

socket.close();
console.log(resultados.join("\n"));
process.exit(resultados.some((r) => r.startsWith("FAIL")) ? 1 : 0);
