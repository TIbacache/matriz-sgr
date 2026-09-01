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
const repartoCompleto = await A("PUT", "/metas-item", {
  periodoId: periodoPrueba.id,
  funcionarioId: gabriel.usuario.id,
  metas: reparto,
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
// Limpieza — el script no debe dejar rastro en los datos de demostración
// ===========================================================================
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
