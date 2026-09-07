// Verifica la API del modelo v2: períodos, cargos, ítems, actividades,
// evidencias, validación y cumplimiento (Bloque A — épicas EP-01 y EP-03).
//
// Ejecutar desde /backend con el servidor corriendo:  npm run verificar:api
//
// Cada comprobación cita el requisito que demuestra, porque la matriz de
// trazabilidad exige que una historia no se dé por terminada sin prueba.
// El script limpia lo que crea: al terminar, la base queda como estaba.
import { prisma } from "../src/lib/prisma.js";
import { calcularDv, formatearRut } from "../src/lib/rut.js";
import { eliminarArchivo } from "../src/services/almacenamiento.js";

const API = "http://localhost:4000";
const resultados: string[] = [];
const check = (nombre: string, ok: boolean, detalle = "") =>
  resultados.push(`${ok ? "PASS" : "FAIL"} - ${nombre}${detalle ? ` (${detalle})` : ""}`);

// Rastro de lo creado, para limpiar al final
const creado = {
  actividades: [] as string[],
  evidencias: [] as { id: string; ruta: string }[],
  periodos: [] as string[],
  cargos: [] as string[],
  items: [] as string[],
  personas: [] as string[],
  // Bloque A3 — rutas heredadas. La delegación de prueba hay que borrarla de
  // verdad al terminar: si quedara desactivada, el smoke dejaría de contar 6.
  categorias: [] as string[],
  unidades: [] as string[],
  tareas: [] as string[],
};

async function login(email: string): Promise<{ token: string; usuario: { id: string } }> {
  const r = await fetch(`${API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: "matriz123" }),
  });
  if (!r.ok) throw new Error(`Login falló para ${email}: ${r.status}`);
  return r.json() as Promise<{ token: string; usuario: { id: string } }>;
}

function api(token: string) {
  return async (
    metodo: string,
    ruta: string,
    cuerpo?: unknown,
    extra?: { headers?: Record<string, string>; binario?: Buffer }
  ) => {
    const headers: Record<string, string> = { Authorization: `Bearer ${token}`, ...extra?.headers };
    let body: BodyInit | undefined;
    if (extra?.binario) {
      body = new Uint8Array(extra.binario);
    } else if (cuerpo !== undefined) {
      headers["Content-Type"] = "application/json";
      body = JSON.stringify(cuerpo);
    }
    const r = await fetch(`${API}${ruta}`, { method: metodo, headers, body });
    const texto = await r.text();
    let datos: unknown = texto;
    try {
      datos = JSON.parse(texto);
    } catch {
      /* respuesta binaria o vacía */
    }
    return { status: r.status, datos: datos as never, bytes: texto.length };
  };
}

const admin = await login("admin@sgr.demo");
const supervisor = await login("coordinador@sgr.demo");
const verificador = await login("verificador@sgr.demo");
const consulta = await login("consulta@sgr.demo");
const gabriel = await login("territorial.centro@sgr.demo"); // funcionario, Centro
const ignacio = await login("territorial.rural@sgr.demo"); // funcionario, Rural

const A = api(admin.token);
const S = api(supervisor.token);
const V = api(verificador.token);
const C = api(consulta.token);
const G = api(gabriel.token);
const I = api(ignacio.token);

// ===========================================================================
// 1. PERÍODOS — RF-005 · RN-013 · CA-10 · HU-28
// ===========================================================================

const sufijo = Date.now().toString().slice(-6);
const nuevoPeriodo = await A("POST", "/periodos", {
  nombre: `Período de prueba ${sufijo}`,
  fechaInicio: "2027-01-01",
  fechaTermino: "2027-03-31",
});
if (nuevoPeriodo.status === 201) creado.periodos.push((nuevoPeriodo.datos as { id: string }).id);
check(
  "RF-005 crear período calcula sus días desde las fechas",
  nuevoPeriodo.status === 201 && (nuevoPeriodo.datos as { diasTotales: number }).diasTotales === 90,
  `status ${nuevoPeriodo.status}, días=${(nuevoPeriodo.datos as { diasTotales?: number }).diasTotales} (1/1 a 31/3/2027, NO fijado en código)`
);

const periodoPrueba = nuevoPeriodo.datos as { id: string; version: number };

const solapado = await A("POST", "/periodos", {
  nombre: `Solapado ${sufijo}`,
  fechaInicio: "2027-02-01",
  fechaTermino: "2027-04-30",
});
check("RF-010 rechaza períodos solapados", solapado.status === 422, `status ${solapado.status}`);

const sinPermiso = await G("POST", "/periodos", {
  nombre: `Sin permiso ${sufijo}`,
  fechaInicio: "2028-01-01",
  fechaTermino: "2028-03-31",
});
check("RNF-005 un funcionario no configura períodos", sinPermiso.status === 403, `status ${sinPermiso.status}`);

// Bloqueo optimista: dos ediciones con la misma versión → la segunda es 409
const edicion1 = await A("PATCH", `/periodos/${periodoPrueba.id}`, {
  version: periodoPrueba.version,
  nombre: `Período de prueba ${sufijo} (editado)`,
});
const edicion2 = await A("PATCH", `/periodos/${periodoPrueba.id}`, {
  version: periodoPrueba.version, // versión ya consumida
  nombre: "Intento simultáneo",
});
check("CA-08 / ADR-005 edición con versión vieja → 409", edicion1.status === 200 && edicion2.status === 409,
  `primera ${edicion1.status}, segunda ${edicion2.status}, versionActual=${(edicion2.datos as { versionActual?: number }).versionActual}`);

const versionTrasEdicion = (edicion1.datos as { version: number }).version;
const cierre = await S("POST", `/periodos/${periodoPrueba.id}/cierre`, { version: versionTrasEdicion });
check("RN-013 cierre de período", cierre.status === 200 && (cierre.datos as { estado: string }).estado === "cerrado",
  `status ${cierre.status}`);

const editarCerrado = await A("PATCH", `/periodos/${periodoPrueba.id}`, {
  version: (cierre.datos as { version: number }).version,
  nombre: "No debería poder",
});
check("CA-10 un período cerrado no se modifica", editarCerrado.status === 422, `status ${editarCerrado.status}`);

const reaperturaSupervisor = await S("POST", `/periodos/${periodoPrueba.id}/reapertura`, {
  version: (cierre.datos as { version: number }).version,
  motivo: "Intento no autorizado de reapertura",
});
check("RN-013 la reapertura exige autorización (solo admin)", reaperturaSupervisor.status === 403,
  `status ${reaperturaSupervisor.status}`);

const reaperturaSinMotivo = await A("POST", `/periodos/${periodoPrueba.id}/reapertura`, {
  version: (cierre.datos as { version: number }).version,
});
check("RN-013 la reapertura exige motivo", reaperturaSinMotivo.status === 400, `status ${reaperturaSinMotivo.status}`);

const reapertura = await A("POST", `/periodos/${periodoPrueba.id}/reapertura`, {
  version: (cierre.datos as { version: number }).version,
  motivo: "Corrección de metas solicitada por la coordinación",
});
check("RN-013 reapertura autorizada", reapertura.status === 200 && (reapertura.datos as { estado: string }).estado === "abierto",
  `status ${reapertura.status}`);

const auditoriaPeriodo = await prisma.auditoria.findMany({
  where: { entidad: "periodo", entidadId: periodoPrueba.id },
  orderBy: { createdAt: "asc" },
});
const acciones = auditoriaPeriodo.map((a) => a.accion);
check(
  "RNF-008 / CA-09 el ciclo del período queda auditado con valor anterior y nuevo",
  ["crear", "actualizar", "cerrar_periodo", "reabrir_periodo"].every((a) => acciones.includes(a as never)) &&
    auditoriaPeriodo.some((a) => a.accion === "actualizar" && a.valorAnterior !== null && a.valorNuevo !== null),
  acciones.join(" → ")
);
const motivoAuditado = auditoriaPeriodo.find((a) => a.accion === "reabrir_periodo");
check(
  "RN-013 el motivo de reapertura queda en la bitácora inmutable",
  JSON.stringify(motivoAuditado?.valorNuevo ?? {}).includes("Corrección de metas"),
  `usuario=${motivoAuditado?.usuarioId === admin.usuario.id ? "admin" : "?"}`
);

const consultaPeriodos = await C("GET", "/periodos");
check("El rol consulta lee períodos", consultaPeriodos.status === 200,
  `${(consultaPeriodos.datos as unknown[]).length} períodos`);

// ===========================================================================
// 2. CARGOS E ÍTEMS — RF-003 · RF-006 · HU-04
// ===========================================================================

const cargosResp = await A("GET", "/cargos");
const cargos = cargosResp.datos as {
  id: string;
  nombre: string;
  area: string | null;
  version: number;
  items: { id: string; nombre: string; cargoId: string }[];
}[];
const cargoTerritorial = cargos.find((c) => c.nombre === "Territorial OO.CC. 1")!;
const cargoSocial = cargos.find((c) => c.nombre === "Gestor Social 1")!;
check("RF-003 GET /cargos entrega cargos con sus ítems", cargosResp.status === 200 && cargoTerritorial.items.length > 0,
  `${cargos.length} cargos, ${cargoTerritorial.items.length} ítems en "${cargoTerritorial.nombre}"`);

const cargoNuevo = await A("POST", "/cargos", { nombre: `Cargo de prueba ${sufijo}`, area: "PRUEBA" });
if (cargoNuevo.status === 201) creado.cargos.push((cargoNuevo.datos as { id: string }).id);
check("RF-003 crear cargo", cargoNuevo.status === 201, `status ${cargoNuevo.status}`);

const cargoDuplicado = await A("POST", "/cargos", { nombre: `Cargo de prueba ${sufijo}` });
check("RF-010 nombre de cargo duplicado rechazado", cargoDuplicado.status === 422, `status ${cargoDuplicado.status}`);

const itemNuevo = await A("POST", "/items", {
  cargoId: (cargoNuevo.datos as { id: string }).id,
  nombre: "Ítem inverso de prueba",
  tipo: "porcentaje",
  direccion: "menor_mejor",
});
if (itemNuevo.status === 201) creado.items.push((itemNuevo.datos as { id: string }).id);
check("ADR-009 crear ítem con tipo y dirección",
  itemNuevo.status === 201 && (itemNuevo.datos as { direccion: string }).direccion === "menor_mejor",
  `status ${itemNuevo.status}`);

const itemDesactivado = await A("PATCH", `/items/${(itemNuevo.datos as { id: string }).id}`, {
  version: (itemNuevo.datos as { version: number }).version,
  activo: false,
});
check("RF-003 los ítems se desactivan, no se borran",
  itemDesactivado.status === 200 && (itemDesactivado.datos as { activo: boolean }).activo === false &&
    (itemDesactivado.datos as { version: number }).version === (itemNuevo.datos as { version: number }).version + 1,
  `versión ${(itemNuevo.datos as { version: number }).version} → ${(itemDesactivado.datos as { version?: number }).version}`);

const itemSinPermiso = await G("POST", "/items", {
  cargoId: cargoTerritorial.id,
  nombre: "No debería crearse",
});
check("RNF-005 un funcionario no configura ítems", itemSinPermiso.status === 403, `status ${itemSinPermiso.status}`);

// ===========================================================================
// 3. ACTIVIDADES — RF-009 · RF-010 · RF-011 · HU-01
// ===========================================================================

const periodoVigente = (await A("GET", "/periodos?estado=abierto")).datos as {
  id: string;
  nombre: string;
  fechaInicio: string;
}[];
const periodoActivo = periodoVigente.find((p) => p.nombre === "3er trimestre 2026")!;
const itemTerritorial = cargoTerritorial.items.find((i) => i.nombre.startsWith("Visitas"))!;
const itemAjeno = cargoSocial.items[0]!;

const cuerpoBase = {
  periodoId: periodoActivo.id,
  fecha: "2026-07-15",
  descripcion: "Reunión con junta de vecinos por mejoramiento de plaza (prueba automatizada)",
  accion: "Se levantó acta y se derivó a DISERCO",
  itemId: itemTerritorial.id,
};

const act1 = await G("POST", "/actividades", cuerpoBase);
if (act1.status === 201) creado.actividades.push((act1.datos as { id: string }).id);
const actividad1 = act1.datos as { id: string; codigo: string; version: number; unidad: { nombre: string } };
check("RF-009 registrar actividad", act1.status === 201, `status ${act1.status}`);
check("RF-011 / ADR-004 el servidor genera un código no ambiguo",
  /^[A-Z]{3}-\d{8}-\d{4}$/.test(actividad1.codigo ?? ""), actividad1.codigo);
check("La delegación se deriva de la membresía, no del cliente", actividad1.unidad?.nombre === "Centro",
  actividad1.unidad?.nombre);

const act2 = await G("POST", "/actividades", { ...cuerpoBase, descripcion: "Segundo registro de prueba" });
if (act2.status === 201) creado.actividades.push((act2.datos as { id: string }).id);
const codigo2 = (act2.datos as { codigo: string }).codigo;
check("RN-010 el correlativo avanza y los códigos no se repiten",
  codigo2 !== actividad1.codigo && Number(codigo2.slice(-4)) === Number(actividad1.codigo.slice(-4)) + 1,
  `${actividad1.codigo} → ${codigo2}`);

const itemDeOtroCargo = await G("POST", "/actividades", { ...cuerpoBase, itemId: itemAjeno.id });
check("RF-003 / RF-010 no se puede sumar a un ítem de otro cargo", itemDeOtroCargo.status === 422,
  `status ${itemDeOtroCargo.status}`);

const fechaFuera = await G("POST", "/actividades", { ...cuerpoBase, fecha: "2026-12-01" });
check("RF-010 fecha fuera del período rechazada", fechaFuera.status === 422, `status ${fechaFuera.status}`);

const rutMalo = await G("POST", "/actividades", {
  ...cuerpoBase,
  persona: { rut: "216944", nombres: "Dato", apellidoPaterno: "Sucio" },
});
check("RF-010 / ADR-001 RUT inválido rechazado (el dato sucio de la planilla real)",
  rutMalo.status === 422, `status ${rutMalo.status}`);

const fonoMalo = await G("POST", "/actividades", { ...cuerpoBase, contactoFono: "123" });
check("RF-010 teléfono inválido rechazado", fonoMalo.status === 422, `status ${fonoMalo.status}`);

// ADR-008: el mismo vecino atendido en dos delegaciones distintas
const cuerpoRut = "20345678";
const rutVecino = `${cuerpoRut}-${calcularDv(cuerpoRut)}`;
const actConPersona = await G("POST", "/actividades", {
  ...cuerpoBase,
  descripcion: "Solicitud de caja de emergencia (prueba)",
  persona: {
    rut: formatearRut(rutVecino), // se envía con puntos, se guarda canónico
    nombres: "Vecina",
    apellidoPaterno: "DePrueba",
    telefono: "+56 9 1234 5678",
  },
});
if (actConPersona.status === 201) creado.actividades.push((actConPersona.datos as { id: string }).id);
const personaCreada = (actConPersona.datos as { personaUsuaria: { id: string; rut: string } }).personaUsuaria;
if (personaCreada) creado.personas.push(personaCreada.id);
check("ADR-001 el RUT se normaliza al formato canónico", personaCreada?.rut === rutVecino,
  `enviado "${formatearRut(rutVecino)}" → guardado "${personaCreada?.rut}"`);

const actRural = await I("POST", "/actividades", {
  periodoId: periodoActivo.id,
  fecha: "2026-07-16",
  descripcion: "La misma vecina pide lo mismo en otra delegación (prueba)",
  itemId: itemTerritorial.id,
  persona: { rut: rutVecino, nombres: "Vecina", apellidoPaterno: "DePrueba" },
});
if (actRural.status === 201) creado.actividades.push((actRural.datos as { id: string }).id);
const alerta = (actRural.datos as { alertaTrazabilidad: { delegaciones: string[] } | null }).alertaTrazabilidad;
check("ADR-008 / CA-04 se detecta a la misma persona atendida en otra delegación",
  alerta !== null && alerta.delegaciones.includes("Centro"), alerta?.mensaje ?? "sin alerta");
const personasConEseRut = await prisma.personaUsuaria.count({ where: { rut: rutVecino } });
check("ADR-008 el RUT es único por organización: no se duplicó la ficha", personasConEseRut === 1,
  `${personasConEseRut} ficha(s)`);

const patchViejo = await G("PATCH", `/actividades/${actividad1.id}`, { version: 99, descripcion: "Cambio" });
check("CA-08 PATCH de actividad con versión errada → 409", patchViejo.status === 409,
  `status ${patchViejo.status}, versionActual=${(patchViejo.datos as { versionActual?: number }).versionActual}`);

const patchOk = await G("PATCH", `/actividades/${actividad1.id}`, {
  version: actividad1.version,
  accion: "Acta firmada y derivada (corregido)",
});
check("RF-009 corregir una actividad aún no validada", patchOk.status === 200 &&
  (patchOk.datos as { version: number }).version === actividad1.version + 1, `status ${patchOk.status}`);

const verificadorRegistra = await V("POST", "/actividades", cuerpoBase);
check("RNF-005 el verificador no registra actividades", verificadorRegistra.status === 403,
  `status ${verificadorRegistra.status}`);
const consultaRegistra = await C("POST", "/actividades", cuerpoBase);
check("RNF-005 el rol consulta no registra actividades", consultaRegistra.status === 403,
  `status ${consultaRegistra.status}`);

const unidades = (await A("GET", "/unidades")).datos as { id: string; nombre: string }[];
const rural = unidades.find((u) => u.nombre === "Rural")!;
const libroAjeno = await G("GET", `/actividades?unidad=${rural.id}`);
check("CA-07 el libro de otra delegación no es visible (404)", libroAjeno.status === 404,
  `status ${libroAjeno.status}`);

// ===========================================================================
// 4. EVIDENCIAS — RF-012 · RNF-017 · HU-09
// ===========================================================================

// JPEG mínimo válido (cabecera SOI + EOI): sirve como archivo de prueba real
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0xff, 0xd9]);

const formatoMalo = await G("POST", `/actividades/${actividad1.id}/evidencias`, undefined, {
  binario: Buffer.from("no soy una foto"),
  headers: { "Content-Type": "text/plain" },
});
check("RNF-017 formato no permitido rechazado (415)", formatoMalo.status === 415,
  `permitidos: ${(formatoMalo.datos as { formatosPermitidos?: string[] }).formatosPermitidos?.join(", ")}`);

const enorme = Buffer.alloc(11 * 1024 * 1024, 1);
enorme.set(JPEG, 0);
const tamanoMalo = await G("POST", `/actividades/${actividad1.id}/evidencias`, undefined, {
  binario: enorme,
  headers: { "Content-Type": "image/jpeg" },
});
check("RNF-017 tamaño máximo del parámetro aplicado (413)", tamanoMalo.status === 413,
  (tamanoMalo.datos as { error?: string }).error ?? `status ${tamanoMalo.status}`);

const subida = await G("POST", `/actividades/${actividad1.id}/evidencias?nombre=../../etc/passwd.jpg`, undefined, {
  binario: JPEG,
  headers: { "Content-Type": "image/jpeg" },
});
const evidencia = subida.datos as { id: string; archivoRuta: string; archivoNombre: string; tamanoBytes: number };
if (subida.status === 201) creado.evidencias.push({ id: evidencia.id, ruta: evidencia.archivoRuta });
check("RF-012 subir evidencia asociada al código", subida.status === 201 &&
  evidencia.archivoRuta.includes(actividad1.codigo), `ruta ${evidencia.archivoRuta}`);
check("RNF-017 la ruta en disco la deriva el servidor, no el cliente",
  !evidencia.archivoRuta.includes("..") && !evidencia.archivoNombre.includes("/") &&
    !evidencia.archivoNombre.includes(".."),
  `nombre enviado "../../etc/passwd.jpg" → guardado "${evidencia.archivoNombre}"`);

const descarga = await G("GET", `/evidencias/${evidencia.id}/archivo`);
check("RNF-017 la evidencia se descarga por endpoint controlado", descarga.status === 200 &&
  evidencia.tamanoBytes === JPEG.length, `${evidencia.tamanoBytes} bytes`);

// La bandeja ordena por antigüedad (lo que lleva más esperando va primero),
// así que la recién subida queda al final: se pide la página completa.
const bandeja = await V("GET", `/evidencias?estado=pendiente&periodo=${periodoActivo.id}&limite=200`);
const enBandeja = (bandeja.datos as { evidencias: { id: string }[] }).evidencias.some((e) => e.id === evidencia.id);
check("HU-11 la evidencia entra a la bandeja del verificador", bandeja.status === 200 && enBandeja,
  `${(bandeja.datos as { total: number }).total} pendientes`);

// REGRESIÓN: con la cola por antigüedad y una página de 50, una evidencia
// recién subida quedaba en la posición 87 y era invisible en la pantalla.
// Por eso la bandeja ofrece "recientes primero" y paginación explícita.
const bandejaRecientes = await V(
  "GET",
  `/evidencias?estado=pendiente&periodo=${periodoActivo.id}&orden=recientes&limite=50`
);
const primeraPagina = (bandejaRecientes.datos as { evidencias: { id: string }[] }).evidencias;
check(
  "HU-11 lo recién subido es alcanzable en la primera página con orden=recientes",
  bandejaRecientes.status === 200 && primeraPagina[0]?.id === evidencia.id,
  `${(bandejaRecientes.datos as { total: number }).total} pendientes y la nueva encabeza la lista`
);

const pagina2 = await V(
  "GET",
  `/evidencias?estado=pendiente&periodo=${periodoActivo.id}&orden=recientes&limite=1&desde=1`
);
check(
  "HU-11 la cola pagina sin repetir (desde=)",
  (pagina2.datos as { evidencias: { id: string }[] }).evidencias[0]?.id !== evidencia.id &&
    (pagina2.datos as { evidencias: unknown[] }).evidencias.length === 1,
  "la segunda página trae otra evidencia"
);

// ===========================================================================
// 5. VALIDACIÓN — RF-013 · RF-014 · RN-009 · CA-01 · CA-02 · HU-11
// ===========================================================================

const autoValidacion = await G("POST", `/evidencias/${evidencia.id}/validacion`, { decision: "aprobada" });
check("RNF-005 el funcionario no valida su propia evidencia", autoValidacion.status === 403,
  `status ${autoValidacion.status}`);

const consultaValida = await C("POST", `/evidencias/${evidencia.id}/validacion`, { decision: "aprobada" });
check("RNF-005 el rol consulta no valida", consultaValida.status === 403, `status ${consultaValida.status}`);

const sinObservacion = await V("POST", `/evidencias/${evidencia.id}/validacion`, { decision: "rechazada" });
check("RF-013 / CA-02 rechazar exige observación", sinObservacion.status === 400, `status ${sinObservacion.status}`);

const correccion = await V("POST", `/evidencias/${evidencia.id}/validacion`, {
  decision: "correccion_solicitada",
  observacion: "La foto no muestra la fecha del acta; súbela nuevamente.",
});
check("RF-013 tres decisiones: se puede solicitar corrección", correccion.status === 201,
  `status ${correccion.status}`);

// RN-009: hasta aquí la actividad NO debe sumar
const antes = (await A("GET", `/cumplimiento/${periodoActivo.id}?funcionario=${gabriel.usuario.id}`)).datos as {
  funcionarios: { items: { itemId: string; avance: number }[] }[];
};
const avanceAntes = antes.funcionarios[0]?.items.find((i) => i.itemId === itemTerritorial.id)?.avance ?? -1;

const aprobacion = await V("POST", `/evidencias/${evidencia.id}/validacion`, {
  decision: "aprobada",
  observacion: "Acta legible y coherente con lo registrado.",
});
check("RF-013 el verificador aprueba", aprobacion.status === 201, `status ${aprobacion.status}`);

const despues = (await A("GET", `/cumplimiento/${periodoActivo.id}?funcionario=${gabriel.usuario.id}`)).datos as {
  funcionarios: { items: { itemId: string; avance: number }[] }[];
};
const avanceDespues = despues.funcionarios[0]?.items.find((i) => i.itemId === itemTerritorial.id)?.avance ?? -1;
check("RF-014 / RN-009 / CA-01 el punto se suma solo tras la aprobación, y una sola vez",
  avanceDespues === avanceAntes + 1, `avance ${avanceAntes} → ${avanceDespues}`);

// La bandeja también sirve para revisar lo ya resuelto (se comprueba ANTES de
// anular: una actividad anulada desaparece de la bandeja, y eso se verifica
// más abajo).
const yaDecididas = await V(
  "GET",
  `/evidencias?estado=aprobada&periodo=${periodoActivo.id}&limite=50`
);
check(
  "HU-11 la bandeja permite revisar lo ya decidido, con lo más reciente primero",
  yaDecididas.status === 200 &&
    (yaDecididas.datos as { evidencias: { id: string }[] }).evidencias[0]?.id === evidencia.id,
  `${(yaDecididas.datos as { total: number }).total} aprobadas, la recién aprobada encabeza la lista`
);

const reAprobar = await V("POST", `/evidencias/${evidencia.id}/validacion`, {
  decision: "rechazada",
  observacion: "Intento de revertir una aprobación ya contabilizada.",
});
check("CA-01 una evidencia aprobada no se re-decide", reAprobar.status === 422, `status ${reAprobar.status}`);

const editarValidada = await G("PATCH", `/actividades/${actividad1.id}`, {
  version: (patchOk.datos as { version: number }).version,
  descripcion: "Intento de editar una actividad ya validada",
});
check("ADR-006 una actividad validada no se edita: se anula", editarValidada.status === 422,
  (editarValidada.datos as { accionSugerida?: string }).accionSugerida ?? `status ${editarValidada.status}`);

const anulacionSinMotivo = await G("POST", `/actividades/${actividad1.id}/anulacion`, {
  version: (patchOk.datos as { version: number }).version,
});
check("ADR-006 anular exige motivo", anulacionSinMotivo.status === 400, `status ${anulacionSinMotivo.status}`);

const anulacion = await G("POST", `/actividades/${actividad1.id}/anulacion`, {
  version: (patchOk.datos as { version: number }).version,
  motivo: "Registro duplicado detectado en la revisión de la jefatura",
});
check("ADR-006 anulación con motivo", anulacion.status === 200 &&
  (anulacion.datos as { anulada: boolean }).anulada === true, `status ${anulacion.status}`);

const trasAnular = (await A("GET", `/cumplimiento/${periodoActivo.id}?funcionario=${gabriel.usuario.id}`)).datos as {
  funcionarios: { items: { itemId: string; avance: number }[] }[];
};
const avanceFinal = trasAnular.funcionarios[0]?.items.find((i) => i.itemId === itemTerritorial.id)?.avance ?? -1;
check("RN-003 lo anulado deja de sumar al avance", avanceFinal === avanceAntes,
  `avance ${avanceDespues} → ${avanceFinal}`);

const auditoriaValidacion = await prisma.auditoria.findFirst({
  where: { entidad: "evidencia", entidadId: evidencia.id, accion: "validar" },
  orderBy: { createdAt: "desc" },
});
check("RNF-008 / CA-09 la validación queda auditada con usuario, valor anterior y nuevo",
  auditoriaValidacion !== null && auditoriaValidacion.usuarioId === verificador.usuario.id &&
    auditoriaValidacion.valorNuevo !== null,
  `origen ${auditoriaValidacion?.origen}`);

// ===========================================================================
// 6. CUMPLIMIENTO — RF-022…RF-028 · ADR-007
// ===========================================================================

const cumplimiento = await C("GET", `/cumplimiento/${periodoActivo.id}`);
const cuerpo = cumplimiento.datos as {
  periodo: { diasTotales: number };
  parametros: Record<string, { valor: number; confirmado: boolean }>;
  resumen: { funcionarios: number; porSemaforo: Record<string, number> };
  funcionarios: { semaforo: string; objetivoAlDia: number }[];
};
check("RF-022 el cálculo por funcionario se expone por API", cumplimiento.status === 200 &&
  cuerpo.funcionarios.length > 0, `${cuerpo.resumen.funcionarios} funcionarios`);
check("RF-005 el endpoint informa los días calculados del período", cuerpo.periodo.diasTotales === 92,
  `${cuerpo.periodo.diasTotales} días`);
check("ADR-007 devuelve los parámetros usados y marca los no confirmados",
  cuerpo.parametros["tope_cumplimiento_item"]?.confirmado === false &&
    cuerpo.parametros["evidencia_tamano_max_mb"] !== undefined,
  Object.keys(cuerpo.parametros).length + " parámetros");
check("RF-027 el semáforo consolidado lo ve también el rol consulta",
  Object.values(cuerpo.resumen.porSemaforo).reduce((a, b) => a + b, 0) === cuerpo.resumen.funcionarios,
  JSON.stringify(cuerpo.resumen.porSemaforo));

const periodoAjeno = await A("GET", `/cumplimiento/00000000-0000-0000-0000-0000000000ff`);
check("Multi-tenant: un período inexistente o ajeno responde 404", periodoAjeno.status === 404,
  `status ${periodoAjeno.status}`);

// ===========================================================================
// 6.bis CONSOLIDADO POR DELEGACIÓN — RF-024 · RF-027 · RF-029 · ADR-014
//       Lo que consume el dashboard desde el Bloque C. Reemplaza a la vista
//       materializada v1 (`GET /kpis/cumplimiento`), que calculaba por
//       delegación con el tope y los umbrales escritos dentro del SQL.
// ===========================================================================

const consolidado = await C("GET", `/cumplimiento/${periodoActivo.id}/consolidado`);
const cons = consolidado.datos as {
  periodo: { diasTotales: number };
  parametros: Record<string, { valor: number; confirmado: boolean }>;
  areas: string[];
  delegaciones: {
    unidadTerritorialId: string;
    nombre: string;
    funcionarios: number;
    cumplimiento: number;
    objetivoAlDia: number;
    avanceRelativo: number;
    semaforo: string;
    proyeccion: number;
    porArea: { area: string; funcionarios: number; avanceRelativo: number }[];
  }[];
  sinMedicion: { unidadTerritorialId: string; nombre: string }[];
  totales: { funcionarios: number; delegacionesConMedicion: number; porSemaforo: Record<string, number> };
};

check(
  "RF-029 el tablero de delegación se consolida desde el motor por funcionario",
  consolidado.status === 200 && cons.delegaciones.length > 1,
  `${cons.totales?.delegacionesConMedicion} delegaciones, ${cons.totales?.funcionarios} funcionarios`
);

// El semáforo consolidado lo ve TODO el mundo (cliente, reunión 00:37:11), a
// diferencia del libro. Se prueban los seis roles, no un solo camino feliz.
const porRolConsolidado = await Promise.all(
  [
    { rol: "admin", cli: A },
    { rol: "supervisor", cli: S },
    { rol: "verificador", cli: V },
    { rol: "consulta", cli: C },
    { rol: "usuario Centro", cli: G },
    { rol: "usuario Rural", cli: I },
  ].map(async (r) => ({ ...r, status: (await r.cli("GET", `/cumplimiento/${periodoActivo.id}/consolidado`)).status }))
);
check(
  "RF-029 los seis roles ven el semáforo consolidado",
  porRolConsolidado.every((r) => r.status === 200),
  porRolConsolidado.map((r) => `${r.rol}:${r.status}`).join(" ")
);

// RF-024 · ADR-007: la proyección se recorta con el tope de la tabla de
// parámetros. Antes ese 150 estaba escrito a mano en el frontend.
const tope = cons.parametros["tope_cumplimiento_item"]!.valor;
check(
  "RF-024 ninguna proyección supera el tope configurado",
  cons.delegaciones.every((d) => d.proyeccion <= tope * 100 + 0.01),
  `tope ${tope * 100}%, máxima proyección ${Math.max(...cons.delegaciones.map((d) => d.proyeccion))}%`
);

// RF-027: los umbrales del color también salen del parámetro.
const verdeParam = cons.parametros["semaforo_verde"]!.valor * 100;
const naranjoParam = cons.parametros["semaforo_naranjo"]!.valor * 100;
check(
  "RF-027 el color de cada delegación respeta los umbrales configurados",
  cons.delegaciones.every((d) =>
    d.avanceRelativo >= verdeParam
      ? d.semaforo === "verde"
      : d.avanceRelativo >= naranjoParam
        ? d.semaforo === "naranjo"
        : d.semaforo === "rojo"
  ),
  `verde ≥${verdeParam}%, naranjo ≥${naranjoParam}%`
);

// ADR-014: sin medición no es 0% de cumplimiento. Es la distinción que la
// vista v1 no podía hacer, porque una delegación sin filas simplemente no salía.
check(
  "ADR-014 una delegación sin funcionarios medidos se informa aparte",
  cons.sinMedicion.every((u) => !cons.delegaciones.some((d) => d.unidadTerritorialId === u.unidadTerritorialId)),
  cons.sinMedicion.map((u) => u.nombre).join(", ") || "todas tienen medición"
);

// El eje del mapa de calor es el área del cargo (así agrupa la planilla real),
// no la categoría del tubo, que no tiene relación con lo que se le mide a nadie.
check(
  "El consolidado agrupa por área del cargo",
  cons.areas.length >= 3 && cons.delegaciones.every((d) => d.porArea.length > 0),
  cons.areas.join(", ")
);

const consolidadoAjeno = await A("GET", "/cumplimiento/00000000-0000-0000-0000-0000000000ff/consolidado");
check(
  "Multi-tenant: consolidado de un período ajeno o inexistente → 404",
  consolidadoAjeno.status === 404,
  `status ${consolidadoAjeno.status}`
);

// El cálculo v1 murió con este bloque: si alguna de las dos rutas respondiera,
// el sistema volvería a tener dos verdades para la misma pregunta.
const kpisV1 = await A("GET", "/kpis/cumplimiento?trimestre=2026-Q3");
const recalcularV1 = await A("POST", "/kpis/recalcular", {});
const metasV1 = await A("GET", "/metas");
check(
  "Bloque C: /kpis/cumplimiento, /kpis/recalcular y /metas v1 dejaron de existir",
  kpisV1.status === 404 && recalcularV1.status === 404 && metasV1.status === 404,
  `${kpisV1.status} / ${recalcularV1.status} / ${metasV1.status}`
);
const kpisTubo = await A("GET", "/kpis/tubo");
check(
  "GET /kpis/tubo sobrevive: nunca dependió del cálculo v1",
  kpisTubo.status === 200,
  `status ${kpisTubo.status}`
);

// CA-06: «los totales del tablero coinciden con el detalle filtrado». Es la
// razón de fondo del Bloque C — con dos cálculos conviviendo, el tablero podía
// decir una cifra y la ficha otra sobre la misma persona. Se comprueba contra
// la API, no contra el motor: el tablero y la ficha llaman a endpoints
// distintos y lo que importa es que esos dos coincidan.
const unaDeleg = cons.delegaciones[0]!;
const detalleUnidad = (
  await C("GET", `/cumplimiento/${periodoActivo.id}/consolidado`)
).datos as typeof cons;
const detallePersonas = (
  await C("GET", `/cumplimiento/${periodoActivo.id}?unidad=${unaDeleg.unidadTerritorialId}`)
).datos as { funcionarios: { cumplimientoFinal: number }[] };
const promedioDetalle =
  Math.round(
    (detallePersonas.funcionarios.reduce((s, f) => s + f.cumplimientoFinal, 0) /
      Math.max(detallePersonas.funcionarios.length, 1)) *
      10
  ) / 10;
check(
  "CA-06 el total del tablero coincide con el detalle filtrado de esa delegación",
  Math.abs(unaDeleg.cumplimiento - promedioDetalle) < 0.05 &&
    detallePersonas.funcionarios.length === unaDeleg.funcionarios &&
    detalleUnidad.delegaciones.length === cons.delegaciones.length,
  `${unaDeleg.nombre}: tablero ${unaDeleg.cumplimiento}% · detalle ${promedioDetalle}% sobre ${detallePersonas.funcionarios.length} personas`
);




// ===========================================================================
// 6.ter CONTROL DE ACTIVIDAD DE USUARIOS — RF-030 · HU-19 · ADR-015
//       Quién registró, QUIÉN NO y quién está conectado. Lo pidió el docente
//       en clase para el administrador y el coordinador (§9.ter).
// ===========================================================================

const panelSup = await S("GET", `/actividad-usuarios?periodo=${periodoActivo.id}`);
const panel = panelSup.datos as {
  umbralDias: number;
  umbralConfirmado: boolean;
  funcionarios: {
    funcionarioId: string;
    nombre: string;
    unidadNombre: string | null;
    registradas: number;
    validadas: number;
    pendientes: number;
    ultimaActividad: string | null;
    diasSinRegistrar: number | null;
    estado: string;
    conectado: boolean;
  }[];
  sinMedicion: { funcionarioId: string; nombre: string; rol: string }[];
  resumen: {
    medidos: number;
    conRegistro: number;
    sinRegistro: number;
    atrasados: number;
    alDia: number;
    conectadosAhora: number;
    totalRegistradas: number;
  };
  conectados: { userId: string }[];
};

check(
  "RF-030 el coordinador ve el control de actividad",
  panelSup.status === 200 && panel.funcionarios.length > 0,
  `${panel.resumen?.medidos} medidos · ${panel.resumen?.totalRegistradas} actividades`
);

// Lo que el docente pidió y hoy no se veía: el COMPLEMENTO. Alguien con metas
// configuradas y sin una sola actividad registrada en el período.
const nadaRegistrado = panel.funcionarios.filter((f) => f.estado === "sin_registro");
check(
  "RF-030 quien tiene metas y NO registró nada aparece como 'sin registro'",
  nadaRegistrado.length > 0 &&
    nadaRegistrado.every((f) => f.registradas === 0 && f.ultimaActividad === null),
  nadaRegistrado.map((f) => `${f.nombre} (${f.unidadNombre})`).join(", ") || "ninguno: el seed no arma el caso"
);

check(
  "RF-030 el resumen separa sin registro, atrasados y al día, y suman los medidos",
  panel.resumen.sinRegistro + panel.resumen.atrasados + panel.resumen.alDia === panel.resumen.medidos,
  JSON.stringify(panel.resumen)
);

// El umbral es el parámetro `dias_sin_ingreso_alerta`, no un número escrito en
// el código, y viaja con su marca `confirmado` (ADR-007).
check(
  "RF-030 · ADR-007 el umbral de días sale del parámetro y dice si está confirmado",
  panel.umbralDias === 7 && panel.umbralConfirmado === false,
  `${panel.umbralDias} días, confirmado=${panel.umbralConfirmado}`
);

// La diferencia con el motor de cumplimiento: aquí se cuenta lo REGISTRADO. El
// motor cuenta solo lo aprobado (RN-003), y con esa cifra alguien que subió 40
// actividades pendientes figuraría en cero.
const conPendientes = panel.funcionarios.find((f) => f.pendientes > 0);
check(
  "RF-030 cuenta lo registrado, no solo lo validado",
  conPendientes !== undefined && conPendientes.registradas > conPendientes.validadas,
  conPendientes
    ? `${conPendientes.nombre}: ${conPendientes.registradas} registradas, ${conPendientes.validadas} validadas`
    : "nadie con evidencia pendiente"
);

// Quien no tiene cargo medido no registra actividades por diseño: va aparte y
// no como una alarma falsa (un aviso que marca de más deja de avisar).
check(
  "RF-030 quien no tiene cargo medido va aparte, no como 'sin registro'",
  panel.sinMedicion.length > 0 &&
    panel.sinMedicion.every(
      (s) => !panel.funcionarios.some((f) => f.funcionarioId === s.funcionarioId)
    ),
  `${panel.sinMedicion.length} sin cargo medido`
);

// ADR-015: rige lo restrictivo y el 403 dice POR QUÉ.
const panelPorRol = await Promise.all(
  [
    { rol: "admin", cli: A, esperado: 200 },
    { rol: "supervisor", cli: S, esperado: 200 },
    { rol: "verificador", cli: V, esperado: 403 },
    { rol: "consulta", cli: C, esperado: 403 },
    { rol: "usuario Centro", cli: G, esperado: 403 },
    { rol: "usuario Rural", cli: I, esperado: 403 },
  ].map(async (r) => {
    const res = await r.cli("GET", `/actividad-usuarios?periodo=${periodoActivo.id}`);
    return { ...r, status: res.status, motivo: (res.datos as { motivo?: string }).motivo };
  })
);
check(
  "ADR-015 solo admin y coordinador entran; el resto recibe 403",
  panelPorRol.every((r) => r.status === r.esperado),
  panelPorRol.map((r) => `${r.rol}:${r.status}`).join(" ")
);
check(
  "ADR-015 el 403 explica el motivo, no deja un vacío mudo",
  panelPorRol
    .filter((r) => r.esperado === 403)
    .every((r) => typeof r.motivo === "string" && r.motivo.length > 80),
  panelPorRol.find((r) => r.esperado === 403)?.motivo?.slice(0, 70) + "…"
);

// Filtros y errores del contrato.
const sinPeriodo = await S("GET", "/actividad-usuarios");
check("RF-030 sin `periodo` responde 400", sinPeriodo.status === 400, `status ${sinPeriodo.status}`);

const panelPeriodoAjeno = await S(
  "GET",
  "/actividad-usuarios?periodo=00000000-0000-0000-0000-0000000000ff"
);
check(
  "Multi-tenant: período ajeno o inexistente → 404",
  panelPeriodoAjeno.status === 404,
  `status ${panelPeriodoAjeno.status}`
);

const panelUnidadAjena = await S(
  "GET",
  `/actividad-usuarios?periodo=${periodoActivo.id}&unidad=00000000-0000-0000-0000-0000000000ff`
);
check(
  "Multi-tenant: delegación ajena o inexistente → 404",
  panelUnidadAjena.status === 404,
  `status ${panelUnidadAjena.status}`
);

const unidadCentro = (
  (await S("GET", "/unidades")).datos as { id: string; nombre: string }[]
).find((u) => u.nombre === "Centro")!;
const panelCentro = (
  await S("GET", `/actividad-usuarios?periodo=${periodoActivo.id}&unidad=${unidadCentro.id}`)
).datos as typeof panel;
check(
  "RF-032 el panel se filtra por delegación",
  panelCentro.funcionarios.length > 0 &&
    panelCentro.funcionarios.every((f) => f.unidadNombre === "Centro") &&
    panelCentro.funcionarios.length < panel.funcionarios.length,
  `${panelCentro.funcionarios.length} en Centro de ${panel.funcionarios.length} en total`
);

// Abrir el panel se AUDITA: son datos de desempeño de personas identificadas y
// la ley pide trazabilidad del acceso, no solo de la modificación (ADR-012).
const auditoriaPanel = await prisma.auditoria.findFirst({
  where: { entidad: "ActividadUsuarios", accion: "consultar" },
  orderBy: { createdAt: "desc" },
});
check(
  "ADR-015 · RNF-008 abrir el control de actividad queda en la bitácora",
  auditoriaPanel !== null && auditoriaPanel.usuarioId !== null && auditoriaPanel.valorNuevo !== null,
  `origen ${auditoriaPanel?.origen}`
);

// ===========================================================================
// 7. CONTRATO QUE CONSUME LA FICHA PERSONAL — RF-004 · RF-008 · HU-06
//    La pantalla no calcula nada: se apoya en estas llamadas. Verificarlas es
//    verificar que la ficha tiene de dónde sacar lo que muestra.
// ===========================================================================

const catalogoFormatos = await G("GET", "/catalogos?catalogo=formato_evidencia");
const formatosCatalogo = (catalogoFormatos.datos as { valor: string }[]).map((c) => c.valor);
check(
  "RF-004 los formatos de evidencia salen del catálogo, no del código",
  catalogoFormatos.status === 200 && formatosCatalogo.includes("image/jpeg"),
  formatosCatalogo.join(", ")
);
check(
  "RF-004 el catálogo coincide con lo que el servidor acepta",
  JSON.stringify(formatosCatalogo.sort()) ===
    JSON.stringify(
      [...((formatoMalo.datos as { formatosPermitidos: string[] }).formatosPermitidos ?? [])].sort()
    ),
  "la lista que ve la pantalla es la misma que aplica el 415"
);

const paginado = await G(
  "GET",
  `/actividades?periodo=${periodoActivo.id}&funcionario=${gabriel.usuario.id}&limite=5`
);
const pagina = paginado.datos as { total: number; limite: number; actividades: unknown[] };
check(
  "RF-008 el registro personal se lee paginado por período y funcionario",
  paginado.status === 200 && pagina.limite === 5 && pagina.actividades.length <= 5 && pagina.total > 5,
  `${pagina.actividades.length} de ${pagina.total}`
);

const sinAnuladas = await G(
  "GET",
  `/actividades?periodo=${periodoActivo.id}&funcionario=${gabriel.usuario.id}&limite=200`
);
const conAnuladas = await G(
  "GET",
  `/actividades?periodo=${periodoActivo.id}&funcionario=${gabriel.usuario.id}&limite=200&anuladas=1`
);
const idsSin = (sinAnuladas.datos as { actividades: { id: string }[] }).actividades.map((a) => a.id);
const idsCon = (conAnuladas.datos as { actividades: { id: string }[] }).actividades.map((a) => a.id);
check(
  "RF-008 las anuladas se ven solo si se piden (la ficha las muestra tachadas)",
  !idsSin.includes(actividad1.id) && idsCon.includes(actividad1.id),
  `${idsSin.length} vigentes, ${idsCon.length} con anuladas`
);

const fichaPersona = await G(
  "GET",
  `/cumplimiento/${periodoActivo.id}?funcionario=${gabriel.usuario.id}`
);
const soloUno = fichaPersona.datos as { funcionarios: { funcionarioId: string; items: unknown[] }[] };
check(
  "RF-008 la ficha de una persona trae sus ítems, metas y semáforo",
  fichaPersona.status === 200 &&
    soloUno.funcionarios.length === 1 &&
    soloUno.funcionarios[0]!.funcionarioId === gabriel.usuario.id &&
    soloUno.funcionarios[0]!.items.length > 0,
  `${soloUno.funcionarios[0]?.items.length} ítems`
);

// ===========================================================================
// 8. CONTRATO QUE CONSUME LA BANDEJA DEL VERIFICADOR — RF-013 · HU-11
// ===========================================================================

const bandejaPendientes = await V("GET", `/evidencias?estado=pendiente&periodo=${periodoActivo.id}&limite=200`);
const pendientes = (bandejaPendientes.datos as {
  evidencias: { id: string; actividad: { codigo: string; funcionario?: { nombre: string }; unidad?: { nombre: string } } }[];
}).evidencias;
check(
  "HU-11 la bandeja entrega lo que la pantalla necesita para decidir",
  pendientes.length > 0 &&
    pendientes.every((e) => !!e.actividad.codigo && !!e.actividad.funcionario && !!e.actividad.unidad),
  "código, funcionario y delegación en cada fila"
);
check(
  "RF-014 lo ya aprobado sale de la cola de pendientes",
  !pendientes.some((e) => e.id === evidencia.id),
  `${pendientes.length} pendientes, la aprobada no está`
);

// La actividad de esa evidencia quedó anulada en el paso anterior: la bandeja
// no debe seguir mostrándola en ningún estado (RN-003, lo anulado no cuenta ni
// se revisa).
const trasAnularBandeja = await V(
  "GET",
  `/evidencias?estado=aprobada&periodo=${periodoActivo.id}&limite=50`
);
check(
  "RN-003 una actividad anulada desaparece de la bandeja",
  !(trasAnularBandeja.datos as { evidencias: { id: string }[] }).evidencias.some(
    (e) => e.id === evidencia.id
  ),
  `${(trasAnularBandeja.datos as { total: number }).total} aprobadas vigentes`
);

// Regla 9 (libro privado por delegación): el verificador es transversal y NO
// tiene libro. Es la razón de que el tubo le muestre un estado vacío explicado
// en vez de un tablero — antes se quedaba cargando para siempre.
const unidadesDelVerificador = await V("GET", "/unidades");
const librosVisibles = (unidadesDelVerificador.datos as { puedeVerLibro: boolean }[]).filter(
  (u) => u.puedeVerLibro
);
check(
  "Regla 9 el verificador no tiene libro de delegación, pero sí ve la bandeja",
  unidadesDelVerificador.status === 200 && librosVisibles.length === 0 && pendientes.length > 0,
  `${librosVisibles.length} libros visibles, ${pendientes.length} evidencias por revisar`
);

const centro = unidades.find((u) => u.nombre === "Centro")!;
const bandejaCentro = await V(
  "GET",
  `/evidencias?estado=pendiente&periodo=${periodoActivo.id}&unidad=${centro.id}&limite=200`
);
const soloCentro = (bandejaCentro.datos as {
  evidencias: { actividad: { unidad: { nombre: string } } }[];
}).evidencias;
check(
  "RF-032 la bandeja filtra por delegación",
  bandejaCentro.status === 200 && soloCentro.every((e) => e.actividad.unidad.nombre === "Centro"),
  `${soloCentro.length} de ${pendientes.length} son del Centro`
);

// ===========================================================================
// 9. METAS POR FUNCIONARIO — RF-006 · RF-007 · RN-001 · RN-002 · HU-05
//
// Se trabaja sobre `periodoPrueba` (creado y reabierto en la sección 1), que
// no tiene metas: así la suma de ponderadores parte de 0 y nada de lo que se
// haga aquí toca los datos de demostración.
// ===========================================================================

const itemsTerritorial = cargoTerritorial.items;
const itemA = itemsTerritorial[0]!;
const itemB = itemsTerritorial[1] ?? itemsTerritorial[0]!;

const metaSinPermiso = await G("POST", "/metas-item", {
  periodoId: periodoPrueba.id,
  itemId: itemA.id,
  funcionarioId: gabriel.usuario.id,
  metaValor: 10,
  ponderador: 0.5,
});
check("RNF-005 un funcionario no configura sus propias metas", metaSinPermiso.status === 403,
  `status ${metaSinPermiso.status}`);

const metaCero = await A("POST", "/metas-item", {
  periodoId: periodoPrueba.id,
  itemId: itemA.id,
  funcionarioId: gabriel.usuario.id,
  metaValor: 0,
  ponderador: 0.5,
});
check("RN-002 una meta de 0 se rechaza (un ítem con meta 0 nunca sería medible)",
  metaCero.status === 400, `status ${metaCero.status}`);

const metaItemAjeno = await A("POST", "/metas-item", {
  periodoId: periodoPrueba.id,
  itemId: itemAjeno.id, // ítem del cargo "Gestor Social 1"
  funcionarioId: gabriel.usuario.id,
  metaValor: 10,
  ponderador: 0.5,
});
check("RF-003 no se fija meta de un ítem que no es del cargo del funcionario",
  metaItemAjeno.status === 422, `status ${metaItemAjeno.status}`);

const meta1 = await A("POST", "/metas-item", {
  periodoId: periodoPrueba.id,
  itemId: itemA.id,
  funcionarioId: gabriel.usuario.id,
  metaValor: 40,
  ponderador: 0.6,
});
const metaCreada = (meta1.datos as { meta: { id: string; version: number }; sumaPonderadores: number; cumpleRN001: boolean });
check("RF-007 se configura la meta y el ponderador de un funcionario por ítem y período",
  meta1.status === 201 && metaCreada.sumaPonderadores === 0.6,
  `status ${meta1.status}, suma=${metaCreada?.sumaPonderadores}`);
check("RN-001 mientras no llegue al 100% la respuesta lo dice (la UI debe advertirlo antes de guardar)",
  metaCreada?.cumpleRN001 === false, `suma=${metaCreada?.sumaPonderadores} → cumpleRN001=${metaCreada?.cumpleRN001}`);

const metaDuplicada = await A("POST", "/metas-item", {
  periodoId: periodoPrueba.id,
  itemId: itemA.id,
  funcionarioId: gabriel.usuario.id,
  metaValor: 20,
  ponderador: 0.1,
});
check("RF-007 no se duplica la meta de un mismo ítem, funcionario y período",
  metaDuplicada.status === 422, `status ${metaDuplicada.status}`);

const metaExcedida = await A("POST", "/metas-item", {
  periodoId: periodoPrueba.id,
  itemId: itemB.id,
  funcionarioId: gabriel.usuario.id,
  metaValor: 15,
  ponderador: 0.7, // 0,6 + 0,7 = 130%
});
check("RN-001 los ponderadores de un funcionario no pueden superar el 100%",
  metaExcedida.status === 422 && (metaExcedida.datos as { disponible: number }).disponible === 0.4,
  `status ${metaExcedida.status}, disponible=${(metaExcedida.datos as { disponible?: number }).disponible}`);

const patchMetaVieja = await A("PATCH", `/metas-item/${metaCreada.meta.id}`, {
  version: metaCreada.meta.version,
  metaValor: 45,
});
const patchMetaConflicto = await A("PATCH", `/metas-item/${metaCreada.meta.id}`, {
  version: metaCreada.meta.version, // versión ya consumida
  metaValor: 99,
});
check("CA-08 / ADR-005 editar una meta con versión vieja → 409",
  patchMetaVieja.status === 200 && patchMetaConflicto.status === 409,
  `primera ${patchMetaVieja.status}, segunda ${patchMetaConflicto.status}`);

const lecturaAjena = await I("GET", `/metas-item?periodo=${periodoPrueba.id}&funcionario=${gabriel.usuario.id}`);
check("Regla 9 las metas de otra delegación no se leen (404, no 403)",
  lecturaAjena.status === 404, `status ${lecturaAjena.status}`);

const lecturaPropia = await G("GET", `/metas-item?periodo=${periodoPrueba.id}&funcionario=${gabriel.usuario.id}`);
const resumenPropio = (lecturaPropia.datos as { resumen: { sumaPonderadores: number; faltante: number }[] }).resumen[0];
check("RF-008 el funcionario sí ve lo que se le mide, con la suma y cuánto falta",
  lecturaPropia.status === 200 && resumenPropio?.sumaPonderadores === 0.6 && resumenPropio?.faltante === 0.4,
  `suma=${resumenPropio?.sumaPonderadores}, falta=${resumenPropio?.faltante}`);

// Carga en lote: es la operación que deja a una persona configurada de una vez
// y la única que puede GARANTIZAR RN-001, porque recibe el conjunto completo.
const repartoIncompleto = await A("PUT", "/metas-item", {
  periodoId: periodoPrueba.id,
  funcionarioId: gabriel.usuario.id,
  metas: [{ itemId: itemA.id, metaValor: 40, ponderador: 0.5 }],
});
check("RN-001 la carga en lote exige el 100% exacto: 50% se rechaza",
  repartoIncompleto.status === 422, `status ${repartoIncompleto.status}, ${(repartoIncompleto.datos as { sumaPonderadores?: number }).sumaPonderadores}`);

const base = Math.floor(10_000 / itemsTerritorial.length) / 10_000;
const reparto = itemsTerritorial.map((it, i) => ({
  itemId: it.id,
  metaValor: 20 + i,
  ponderador:
    i === itemsTerritorial.length - 1
      ? Math.round((1 - base * (itemsTerritorial.length - 1)) * 10_000) / 10_000
      : base,
}));

// CA-08: el conjunto tampoco se sobrescribe a ciegas. `itemA` ya tiene meta,
// así que el lote debe traer su versión.
const repartoSinVersion = await A("PUT", "/metas-item", {
  periodoId: periodoPrueba.id,
  funcionarioId: gabriel.usuario.id,
  metas: reparto,
});
check("CA-08 la carga en lote sin las versiones vigentes → 409",
  repartoSinVersion.status === 409, `status ${repartoSinVersion.status}`);

const vigentes = (await A("GET", `/metas-item?periodo=${periodoPrueba.id}&funcionario=${gabriel.usuario.id}`))
  .datos as { metas: { itemId: string; version: number }[] };
const versionPorItem = new Map(vigentes.metas.map((m) => [m.itemId, m.version]));
const repartoConVersiones = reparto.map((m) => ({
  ...m,
  ...(versionPorItem.has(m.itemId) ? { version: versionPorItem.get(m.itemId) } : {}),
}));

const repartoVersionVieja = await A("PUT", "/metas-item", {
  periodoId: periodoPrueba.id,
  funcionarioId: gabriel.usuario.id,
  metas: repartoConVersiones.map((m) =>
    m.itemId === itemA.id ? { ...m, version: 1 } : m // versión ya consumida por el PATCH
  ),
});
check("CA-08 la carga en lote con una versión vieja → 409 y no aplica nada",
  repartoVersionVieja.status === 409 &&
    (repartoVersionVieja.datos as { metas: unknown[] }).metas !== undefined,
  `status ${repartoVersionVieja.status}, devuelve lo vigente`);

const repartoCompleto = await A("PUT", "/metas-item", {
  periodoId: periodoPrueba.id,
  funcionarioId: gabriel.usuario.id,
  metas: repartoConVersiones,
});
const conjunto = repartoCompleto.datos as { metas: { id: string; itemId: string }[]; sumaPonderadores: number };
check("RN-001 la carga en lote deja al funcionario cuadrado en 100%",
  repartoCompleto.status === 200 && conjunto.sumaPonderadores === 1 &&
    conjunto.metas.length === itemsTerritorial.length,
  `${conjunto?.metas?.length} ítems, suma=${conjunto?.sumaPonderadores}`);

// RN-009 / CA-01: lo ya validado no se puede hacer desaparecer quitando su meta.
const actividadAprobada = await prisma.actividad.findFirst({
  where: {
    periodoId: periodoActivo.id,
    funcionarioId: gabriel.usuario.id,
    anulada: false,
    itemId: { not: null },
    evidencias: { some: { validaciones: { some: { decision: "aprobada" } } } },
  },
  select: { itemId: true },
});
const metaConAvance = await prisma.metaItem.findFirst({
  where: {
    periodoId: periodoActivo.id,
    funcionarioId: gabriel.usuario.id,
    itemId: actividadAprobada?.itemId ?? "",
  },
  select: { id: true },
});
const borrarConAvance = await A("DELETE", `/metas-item/${metaConAvance?.id ?? "sin-meta"}`);
check("RN-009 / CA-01 no se borra la meta de un ítem que ya acumuló avance aprobado",
  borrarConAvance.status === 422, `status ${borrarConAvance.status}`);

const metaBorrable = conjunto.metas.find((m) => m.itemId === itemA.id)!;
const borrada = await A("DELETE", `/metas-item/${metaBorrable.id}`);
check("RF-007 una meta sin avance validado se puede quitar y la suma se recalcula",
  borrada.status === 200 && (borrada.datos as { cumpleRN001: boolean }).cumpleRN001 === false,
  `suma tras borrar=${(borrada.datos as { sumaPonderadores?: number }).sumaPonderadores}`);

// RN-013: un período cerrado no admite reconfiguración de metas.
const periodoCerrado = await A("POST", "/periodos", {
  nombre: `Período cerrado ${sufijo}`,
  fechaInicio: "2029-01-01",
  fechaTermino: "2029-03-31",
});
if (periodoCerrado.status === 201) creado.periodos.push((periodoCerrado.datos as { id: string }).id);
await A("POST", `/periodos/${(periodoCerrado.datos as { id: string }).id}/cierre`, {
  version: (periodoCerrado.datos as { version: number }).version,
});
const metaEnCerrado = await A("POST", "/metas-item", {
  periodoId: (periodoCerrado.datos as { id: string }).id,
  itemId: itemA.id,
  funcionarioId: gabriel.usuario.id,
  metaValor: 10,
  ponderador: 1,
});
check("RN-013 / RF-007 un período cerrado no admite cambios de metas (rigen desde su período)",
  metaEnCerrado.status === 422, `status ${metaEnCerrado.status}`);

// UUID bien formado pero inexistente: un identificador mal escrito es 400
// (sintaxis), un recurso ajeno o inexistente es 404 (regla 8).
const metaInexistente = await A("POST", "/metas-item", {
  periodoId: "3f4a2c1e-8b7d-4f6a-9c2e-1d0b5a7e3c9f",
  itemId: itemA.id,
  funcionarioId: gabriel.usuario.id,
  metaValor: 10,
  ponderador: 1,
});
check("Multi-tenant: un período inexistente o ajeno responde 404",
  metaInexistente.status === 404, `status ${metaInexistente.status}`);

const auditoriaMetas = await prisma.auditoria.findMany({
  where: { entidad: { in: ["meta_item", "meta_item_conjunto"] } },
  orderBy: { createdAt: "desc" },
  take: 20,
});
const accionesMetas = [...new Set(auditoriaMetas.map((a) => a.accion))];
check(
  "RNF-008 / CA-09 configurar metas queda auditado (crear, actualizar y eliminar)",
  ["crear", "actualizar", "eliminar"].every((a) => accionesMetas.includes(a as never)) &&
    auditoriaMetas.some((a) => a.accion === "actualizar" && a.valorAnterior !== null && a.valorNuevo !== null),
  accionesMetas.join(", ")
);

// Regresión: la bitácora nunca lanza, así que un valor no serializable se
// perdía SIN AVISO. Pasó con las columnas Decimal de MetaItem (meta y
// ponderador), la primera entidad auditada que las tiene. La bitácora debe
// guardar el número, no el objeto Decimal.
const auditoriaCreacion = auditoriaMetas.find((a) => a.entidad === "meta_item" && a.accion === "crear");
const valorAuditado = auditoriaCreacion?.valorNuevo as { metaValor?: unknown; ponderador?: unknown } | null;
check(
  "RNF-008 los importes Decimal quedan legibles en la bitácora (regresión: se perdían en silencio)",
  typeof valorAuditado?.metaValor === "number" && typeof valorAuditado?.ponderador === "number",
  `metaValor=${JSON.stringify(valorAuditado?.metaValor)}, ponderador=${JSON.stringify(valorAuditado?.ponderador)}`
);

// ===========================================================================
// 10. LO QUE CONSUME LA PANTALLA DE METAS — RF-006 · RF-007 · HU-05
//
// No prueban la interfaz (eso es del Bloque D), sino el CONTRATO del que
// depende: si uno de estos endpoints falla o devuelve vacío para un rol, la
// pantalla se rompe en silencio. Es la forma automatizable de la regla "probar
// con los seis roles", que ya destapó dos errores reales de pantalla.
// ===========================================================================

const delegado = await login("delegado.centro@sgr.demo"); // gerente, Centro
const D = api(delegado.token);

// La pantalla necesita saber QUÉ ÍTEMS ofrecer, y eso lo dice el cargo del
// funcionario. Sin `cargoId` habría que emparejar cargos por nombre.
const directorio = (await A("GET", "/usuarios")).datos as {
  userId: string;
  nombre: string;
  cargo: string | null;
  cargoId: string | null;
}[];
const conCargo = directorio.filter((m) => m.cargoId);
const gabrielDir = directorio.find((m) => m.userId === gabriel.usuario.id);
check(
  "RF-003 el directorio expone el cargoId, que es lo que dice qué ítems se le miden",
  gabrielDir?.cargoId === cargoTerritorial.id && conCargo.length >= 7,
  `${conCargo.length} personas con cargo; Gabriel → ${gabrielDir?.cargo}`
);

// Los seis roles del PDF §3 cargan la pantalla: períodos, directorio, cargos y
// metas. Ninguno debe recibir un error que la deje en blanco o cargando.
const porRol: { nombre: string; cli: ReturnType<typeof api> }[] = [
  { nombre: "admin", cli: A },
  { nombre: "supervisor", cli: S },
  { nombre: "gerente", cli: D },
  { nombre: "usuario", cli: G },
  { nombre: "verificador", cli: V },
  { nombre: "consulta", cli: C },
];
const fallosDeCarga: string[] = [];
for (const { nombre, cli } of porRol) {
  const respuestas = await Promise.all([
    cli("GET", "/periodos"),
    cli("GET", "/usuarios"),
    cli("GET", "/cargos"),
    cli("GET", `/metas-item?periodo=${periodoActivo.id}`),
  ]);
  const malas = respuestas.filter((r) => r.status !== 200);
  if (malas.length > 0) fallosDeCarga.push(`${nombre}: ${malas.map((m) => m.status).join(",")}`);
}
check(
  "HU-05 los seis roles cargan la pantalla de metas sin error (ninguno queda en blanco)",
  fallosDeCarga.length === 0,
  fallosDeCarga.length === 0 ? "admin, supervisor, gerente, usuario, verificador, consulta" : fallosDeCarga.join(" · ")
);

// Regla 9 + DESIGN §7: el selector de la pantalla solo puede ofrecer a quien
// este rol puede consultar. Si ofreciera a alguien de otra delegación, cargar
// esa persona daría 404 y la pantalla mostraría un error que nadie provocó —
// el mismo fallo que dejó el tubo cargando para siempre para el verificador.
const alcancePorRol: string[] = [];
for (const { nombre, cli } of porRol) {
  const unidadesDelRol = (await cli("GET", "/unidades")).datos as { id: string; puedeVerLibro: boolean }[];
  const visibles = new Set(unidadesDelRol.filter((u) => u.puedeVerLibro).map((u) => u.id));
  const central = nombre === "admin" || nombre === "supervisor";
  const ofrecidos = directorio.filter(
    (m) => m.cargoId && (central || visibles.has((m as { unidad?: { id: string } }).unidad?.id ?? ""))
  );
  // Cada persona que el selector ofrecería debe poder consultarse sin 404.
  const consultas = await Promise.all(
    ofrecidos.slice(0, 8).map((m) => cli("GET", `/metas-item?periodo=${periodoActivo.id}&funcionario=${m.userId}`))
  );
  const rechazadas = consultas.filter((r) => r.status !== 200).length;
  alcancePorRol.push(`${nombre}=${ofrecidos.length}${rechazadas > 0 ? ` (${rechazadas} rechazadas)` : ""}`);
}
check(
  "Regla 9 lo que el selector ofrece a cada rol es exactamente lo que ese rol puede consultar",
  !alcancePorRol.some((a) => a.includes("rechazadas")),
  alcancePorRol.join(", ")
);

// Cargar no es configurar: solo admin y supervisor guardan (RNF-005). Los otros
// cuatro ven la pantalla en lectura, y el servidor lo hace cumplir igual.
const cuerpoGuardado = {
  periodoId: periodoPrueba.id,
  funcionarioId: gabriel.usuario.id,
  metas: [{ itemId: itemA.id, metaValor: 30, ponderador: 1 }],
};
const guardadosProhibidos = await Promise.all(
  [
    { nombre: "gerente", cli: D },
    { nombre: "usuario", cli: G },
    { nombre: "verificador", cli: V },
    { nombre: "consulta", cli: C },
  ].map(async (r) => ({ ...r, status: (await r.cli("PUT", "/metas-item", cuerpoGuardado)).status }))
);
check(
  "RNF-005 configurar metas es solo de administración: los otros cuatro roles reciben 403",
  guardadosProhibidos.every((r) => r.status === 403),
  guardadosProhibidos.map((r) => `${r.nombre}=${r.status}`).join(", ")
);

// El cierre del ciclo: lo que la pantalla guarda es lo que el cálculo mide.
const antesDeConfigurar = (await A("GET", `/cumplimiento/${periodoPrueba.id}?funcionario=${gabriel.usuario.id}`))
  .datos as { funcionarios: { items: { itemId: string }[] }[] };
const itemsAntes = antesDeConfigurar.funcionarios[0]?.items.length ?? 0;

const vigentesFinal = (await A("GET", `/metas-item?periodo=${periodoPrueba.id}&funcionario=${gabriel.usuario.id}`))
  .datos as { metas: { itemId: string; version: number }[] };
const versionFinal = new Map(vigentesFinal.metas.map((m) => [m.itemId, m.version]));
const guardadoDesdePantalla = await A("PUT", "/metas-item", {
  periodoId: periodoPrueba.id,
  funcionarioId: gabriel.usuario.id,
  // Reparto completo de los ítems del cargo, como lo arma "Repartir en partes
  // iguales": el redondeo se acumula en el último para cuadrar exacto en 100%.
  metas: itemsTerritorial.map((it, i) => ({
    itemId: it.id,
    metaValor: 25 + i,
    ponderador:
      i === itemsTerritorial.length - 1
        ? Math.round((1 - base * (itemsTerritorial.length - 1)) * 10_000) / 10_000
        : base,
    ...(versionFinal.has(it.id) ? { version: versionFinal.get(it.id) } : {}),
  })),
});
const despuesDeConfigurar = (await A("GET", `/cumplimiento/${periodoPrueba.id}?funcionario=${gabriel.usuario.id}`))
  .datos as { funcionarios: { items: { itemId: string; meta: number }[] }[] };
const itemsDespues = despuesDeConfigurar.funcionarios[0]?.items ?? [];
check(
  "HU-05 lo que se configura en la pantalla es exactamente lo que el motor mide",
  guardadoDesdePantalla.status === 200 &&
    itemsDespues.length === itemsTerritorial.length &&
    itemsDespues.every((i) => i.meta > 0),
  `${itemsAntes} ítems medidos antes → ${itemsDespues.length} después, todos con meta > 0`
);

// ===========================================================================
// 12. FICHA DEL VECINO — ADR-008 · ADR-012 · RF-032 · CA-04 · HU-03 · HU-29
//
// Es el control que el cliente vino a buscar (el niño que pidió el mismo
// regalo en cinco delegaciones) y, a la vez, la pantalla con más datos
// personales del sistema. Por eso aquí se prueban dos cosas a la vez: que la
// duplicidad se DETECTE, y que el mínimo privilegio se RESPETE.
// ===========================================================================

// Rosa Maldonado es el caso emblemático del seed: misma persona, mismos ítems,
// dos delegaciones. Se busca por su RUT escrito como lo escribiría una persona.
const busquedaRut = (await A("GET", "/vecinos?q=13.111.222-K")).datos as {
  criterio: string;
  total: number;
  personas: {
    id: string;
    nombreCompleto: string;
    rutFormateado: string;
    atenciones: number;
    delegaciones: number;
  }[];
};
const rosa = busquedaRut.personas[0];
check(
  "RF-032 la búsqueda por RUT reconoce el formato con puntos y guion (ADR-001)",
  busquedaRut.criterio === "rut" && busquedaRut.total === 1 && rosa?.rutFormateado === "13.111.222-K",
  `${rosa?.nombreCompleto} — ${rosa?.atenciones} atenciones en ${rosa?.delegaciones} delegaciones`
);

const busquedaSinPuntos = (await A("GET", "/vecinos?q=13111222K")).datos as {
  total: number;
  personas: { id: string }[];
};
check(
  "ADR-001 el mismo RUT sin puntos ni guion encuentra a la misma persona",
  busquedaSinPuntos.total === 1 && busquedaSinPuntos.personas[0]?.id === rosa?.id,
  "13111222K → 13.111.222-K"
);

const busquedaNombre = (await A("GET", "/vecinos?q=maldo")).datos as {
  criterio: string;
  total: number;
  personas: { id: string }[];
};
check(
  "ADR-003 la búsqueda por nombre usa la expresión indexada (parcial, sin distinguir mayúsculas)",
  busquedaNombre.criterio === "nombre" && busquedaNombre.personas.some((p) => p.id === rosa?.id),
  `"maldo" → ${busquedaNombre.total} resultado(s)`
);

const busquedaCorta = (await A("GET", "/vecinos?q=ma")).datos as { total: number; minimo: number };
check(
  "Una búsqueda de menos de 3 caracteres no devuelve media base",
  busquedaCorta.total === 0 && busquedaCorta.minimo === 3,
  `mínimo ${busquedaCorta.minimo} caracteres`
);

interface FichaVecinoApi {
  persona: { id: string; telefono: string | null; version: number };
  alcance: { completo: boolean; hechosReducidos: number };
  resumen: { atenciones: number; delegaciones: number; nombresDelegaciones: string[] };
  aviso: {
    ventanaDias: number;
    ventanaConfirmada: boolean;
    coincidencias: { clasificacion: string; delegaciones: string[]; diasEntre: number; hechos: string[] }[];
  } | null;
  historial: {
    delegacion: { nombre: string };
    detallado: boolean;
    descripcion: string | null;
    estado: string;
  }[];
}

const fichaAdmin = (await A("GET", `/vecinos/${rosa!.id}`)).datos as FichaVecinoApi;
check(
  "ADR-008 el historial del vecino CRUZA delegaciones (es lo que hace detectable el caso)",
  fichaAdmin.resumen.delegaciones >= 2 && fichaAdmin.historial.length === fichaAdmin.resumen.atenciones,
  `${fichaAdmin.resumen.atenciones} hechos en ${fichaAdmin.resumen.nombresDelegaciones.join(" y ")}`
);

const coincidenciaCruzada = fichaAdmin.aviso?.coincidencias.find((c) => c.delegaciones.length >= 2);
check(
  "CA-04 el aviso ámbar aparece con atenciones del mismo tipo en delegaciones distintas",
  fichaAdmin.aviso !== null && coincidenciaCruzada !== undefined,
  coincidenciaCruzada
    ? `«${coincidenciaCruzada.clasificacion}» en ${coincidenciaCruzada.delegaciones.join(" y ")}, ${coincidenciaCruzada.diasEntre} días`
    : "sin aviso"
);

// El aviso señala HECHOS concretos, no delegaciones enteras: si marcara toda
// la delegación, media línea de tiempo saldría resaltada y dejaría de señalar.
const marcados = new Set((fichaAdmin.aviso?.coincidencias ?? []).flatMap((c) => c.hechos));
check(
  "CA-04 el aviso señala los hechos concretos que lo provocan, no la delegación entera",
  marcados.size > 0 && marcados.size < fichaAdmin.historial.length,
  `${marcados.size} de ${fichaAdmin.historial.length} hechos marcados`
);

const ventanaParametro = await prisma.parametro.findFirst({
  where: { clave: "ventana_duplicidad_dias", periodoId: null },
  select: { valor: true, confirmado: true },
});
check(
  "ADR-007 la ventana de duplicidad sale del parámetro, no del código, y viaja con su marca",
  ventanaParametro !== null &&
    fichaAdmin.aviso?.ventanaDias === ventanaParametro.valor.toNumber() &&
    fichaAdmin.aviso?.ventanaConfirmada === ventanaParametro.confirmado,
  `ventana=${fichaAdmin.aviso?.ventanaDias} días, confirmado=${fichaAdmin.aviso?.ventanaConfirmada}`
);

// ADR-012: el alcance por rol. El funcionario de Centro ve TODO el historial
// —si no, la duplicidad sería invisible— pero el detalle de Rural queda
// reservado: el libro de cada delegación sigue siendo privado (regla 9).
const fichaGabriel = (await G("GET", `/vecinos/${rosa!.id}`)).datos as FichaVecinoApi;
const ajenasConDetalle = fichaGabriel.historial.filter((h) => !h.detallado && h.descripcion !== null);
check(
  "ADR-012 un funcionario ve el historial completo, pero el detalle de otra delegación queda reservado",
  fichaGabriel.historial.length === fichaAdmin.historial.length &&
    fichaGabriel.alcance.completo === false &&
    fichaGabriel.alcance.hechosReducidos > 0 &&
    ajenasConDetalle.length === 0,
  `${fichaGabriel.historial.length} hechos, ${fichaGabriel.alcance.hechosReducidos} reducidos, 0 filtraciones`
);

const verificadorBusca = await V("GET", "/vecinos?q=maldo");
const consultaBusca = await C("GET", "/vecinos?q=maldo");
check(
  "ADR-012/RNF-005 el verificador y el rol de consulta no acceden a datos personales de vecinos",
  verificadorBusca.status === 403 && consultaBusca.status === 403,
  `verificador=${verificadorBusca.status}, consulta=${consultaBusca.status}`
);

// Los seis roles del PDF §3: ninguno queda en blanco ni cargando. Cuatro abren
// la ficha, dos reciben un 403 que EXPLICA el motivo.
const rolesFicha: { nombre: string; cli: ReturnType<typeof api>; espera: number }[] = [
  { nombre: "admin", cli: A, espera: 200 },
  { nombre: "supervisor", cli: S, espera: 200 },
  { nombre: "gerente", cli: D, espera: 200 },
  { nombre: "usuario", cli: G, espera: 200 },
  { nombre: "verificador", cli: V, espera: 403 },
  { nombre: "consulta", cli: C, espera: 403 },
];
const desviaciones: string[] = [];
let conMotivo = 0;
for (const { nombre, cli, espera } of rolesFicha) {
  const r = await cli("GET", `/vecinos/${rosa!.id}`);
  if (r.status !== espera) desviaciones.push(`${nombre}: ${r.status} (esperado ${espera})`);
  if (espera === 403 && typeof (r.datos as { error?: string })?.error === "string") conMotivo += 1;
}
check(
  "ADR-012 los seis roles reciben lo suyo en la ficha del vecino, y el 403 dice por qué",
  desviaciones.length === 0 && conMotivo === 2,
  desviaciones.length === 0
    ? "admin/supervisor/gerente/usuario=200, verificador/consulta=403 con motivo"
    : desviaciones.join("; ")
);

check(
  "Multi-tenant: identificador mal formado → 400, inexistente → 404 (no son lo mismo)",
  (await A("GET", "/vecinos/no-es-uuid")).status === 400 &&
    (await A("GET", "/vecinos/11111111-1111-1111-1111-111111111111")).status === 404,
  "400 y 404"
);

// Ley 21.663 y 19.628: se audita el ACCESO a datos personales identificados,
// no solo la modificación. Es lo que permite responder "quién consultó a quién".
const consultasAuditadas = await prisma.auditoria.count({
  where: { entidad: "PersonaUsuaria", entidadId: rosa!.id, accion: "consultar" },
});
check(
  "RNF-008 · Ley 21.663 abrir la ficha de un vecino queda registrado en la bitácora",
  consultasAuditadas > 0,
  `${consultasAuditadas} consultas registradas sobre esta persona`
);

// --- Rectificación de datos (Ley 19.628 art. 6): PATCH con bloqueo optimista.
// Se trabaja sobre una persona creada para la prueba: tocar a Rosa dejaría
// alterados los datos de demostración.
const personaPrueba = await prisma.personaUsuaria.create({
  data: {
    organizationId: admin.usuario.organizationId,
    rut: null,
    nombres: "Prueba",
    apellidoPaterno: "Verificacion",
    apellidoMaterno: "Temporal",
    telefono: null,
  },
});
creado.personas.push(personaPrueba.id);

const correccionVecino = await A("PATCH", `/vecinos/${personaPrueba.id}`, {
  telefono: "9 1234 5678",
  sector: "Las Compañías",
  version: personaPrueba.version,
});
const corregida = correccionVecino.datos as {
  telefono: string | null;
  telefonoFormateado: string;
  sector: string | null;
  version: number;
};
check(
  "Ley 19.628 el dato personal inexacto se corrige, el teléfono se normaliza y la versión avanza",
  correccionVecino.status === 200 &&
    corregida.telefono === "912345678" &&
    corregida.telefonoFormateado === "+56 9 1234 5678" &&
    corregida.version === personaPrueba.version + 1,
  `teléfono → ${corregida.telefono} (se muestra ${corregida.telefonoFormateado}), versión ${personaPrueba.version} → ${corregida.version}`
);

const correccionVecinoVieja = await A("PATCH", `/vecinos/${personaPrueba.id}`, {
  sector: "Otro sector",
  version: personaPrueba.version,
});
check(
  "CA-08 · ADR-005 corregir con una versión vieja → 409, nunca sobrescritura silenciosa",
  correccionVecinoVieja.status === 409 &&
    (correccionVecinoVieja.datos as { versionActual?: number }).versionActual === corregida.version,
  `409 con versionActual=${(correccionVecinoVieja.datos as { versionActual?: number }).versionActual}`
);

const rutOcupado = await A("PATCH", `/vecinos/${personaPrueba.id}`, {
  rut: "13.111.222-K",
  version: corregida.version,
});
check(
  "ADR-008 el RUT es único por organización: reasignarlo fusionaría dos historiales → 409",
  rutOcupado.status === 409,
  `status ${rutOcupado.status}`
);

const telefonoMalo = await A("PATCH", `/vecinos/${personaPrueba.id}`, {
  telefono: "123",
  version: corregida.version,
});
check("RF-010 un teléfono inválido se rechaza al corregir (400)", telefonoMalo.status === 400, "400");

const correccionVecinoAjena = await G("PATCH", `/vecinos/${personaPrueba.id}`, {
  sector: "Centro",
  version: corregida.version,
});
check(
  "ADR-012 solo corrige los datos de un vecino quien lo atendió en su delegación, o el nivel central",
  correccionVecinoAjena.status === 403,
  `funcionario sin atención previa → ${correccionVecinoAjena.status}`
);

// ===========================================================================
// 9. RUTAS HEREDADAS ENDURECIDAS — CA-08 · CA-09 · ADR-005 · ADR-006 · RF-001
//
// `/tareas`, `/unidades` y `/categorias` vienen de la Fase 2 y sostienen
// requisitos vigentes (EP-04, RF-001, RF-016 a RF-021): "v1" nunca quiso decir
// "obsoleta". Les faltaban las dos garantías transversales del sistema —
// bloqueo optimista y auditoría— y a `/unidades`, además, el propio RF-001:
// una delegación se DESACTIVA, no se borra.
// ===========================================================================

// ---- /categorias ----
const catCreada = await S("POST", "/categorias", { nombre: "Prueba A3", ordenPrioridad: 99 });
const categoriaPrueba = catCreada.datos as { id: string; version: number; nombre: string };
creado.categorias.push(categoriaPrueba.id);
check(
  "CA-08 una categoría nace con version 1",
  catCreada.status === 201 && categoriaPrueba.version === 1,
  `status ${catCreada.status} version ${categoriaPrueba.version}`
);

const catSinVersion = await S("PATCH", `/categorias/${categoriaPrueba.id}`, { nombre: "Sin versión" });
check(
  "CA-08 el PATCH de categoría sin `version` se rechaza (400), no se aplica a ciegas",
  catSinVersion.status === 400,
  `status ${catSinVersion.status}`
);

const catEditada = await S("PATCH", `/categorias/${categoriaPrueba.id}`, {
  nombre: "Prueba A3 editada",
  version: categoriaPrueba.version,
});
check(
  "CA-08 el PATCH de categoría con la versión vigente aplica e incrementa",
  catEditada.status === 200 && (catEditada.datos as { version: number }).version === 2,
  `status ${catEditada.status}`
);

const catConflicto = await S("PATCH", `/categorias/${categoriaPrueba.id}`, {
  nombre: "Pisada",
  version: categoriaPrueba.version, // la misma de antes: ya consumida
});
check(
  "CA-08 reutilizar una versión consumida en categorías → 409 con el registro vigente",
  catConflicto.status === 409 &&
    (catConflicto.datos as { versionActual: number; registro: { nombre: string } }).versionActual === 2 &&
    (catConflicto.datos as { registro: { nombre: string } }).registro.nombre === "Prueba A3 editada",
  `status ${catConflicto.status}`
);

const catRolUsuario = await G("POST", "/categorias", { nombre: "No debería", ordenPrioridad: 1 });
check(
  "Un funcionario no crea categorías (403)",
  catRolUsuario.status === 403,
  `status ${catRolUsuario.status}`
);

check(
  "Multi-tenant: una categoría inexistente o ajena responde 404",
  (await S("PATCH", "/categorias/11111111-1111-1111-1111-111111111111", { nombre: "X", version: 1 }))
    .status === 404
);

// ---- /unidades ----
const uniCreada = await A("POST", "/unidades", { nombre: "Delegación de prueba A3" });
const unidadPrueba = uniCreada.datos as { id: string; version: number; activo: boolean };
creado.unidades.push(unidadPrueba.id);
check(
  "RF-001 una delegación nace activa y con version 1",
  uniCreada.status === 201 && unidadPrueba.version === 1 && unidadPrueba.activo === true,
  `status ${uniCreada.status}`
);

const uniSinVersion = await A("PATCH", `/unidades/${unidadPrueba.id}`, { nombre: "Sin versión" });
check(
  "CA-08 el PATCH de delegación sin `version` se rechaza (400)",
  uniSinVersion.status === 400,
  `status ${uniSinVersion.status}`
);

const uniEditada = await A("PATCH", `/unidades/${unidadPrueba.id}`, {
  nombre: "Delegación de prueba A3 (editada)",
  version: unidadPrueba.version,
});
const uniConflicto = await A("PATCH", `/unidades/${unidadPrueba.id}`, {
  nombre: "Pisada",
  version: unidadPrueba.version,
});
check(
  "CA-08 en delegaciones la versión vigente aplica y la consumida da 409",
  uniEditada.status === 200 && uniConflicto.status === 409,
  `${uniEditada.status} y ${uniConflicto.status}`
);

// RF-001 es explícito: no se pierde la historia. Antes del Bloque A3 el DELETE
// borraba de verdad, con actividades y metas colgando de la delegación.
const uniBaja = await A("DELETE", `/unidades/${unidadPrueba.id}`);
const uniEnBase = await prisma.unidadTerritorial.findUnique({ where: { id: unidadPrueba.id } });
const uniListadoVigente = (await A("GET", "/unidades")).datos as { id: string }[];
const uniListadoTodo = (await A("GET", "/unidades?incluirInactivas=1")).datos as { id: string }[];
check(
  "RF-001 dar de baja una delegación la DESACTIVA, no la borra",
  uniBaja.status === 204 && uniEnBase !== null && uniEnBase.activo === false,
  `status ${uniBaja.status} · sigue en la base: ${uniEnBase !== null}`
);
check(
  "RF-001 una delegación desactivada sale de los selectores pero se sigue pudiendo consultar",
  !uniListadoVigente.some((u) => u.id === unidadPrueba.id) &&
    uniListadoTodo.some((u) => u.id === unidadPrueba.id),
  `vigentes ${uniListadoVigente.length} · con inactivas ${uniListadoTodo.length}`
);

const uniRolUsuario = await G("POST", "/unidades", { nombre: "No debería" });
check("Un funcionario no crea delegaciones (403)", uniRolUsuario.status === 403, `status ${uniRolUsuario.status}`);

// ---- /tareas (el tubo) ----
const tareaCreada = await A("POST", "/tareas", {
  titulo: "Tarea de prueba A3",
  unidadTerritorialId: centro.id,
  categoriaId: categoriaPrueba.id,
  responsableId: gabriel.usuario.id,
});
const tareaPrueba = tareaCreada.datos as { id: string; version: number; estado: string };
creado.tareas.push(tareaPrueba.id);
check(
  "CA-08 una tarea nace con version 1",
  tareaCreada.status === 201 && tareaPrueba.version === 1,
  `status ${tareaCreada.status} version ${tareaPrueba.version}`
);

const tareaSinVersion = await G("PATCH", `/tareas/${tareaPrueba.id}`, { estado: "en_proceso" });
check(
  "CA-08 mover una tarjeta del tubo sin `version` se rechaza (400)",
  tareaSinVersion.status === 400,
  `status ${tareaSinVersion.status}`
);

const tareaMovida = await G("PATCH", `/tareas/${tareaPrueba.id}`, {
  estado: "en_proceso",
  version: tareaPrueba.version,
});
const tareaPisada = await G("PATCH", `/tareas/${tareaPrueba.id}`, {
  estado: "realizado",
  version: tareaPrueba.version,
});
check(
  "CA-08 dos personas moviendo la misma tarjeta: la segunda recibe 409, no pisa a la primera",
  tareaMovida.status === 200 &&
    tareaPisada.status === 409 &&
    (tareaPisada.datos as { registro: { estado: string } }).registro.estado === "en_proceso",
  `${tareaMovida.status} y ${tareaPisada.status}`
);

// CA-09: la bitácora distingue mover de editar, para poder reconstruir el
// recorrido de una tarjeta por el tubo sin confundirlo con un cambio de texto.
const tareaRenombrada = await G("PATCH", `/tareas/${tareaPrueba.id}`, {
  titulo: "Tarea de prueba A3 (renombrada)",
  version: (tareaMovida.datos as { version: number }).version,
});
const auditoriaTarea = await prisma.auditoria.findMany({
  where: { entidad: "tarea", entidadId: tareaPrueba.id },
  orderBy: { createdAt: "asc" },
});
const accionesTarea = auditoriaTarea.map((a) => a.accion);
check(
  "CA-09 la bitácora del tubo distingue crear, cambiar_estado y actualizar",
  tareaRenombrada.status === 200 &&
    accionesTarea.includes("crear") &&
    accionesTarea.includes("cambiar_estado") &&
    accionesTarea.includes("actualizar"),
  accionesTarea.join(", ")
);
check(
  "CA-09 cada cambio del tubo guarda usuario, valor anterior y valor nuevo",
  auditoriaTarea.every((a) => a.usuarioId !== null) &&
    auditoriaTarea.some((a) => a.valorAnterior !== null && a.valorNuevo !== null) &&
    auditoriaTarea.some((a) => a.usuarioId === gabriel.usuario.id),
  `${auditoriaTarea.length} eventos`
);

const tareaBorrada = await A("DELETE", `/tareas/${tareaPrueba.id}`);
const auditoriaBorrado = await prisma.auditoria.findFirst({
  where: { entidad: "tarea", entidadId: tareaPrueba.id, accion: "eliminar" },
});
check(
  "CA-09 al borrar una tarea la bitácora conserva lo que decía: es lo único que queda",
  tareaBorrada.status === 204 && auditoriaBorrado !== null && auditoriaBorrado.valorAnterior !== null,
  `status ${tareaBorrada.status}`
);

const auditoriaHeredadas = await prisma.auditoria.findMany({
  where: { entidad: { in: ["categoria", "unidad"] }, entidadId: { in: [categoriaPrueba.id, unidadPrueba.id] } },
});
check(
  "CA-09 categorías y delegaciones también dejan rastro (crear, actualizar y eliminar)",
  ["crear", "actualizar", "eliminar"].every((a) => auditoriaHeredadas.some((x) => x.accion === a)) &&
    auditoriaHeredadas.every((a) => a.origen !== null),
  `${auditoriaHeredadas.length} eventos`
);

// ===========================================================================
// 10. ATENCIÓN SOCIAL Y SUS TRES GESTIONES — RF-015 · RF-004 · RN-012 · CA-04
//     HU-03 · ADR-006 · ADR-008 · ADR-012 · Leyes 19.628 / 21.719
//
// El caso que la especificación pide demostrar de punta a punta: un vecino
// llega, se abre su atención, y esa atención AVANZA hasta tres veces. Se monta
// sobre las dos actividades de la misma vecina que ya creó la sección 3 —una
// en Centro y otra en Rural—, porque el valor de CA-04 no es que el caso
// exista, sino que se vea cruzando delegaciones sin abrir el libro ajeno.
// ===========================================================================

const actividadSocialCentro = (actConPersona.datos as { id: string }).id;
const actividadSocialRural = (actRural.datos as { id: string }).id;
const actividadSinVecino = (act2.datos as { id: string }).id;

const altaAtencion = await G("POST", `/actividades/${actividadSocialCentro}/atencion-social`, {
  tipoAtencion: "Entrega emergencia",
  subAtencion: "Informe aporte material",
  requiereVisita: true,
  observacion: "La vecina solicita ayuda por temporal.",
});
const atencion = altaAtencion.datos as {
  id: string;
  version: number;
  gestionesRegistradas: number;
  estado: string;
  siguienteGestion: number | null;
};
check(
  "RF-015 la atención social se crea colgada de una actividad y nace sin gestiones",
  altaAtencion.status === 201 && atencion.gestionesRegistradas === 0 && atencion.siguienteGestion === 1,
  `status ${altaAtencion.status} · registradas ${atencion.gestionesRegistradas}`
);

const tipoInventado = await G("POST", `/actividades/${actividadSinVecino}/atencion-social`, {
  tipoAtencion: "Lo que se me ocurra",
});
check(
  "RF-004 el tipo de atención sale del catálogo, no de una lista en el código",
  tipoInventado.status === 422,
  `status ${tipoInventado.status}`
);

const subInventada = await G("POST", `/actividades/${actividadSinVecino}/atencion-social`, {
  tipoAtencion: "Informes sociales",
  subAtencion: "Categoría que no existe",
});
check("RF-004 la sub-atención también sale del catálogo", subInventada.status === 422, `status ${subInventada.status}`);

// RN-012: sin persona identificada no hay caso que seguir ni duplicidad que
// detectar. `act2` se registró sin vecino a propósito.
const sinPersona = await G("POST", `/actividades/${actividadSinVecino}/atencion-social`, {
  tipoAtencion: "Informes sociales",
});
check(
  "RN-012 una atención social exige un vecino identificado detrás",
  sinPersona.status === 422,
  `status ${sinPersona.status}`
);

const duplicada = await G("POST", `/actividades/${actividadSocialCentro}/atencion-social`, {
  tipoAtencion: "Informes sociales",
});
check(
  "RF-015 la atención es 1:1 con la actividad: una segunda es duplicado, no avance (409)",
  duplicada.status === 409 && typeof (duplicada.datos as { atencionSocialId?: string }).atencionSocialId === "string",
  `status ${duplicada.status}`
);

// --- Las tres gestiones como AVANCE ---
const g1 = await G("POST", `/atenciones-sociales/${atencion.id}/gestiones`, {
  gestion: "Atención social a usuario presencial",
  fechaProgramadaVisita: "2026-07-20",
  version: atencion.version,
});
const trasG1 = g1.datos as { gestionRegistrada: number; version: number; gestionesRegistradas: number; estado: string };
check(
  "RF-015 el SERVIDOR decide qué gestión es: la primera cae en el casillero 1",
  g1.status === 201 && trasG1.gestionRegistrada === 1 && trasG1.gestionesRegistradas === 1 && trasG1.estado === "abierta",
  `status ${g1.status} · gestión ${trasG1.gestionRegistrada}`
);

const fechaAjena = await G("POST", `/atenciones-sociales/${atencion.id}/gestiones`, {
  gestion: "Entrega informe",
  fechaEntregaBeneficio: "2026-07-25",
  version: trasG1.version,
});
check(
  "Cada gestión solo admite sus propias fechas (planilla §4)",
  fechaAjena.status === 422,
  `status ${fechaAjena.status}`
);

const gestionInventada = await G("POST", `/atenciones-sociales/${atencion.id}/gestiones`, {
  gestion: "Gestión que no está en ningún catálogo",
  version: trasG1.version,
});
check(
  "RF-004 el valor de la gestión se valida contra el catálogo de ESA gestión",
  gestionInventada.status === 422,
  `status ${gestionInventada.status}`
);

const g2 = await G("POST", `/atenciones-sociales/${atencion.id}/gestiones`, {
  gestion: "Entrega informe",
  fechaVisita: "2026-07-21",
  fechaEntregaInforme: "2026-07-24",
  observacion: "Se realiza la visita y se entrega el informe.",
  version: trasG1.version,
});
const trasG2 = g2.datos as {
  gestionRegistrada: number;
  version: number;
  gestionesRegistradas: number;
  gestiones: { numero: number; valor: string }[];
  observacion: string | null;
};
check(
  "RF-015 la segunda gestión AVANZA el caso y no pisa la primera",
  g2.status === 201 &&
    trasG2.gestionRegistrada === 2 &&
    trasG2.gestionesRegistradas === 2 &&
    trasG2.gestiones.some((x) => x.numero === 1 && x.valor === "Atención social a usuario presencial"),
  `gestiones: ${trasG2.gestiones.map((x) => x.numero).join(", ")}`
);
check(
  "La observación de una gestión se ANEXA: el relato del caso no se sobrescribe",
  (trasG2.observacion ?? "").includes("temporal") && (trasG2.observacion ?? "").includes("Gestión 2"),
  (trasG2.observacion ?? "sin observación").replace(/\n/g, " | ")
);

const conVersionVieja = await G("POST", `/atenciones-sociales/${atencion.id}/gestiones`, {
  gestion: "Entrega beneficio",
  version: trasG1.version, // ya consumida por la segunda gestión
});
check(
  "CA-08 avanzar con una versión consumida → 409, no una gestión duplicada",
  conVersionVieja.status === 409,
  `status ${conVersionVieja.status}`
);

const g3 = await G("POST", `/atenciones-sociales/${atencion.id}/gestiones`, {
  gestion: "Entrega beneficio",
  fechaEntregaBeneficio: "2026-07-28",
  version: trasG2.version,
});
const trasG3 = g3.datos as {
  gestionRegistrada: number;
  version: number;
  estado: string;
  siguienteGestion: number | null;
};
check(
  "RF-015 con la tercera gestión el caso queda CERRADO",
  g3.status === 201 && trasG3.gestionRegistrada === 3 && trasG3.estado === "cerrada" && trasG3.siguienteGestion === null,
  `estado ${trasG3.estado}`
);

const cuarta = await G("POST", `/atenciones-sociales/${atencion.id}/gestiones`, {
  gestion: "Entrega informe",
  version: trasG3.version,
});
check(
  "RF-015 no existe una cuarta gestión: el tope es del requisito, no del formulario",
  cuarta.status === 422,
  `status ${cuarta.status}`
);

// --- Alcance por rol: es una decisión legal, no de comodidad (ADR-012) ---
const verificadorMira = await V("GET", `/atenciones-sociales/${atencion.id}`);
const consultaMira = await C("GET", `/atenciones-sociales/${atencion.id}`);
check(
  "ADR-012 verificador y consulta no acceden al caso social, y el 403 dice por qué",
  verificadorMira.status === 403 &&
    consultaMira.status === 403 &&
    (verificadorMira.datos as { error: string }).error.includes("socioeconómica"),
  `${verificadorMira.status} y ${consultaMira.status}`
);

const ajena = await I("GET", `/atenciones-sociales/${atencion.id}`);
check(
  "Regla 9 el caso social de otra delegación responde 404, no 403",
  ajena.status === 404,
  `status ${ajena.status}`
);

const escrituraAjena = await I("POST", `/atenciones-sociales/${atencion.id}/gestiones`, {
  gestion: "Entrega informe",
  version: trasG3.version,
});
check(
  "RNF-005 nadie avanza el caso social de otra delegación",
  escrituraAjena.status === 404,
  `status ${escrituraAjena.status}`
);

const lecturaDelCaso = await G("GET", `/atenciones-sociales/${atencion.id}`);
const consultasDelCaso = await prisma.auditoria.count({
  where: { entidad: "atencion_social", entidadId: atencion.id, accion: "consultar" },
});
check(
  "ADR-006 · ADR-012 abrir un caso social queda en la bitácora como `consultar`",
  lecturaDelCaso.status === 200 && consultasDelCaso >= 1,
  `${consultasDelCaso} acceso(s) auditado(s)`
);

const bitacoraCaso = await prisma.auditoria.findMany({
  where: { entidad: "atencion_social", entidadId: atencion.id },
});
const accionesCaso = [...new Set(bitacoraCaso.map((a) => a.accion))];
check(
  "CA-09 la bitácora distingue abrir el caso (`crear`) de avanzarlo (`cambiar_estado`)",
  accionesCaso.includes("crear") && accionesCaso.includes("cambiar_estado"),
  accionesCaso.join(", ")
);

// --- CA-04 de punta a punta: la secuencia, consultable y cruzando delegaciones ---
const atencionRural = await I("POST", `/actividades/${actividadSocialRural}/atencion-social`, {
  tipoAtencion: "Entrega emergencia",
  primeraGestion: "Atención social a usuario presencial",
});
check(
  "RF-015 la primera gestión puede venir en el alta: atender a la persona YA es gestionar",
  atencionRural.status === 201 && (atencionRural.datos as { gestionesRegistradas: number }).gestionesRegistradas === 1,
  `status ${atencionRural.status}`
);

interface HechoConAtencion {
  id: string;
  detallado: boolean;
  delegacion: { nombre: string };
  atencionSocial: {
    gestionesRegistradas: number;
    estado: string;
    tipoAtencion: string | null;
    gestiones: unknown[];
  } | null;
}

const fichaVecina = await A("GET", `/vecinos/${personaCreada.id}`);
const hechos = (fichaVecina.datos as { historial: HechoConAtencion[] }).historial;
const casoCentro = hechos.find((h) => h.id === actividadSocialCentro);
const casoRural = hechos.find((h) => h.id === actividadSocialRural);
check(
  "CA-04 el caso social y su avance aparecen en el historial del vecino, en las DOS delegaciones",
  casoCentro?.atencionSocial?.gestionesRegistradas === 3 &&
    casoCentro.atencionSocial.estado === "cerrada" &&
    casoRural?.atencionSocial?.gestionesRegistradas === 1 &&
    casoRural.atencionSocial.estado === "abierta",
  `Centro ${casoCentro?.atencionSocial?.gestionesRegistradas}/3 · Rural ${casoRural?.atencionSocial?.gestionesRegistradas}/3`
);

// ADR-012 aplicado al dato más sensible: la funcionaria de Rural debe SABER
// que el caso de Centro existe y va cerrado —eso es lo que evita duplicar la
// ayuda— sin llegar a leer de qué se trata.
const fichaDesdeRural = await I("GET", `/vecinos/${personaCreada.id}`);
const hechosRural = (fichaDesdeRural.datos as { historial: HechoConAtencion[] }).historial;
const centroDesdeRural = hechosRural.find((h) => h.id === actividadSocialCentro);
check(
  "ADR-012 desde otra delegación se ve el AVANCE del caso pero no su contenido",
  centroDesdeRural?.detallado === false &&
    centroDesdeRural.atencionSocial?.gestionesRegistradas === 3 &&
    centroDesdeRural.atencionSocial.estado === "cerrada" &&
    centroDesdeRural.atencionSocial.tipoAtencion === null &&
    centroDesdeRural.atencionSocial.gestiones.length === 0,
  `detallado=${centroDesdeRural?.detallado} · tipo=${centroDesdeRural?.atencionSocial?.tipoAtencion}`
);

// --- Corrección de la cabecera ---
const cabeceraOk = await G("PATCH", `/atenciones-sociales/${atencion.id}`, {
  subAtencion: "Acta de entrega",
  version: trasG3.version,
});
const cabeceraVieja = await G("PATCH", `/atenciones-sociales/${atencion.id}`, {
  subAtencion: "Orientación social",
  version: trasG3.version,
});
check(
  "CA-08 la cabecera del caso se corrige con su versión, y la consumida da 409",
  cabeceraOk.status === 200 && cabeceraVieja.status === 409,
  `${cabeceraOk.status} y ${cabeceraVieja.status}`
);

check(
  "Multi-tenant: identificador mal formado → 400, caso inexistente → 404",
  (await A("GET", "/atenciones-sociales/no-es-uuid")).status === 400 &&
    (await A("GET", "/atenciones-sociales/11111111-1111-1111-1111-111111111111")).status === 404,
  "400 y 404"
);

// El seed arma el caso a propósito: los datos de demostración son parte del
// entregable y sin ellos la pantalla queda correcta y vacía.
const atencionesSembradas = await prisma.atencionSocial.count();
const completasSembradas = await prisma.atencionSocial.count({ where: { terceraGestion: { not: null } } });
check(
  "CA-04 el seed deja casos sociales en las tres etapas, incluidos algunos completos",
  atencionesSembradas >= 20 && completasSembradas >= 1,
  `${atencionesSembradas} atenciones, ${completasSembradas} con las 3 gestiones`
);

// ===========================================================================
// 11. LA SOLICITUD DEL VECINO EN EL TUBO — RF-016 · RF-017 · RF-004 · CA-04
//     ADR-008 · ADR-007
//
// El agujero que cerró el Bloque B5: `services/vecinos.ts` YA leía
// `tarea.personaUsuariaId` y mostraba los compromisos del vecino, pero ninguna
// pantalla podía crear ese vínculo —solo el seed—, así que un compromiso
// registrado desde la aplicación no llegaba a la ficha. La trazabilidad
// parecía rota sin estarlo.
//
// La comprobación que importa no es que el campo se guarde: es que el
// compromiso APAREZCA en el historial del vecino. Las demás protegen esa.
// ===========================================================================

const compromisoInterno = await S("POST", "/tareas", {
  titulo: "Revisión interna de inventario (prueba)",
  unidadTerritorialId: centro.id,
  categoriaId: categoriaPrueba.id,
  interesExterno: false,
});
if (compromisoInterno.status === 201) creado.tareas.push((compromisoInterno.datos as { id: string }).id);
check(
  "RF-016 un compromiso INTERNO no exige solicitante: el formulario no crece para el caso frecuente",
  compromisoInterno.status === 201 &&
    (compromisoInterno.datos as { interesExterno: boolean }).interesExterno === false,
  `status ${compromisoInterno.status}`
);

const externaSinSolicitante = await S("POST", "/tareas", {
  titulo: "Solicitud externa sin quién la pidió (prueba)",
  unidadTerritorialId: centro.id,
  categoriaId: categoriaPrueba.id,
  interesExterno: true,
});
check(
  "RF-017 una solicitud EXTERNA sin solicitante se rechaza (422): si no, INT/EXT no significa nada",
  externaSinSolicitante.status === 422,
  `status ${externaSinSolicitante.status}`
);

const territorioInventado = await S("POST", "/tareas", {
  titulo: "Con un territorio que no existe (prueba)",
  unidadTerritorialId: centro.id,
  categoriaId: categoriaPrueba.id,
  interesExterno: true,
  solicitante: "Junta de vecinos de prueba",
  territorio: "Sector Que No Existe",
});
check(
  "RF-004 el territorio sale del catálogo, no de una lista en el código",
  territorioInventado.status === 422,
  `status ${territorioInventado.status}`
);

const areaInventada = await S("POST", "/tareas", {
  titulo: "Con un área de apoyo que no existe (prueba)",
  unidadTerritorialId: centro.id,
  categoriaId: categoriaPrueba.id,
  interesExterno: true,
  solicitante: "Junta de vecinos de prueba",
  areaApoyo: "Departamento Imaginario",
});
check(
  "RF-004 el área de apoyo también sale del catálogo",
  areaInventada.status === 422,
  `status ${areaInventada.status}`
);

const cuerpoVecinoAjeno = {
  titulo: "Enlazada a un vecino que no existe (prueba)",
  unidadTerritorialId: centro.id,
  categoriaId: categoriaPrueba.id,
  interesExterno: true,
  solicitante: "Alguien",
};
// UUID bien formado (v4) pero inexistente → 404; mal formado → 400. Son cosas
// distintas y el proyecto las distingue (regla 8).
const vecinoInexistente = await S("POST", "/tareas", {
  ...cuerpoVecinoAjeno,
  personaUsuariaId: "11111111-1111-4111-8111-111111111111",
});
const vecinoMalFormado = await S("POST", "/tareas", {
  ...cuerpoVecinoAjeno,
  personaUsuariaId: "no-es-uuid",
});
check(
  "Multi-tenant: enlazar a una persona inexistente o de otro tenant → 404; identificador mal formado → 400",
  vecinoInexistente.status === 404 && vecinoMalFormado.status === 400,
  `${vecinoInexistente.status} y ${vecinoMalFormado.status}`
);

// --- El compromiso externo completo, enlazado a la vecina del caso CA-04 ---
const compromisoExterno = await S("POST", "/tareas", {
  titulo: "Retiro de escombros tras el temporal (prueba)",
  descripcion: "La vecina pide retiro en su pasaje.",
  unidadTerritorialId: centro.id,
  categoriaId: categoriaPrueba.id,
  interesExterno: true,
  fechaSolicitud: "2026-07-15",
  solicitante: "Vecina DePrueba",
  personaUsuariaId: personaCreada.id,
  territorio: "Sector Norte",
  areaApoyo: "DISERCO",
  observaciones: "Coordinado con la delegación.",
});
const compromiso = compromisoExterno.datos as {
  id: string;
  version: number;
  interesExterno: boolean;
  solicitante: string | null;
  territorio: string | null;
  areaApoyo: string | null;
  personaUsuaria: { id: string; rut: string | null } | null;
  alertaTrazabilidad: { delegaciones: string[]; mensaje: string } | null;
};
if (compromisoExterno.status === 201) creado.tareas.push(compromiso.id);
check(
  "RF-017 el compromiso externo guarda solicitante, territorio, área de apoyo y el vínculo con el vecino",
  compromisoExterno.status === 201 &&
    compromiso.interesExterno === true &&
    compromiso.solicitante === "Vecina DePrueba" &&
    compromiso.territorio === "Sector Norte" &&
    compromiso.areaApoyo === "DISERCO" &&
    compromiso.personaUsuaria?.id === personaCreada.id,
  `status ${compromisoExterno.status}`
);

// ADR-008: el aviso que ya daba el alta de una actividad, ahora también aquí.
// La vecina tiene atenciones en Rural (sección 3) y este compromiso es Centro.
check(
  "ADR-008 · CA-04 el alta del compromiso avisa que la persona ya registra hechos en otra delegación",
  compromiso.alertaTrazabilidad !== null &&
    compromiso.alertaTrazabilidad.delegaciones.includes("Rural"),
  compromiso.alertaTrazabilidad?.mensaje ?? "sin alerta"
);

// --- LA COMPROBACIÓN QUE CIERRA EL AGUJERO ---
interface HechoDelHistorial {
  tipo: string;
  id: string;
  titulo: string | null;
  delegacion: { nombre: string };
}
const fichaConCompromiso = await A("GET", `/vecinos/${personaCreada.id}`);
const historialConTubo = (fichaConCompromiso.datos as { historial: HechoDelHistorial[] }).historial;
const elCompromiso = historialConTubo.find((h) => h.tipo === "compromiso" && h.id === compromiso.id);
check(
  "RF-016 · CA-04 un compromiso creado POR LA API aparece en la ficha del vecino (antes solo los del seed)",
  elCompromiso !== undefined && elCompromiso.titulo === "Retiro de escombros tras el temporal (prueba)",
  elCompromiso ? `«${elCompromiso.titulo}» en ${elCompromiso.delegacion.nombre}` : "NO aparece en el historial"
);

// --- Corrección posterior ---
const marcarExterna = await S("PATCH", `/tareas/${compromisoInterno.datos && (compromisoInterno.datos as { id: string }).id}`, {
  interesExterno: true,
  version: (compromisoInterno.datos as { version: number }).version,
});
check(
  "RF-017 pasar un compromiso a externo sin decir quién lo pidió también se rechaza (422)",
  marcarExterna.status === 422,
  `status ${marcarExterna.status}`
);

const correccionTubo = await S("PATCH", `/tareas/${compromiso.id}`, {
  territorio: "Zona Rural",
  areaApoyo: "Sección Aseo",
  version: compromiso.version,
});
const auditoriaTubo = await prisma.auditoria.findMany({
  where: { entidad: "tarea", entidadId: compromiso.id },
});
check(
  "CA-09 corregir la solicitud aplica y queda en la bitácora con su valor anterior",
  correccionTubo.status === 200 &&
    (correccionTubo.datos as { territorio: string }).territorio === "Zona Rural" &&
    auditoriaTubo.some((a) => a.accion === "crear") &&
    auditoriaTubo.some((a) => a.accion === "actualizar" && a.valorAnterior !== null),
  `status ${correccionTubo.status} · ${auditoriaTubo.length} eventos`
);

const territorioMaloAlCorregir = await S("PATCH", `/tareas/${compromiso.id}`, {
  territorio: "Otro que no existe",
  version: (correccionTubo.datos as { version: number }).version,
});
check(
  "RF-004 el catálogo también se valida al corregir, no solo al crear",
  territorioMaloAlCorregir.status === 422,
  `status ${territorioMaloAlCorregir.status}`
);

// El libro sigue siendo privado: el funcionario de Rural no ve el de Centro.
const tuboAjeno = await I("GET", `/tareas?unidad=${centro.id}`);
check(
  "Regla 9 la solicitud no abre el libro ajeno: el tubo de otra delegación sigue dando 404",
  tuboAjeno.status === 404,
  `status ${tuboAjeno.status}`
);

// ===========================================================================
// Limpieza — el script no debe dejar rastro en los datos de demostración
// ===========================================================================
await prisma.tarea.deleteMany({ where: { id: { in: creado.tareas } } });
await prisma.categoriaGestion.deleteMany({ where: { id: { in: creado.categorias } } });
await prisma.unidadTerritorial.deleteMany({ where: { id: { in: creado.unidades } } });
await prisma.metaItem.deleteMany({ where: { periodoId: { in: creado.periodos } } });
for (const e of creado.evidencias) await eliminarArchivo(e.ruta);
await prisma.validacion.deleteMany({ where: { evidenciaId: { in: creado.evidencias.map((e) => e.id) } } });
await prisma.evidencia.deleteMany({ where: { id: { in: creado.evidencias.map((e) => e.id) } } });
await prisma.actividad.deleteMany({ where: { id: { in: creado.actividades } } });
await prisma.personaUsuaria.deleteMany({ where: { id: { in: creado.personas } } });
await prisma.metaItem.deleteMany({ where: { itemId: { in: creado.items } } });
await prisma.itemMedicion.deleteMany({ where: { id: { in: creado.items } } });
await prisma.cargo.deleteMany({ where: { id: { in: creado.cargos } } });
await prisma.periodo.deleteMany({ where: { id: { in: creado.periodos } } });

console.log("\n" + resultados.join("\n"));
const fallos = resultados.filter((r) => r.startsWith("FAIL")).length;
console.log(`\n${resultados.length - fallos}/${resultados.length} verificaciones en verde`);

await prisma.$disconnect();
process.exit(fallos > 0 ? 1 : 0);
