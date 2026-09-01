// Seed de desarrollo — SGR
//
// ⚠ DATOS 100% FICTICIOS. El PDF de los profesores lo exige: "Solo se
// utilizarán datos ficticios o anonimizados. Está prohibido cargar información
// real de ciudadanos o funcionarios." Los nombres, RUT y teléfonos de este
// archivo son inventados; la ESTRUCTURA (cargos, ítems, catálogos, ponderadores)
// sí reproduce la planilla real, que es lo que se debe modelar.
//
// Credenciales demo: password "matriz123" para todas las cuentas.
import { PrismaClient, Prisma } from "@prisma/client";
import bcrypt from "bcrypt";
import { randomUUID } from "node:crypto";
import { normalizarRut } from "../src/lib/rut.js";
import { sembrarParametros } from "../src/services/parametros.js";

const prisma = new PrismaClient();

const ORG_ID = "00000000-0000-0000-0000-000000000001";

// Delegaciones (nombres del caso real: son públicos y no son datos personales)
const DELEGACIONES = ["Centro", "Rural", "La Antena", "La Pampa", "Avenida del Mar", "Las Compañías"];

// Pilares / áreas
const PILARES = ["Seguridad", "DISERCO", "Social (DIDECO)", "Organizaciones Comunitarias", "Patrimonio"];

// Cargos con sus ítems medibles y ponderadores (estructura de la planilla real,
// docs/estructura-planilla-real.md §2 y §9). Los ponderadores suman 1 (RN-001).
const CARGOS: {
  nombre: string;
  area: string;
  items: { nombre: string; ponderador: number; meta: number; tipo?: "porcentaje"; direccion?: "menor_mejor" }[];
}[] = [
  {
    nombre: "Apoyo Administrativo",
    area: "APOY ADM",
    items: [
      { nombre: "Atención de usuario teléfono y presencial", ponderador: 0.35, meta: 240 },
      { nombre: "Llamadas preventivas a usuarios", ponderador: 0.25, meta: 90 },
      { nombre: "Informe de inventarios", ponderador: 0.15, meta: 1 },
      { nombre: "Informe a comunicaciones", ponderador: 0.2, meta: 12 },
      { nombre: "Emergencia", ponderador: 0.05, meta: 8 },
    ],
  },
  {
    nombre: "Territorial OO.CC. 1",
    area: "T OO CC",
    items: [
      { nombre: "Atención de usuario teléfono y presencial", ponderador: 0.1, meta: 45 },
      { nombre: "Visitas, reuniones con organizaciones", ponderador: 0.15, meta: 24 },
      { nombre: "Conformación de directivas definitiva", ponderador: 0.25, meta: 2 },
      { nombre: "Gestión de talleres y actividades", ponderador: 0.15, meta: 24 },
      { nombre: "Emergencia", ponderador: 0.05, meta: 8 },
      { nombre: "Soluciones al ingreso al tubo", ponderador: 0.3, meta: 80, tipo: "porcentaje" },
    ],
  },
  {
    nombre: "Gestor Social 1",
    area: "SOCIAL",
    items: [
      { nombre: "Atención social a usuario presencial", ponderador: 0.35, meta: 360 },
      { nombre: "Visita social en terreno", ponderador: 0.25, meta: 48 },
      { nombre: "Entrega informe", ponderador: 0.2, meta: 120 },
      { nombre: "Entrega beneficio", ponderador: 0.15, meta: 32 },
      { nombre: "Emergencia", ponderador: 0.05, meta: 8 },
    ],
  },
  {
    nombre: "Coordinador DISERCO",
    area: "COSERCO",
    items: [
      { nombre: "Informes", ponderador: 0.15, meta: 15 },
      { nombre: "Operativos", ponderador: 0.25, meta: 36 },
      { nombre: "Talleres", ponderador: 0.2, meta: 12 },
      { nombre: "Terreno", ponderador: 0.2, meta: 24 },
      { nombre: "Atención requerimiento usuario", ponderador: 0.15, meta: 24 },
      { nombre: "Emergencia", ponderador: 0.05, meta: 8 },
    ],
  },
  {
    nombre: "Planificación y Control",
    area: "P Y C",
    items: [
      { nombre: "Reunión semanal con el equipo", ponderador: 0.25, meta: 12 },
      { nombre: "Solución de problemas a usuarios particulares", ponderador: 0.2, meta: 8 },
      { nombre: "Soluciones de ingresos al tubo", ponderador: 0.25, meta: 80, tipo: "porcentaje" },
      // ADR-009: ítem INVERSO — superar la meta es malo
      { nombre: "Pendientes en tubo menor a 10%", ponderador: 0.3, meta: 10, tipo: "porcentaje", direccion: "menor_mejor" },
    ],
  },
];

// Personas FICTICIAS. RUT generados con dígito verificador válido.
const EQUIPO = [
  { email: "admin@sgr.demo", nombres: "Ana", paterno: "Contreras", materno: "Bravo", rut: "11111111-1", rol: "admin", cargo: null, delegacion: null },
  { email: "coordinador@sgr.demo", nombres: "Carlos", paterno: "Miranda", materno: "Soto", rut: "12345678-5", rol: "supervisor", cargo: null, delegacion: null },
  { email: "verificador@sgr.demo", nombres: "Valeria", paterno: "Ortega", materno: "Lillo", rut: "13579246-2", rol: "verificador", cargo: null, delegacion: null },
  { email: "consulta@sgr.demo", nombres: "Camila", paterno: "Fuentes", materno: "Rivas", rut: "15975348-4", rol: "consulta", cargo: null, delegacion: null },
  { email: "delegado.centro@sgr.demo", nombres: "Diego", paterno: "Salinas", materno: "Peña", rut: "14725836-4", rol: "gerente", cargo: null, delegacion: "Centro" },
  { email: "delegado.rural@sgr.demo", nombres: "Daniela", paterno: "Aguirre", materno: "Mella", rut: "16182420-8", rol: "gerente", cargo: null, delegacion: "Rural" },
  { email: "apoyo.centro@sgr.demo", nombres: "Paula", paterno: "Herrera", materno: "Vidal", rut: "17342896-0", rol: "usuario", cargo: "Apoyo Administrativo", delegacion: "Centro" },
  { email: "territorial.centro@sgr.demo", nombres: "Gabriel", paterno: "Muñoz", materno: "Reyes", rut: "18456123-9", rol: "usuario", cargo: "Territorial OO.CC. 1", delegacion: "Centro" },
  { email: "social.centro@sgr.demo", nombres: "Javiera", paterno: "Cáceres", materno: "Núñez", rut: "19234567-7", rol: "usuario", cargo: "Gestor Social 1", delegacion: "Centro" },
  { email: "diserco.centro@sgr.demo", nombres: "Rodrigo", paterno: "Valenzuela", materno: "Pino", rut: "10203040-0", rol: "usuario", cargo: "Coordinador DISERCO", delegacion: "Centro" },
  { email: "planificacion.centro@sgr.demo", nombres: "Elena", paterno: "Tapia", materno: "Godoy", rut: "9876543-3", rol: "usuario", cargo: "Planificación y Control", delegacion: "Centro" },
  { email: "territorial.rural@sgr.demo", nombres: "Ignacio", paterno: "Bustos", materno: "Farías", rut: "20123456-5", rol: "usuario", cargo: "Territorial OO.CC. 1", delegacion: "Rural" },
  { email: "social.rural@sgr.demo", nombres: "Marcela", paterno: "Rojas", materno: "Leiva", rut: "16543210-K", rol: "usuario", cargo: "Gestor Social 1", delegacion: "Rural" },
] as const;

// Vecinos ficticios (para trazabilidad por RUT — ADR-008)
const VECINOS = [
  { rut: "13111222-K", nombres: "Rosa", paterno: "Maldonado", materno: "Silva", telefono: "912345678", sector: "Las Terrazas" },
  { rut: "14222333-3", nombres: "Pedro", paterno: "Cortés", materno: "Araya", telefono: "923456789", sector: "El Mirador" },
  { rut: "15333444-7", nombres: "Luisa", paterno: "Espinoza", materno: "Rojas", telefono: "934567890", sector: "Villa Norte" },
];

const CATALOGOS: { catalogo: string; area?: string; valores: string[] }[] = [
  { catalogo: "tipo_atencion", area: "SOCIAL", valores: ["Informes sociales", "Gestión de subsidios", "Derivación", "Otras gestiones sociales", "Entrega emergencia", "Otros"] },
  { catalogo: "sub_atencion", area: "SOCIAL", valores: ["Informe aporte económico", "Informe aporte material", "Informe institución", "Exención pago aseo domiciliario", "Orientación social", "IPS", "PGU", "SAP", "SUF", "Acta de entrega", "Otros"] },
  { catalogo: "gestion_1", area: "SOCIAL", valores: ["Atención social a usuario presencial", "Entrega informe", "Visita terreno", "Emergencia", "Otras gestiones"] },
  { catalogo: "gestion_2", area: "SOCIAL", valores: ["Entrega beneficio", "Entrega informe", "Visita terreno", "Emergencia", "Otros"] },
  { catalogo: "gestion_3", area: "SOCIAL", valores: ["Entrega beneficio", "Entrega informe", "Emergencia", "Otros"] },
  { catalogo: "territorio", valores: ["Sector Norte", "Sector Sur", "Sector Poniente", "Sector Oriente", "Zona Rural"] },
  { catalogo: "area_apoyo", valores: ["DISERCO", "Tránsito", "Alumbrado Público", "Sección Aseo", "Área Mujeres", "Seguridad Ciudadana"] },
  { catalogo: "canal_ajuste", valores: ["WhatsApp", "Correo", "Libro de reclamos y sugerencias", "Presencial"] },
  // RNF-017: los formatos de evidencia aceptados son CONFIGURABLES (catálogo),
  // igual que el tamaño máximo es un parámetro. Nada de listas en el código.
  { catalogo: "formato_evidencia", valores: ["image/jpeg", "image/png", "image/webp", "application/pdf"] },
];

async function main() {
  const passwordHash = await bcrypt.hash("matriz123", 10);

  const org = await prisma.organization.upsert({
    where: { id: ORG_ID },
    update: { nombre: "Municipalidad Demo (datos ficticios)" },
    create: {
      id: ORG_ID,
      nombre: "Municipalidad Demo (datos ficticios)",
      tipo: "municipio",
      configuracionTerminologia: {
        unidad: "delegación",
        unidades: "delegaciones",
        autoridad: "alcaldesa",
        categoria: "pilar",
        categorias: "pilares",
      },
    },
  });

  // --- Parámetros configurables (ADR-007) ---
  await sembrarParametros(org.id);

  // --- Período (RF-005: se configura, no se codifica) ---
  const periodo = await prisma.periodo.upsert({
    where: { organizationId_nombre: { organizationId: org.id, nombre: "3er trimestre 2026" } },
    update: {},
    create: {
      organizationId: org.id,
      nombre: "3er trimestre 2026",
      fechaInicio: new Date("2026-07-01T00:00:00.000Z"),
      fechaTermino: new Date("2026-09-30T00:00:00.000Z"),
      estado: "abierto",
    },
  });

  // --- Delegaciones ---
  const unidadPorNombre = new Map<string, string>();
  for (const nombre of DELEGACIONES) {
    const existente = await prisma.unidadTerritorial.findFirst({ where: { organizationId: org.id, nombre } });
    const u = existente ?? (await prisma.unidadTerritorial.create({ data: { organizationId: org.id, nombre } }));
    unidadPorNombre.set(nombre, u.id);
  }

  // --- Pilares ---
  const categoriaPorNombre = new Map<string, string>();
  for (const [i, nombre] of PILARES.entries()) {
    const existente = await prisma.categoriaGestion.findFirst({ where: { organizationId: org.id, nombre } });
    const c = existente ?? (await prisma.categoriaGestion.create({ data: { organizationId: org.id, nombre, ordenPrioridad: i } }));
    categoriaPorNombre.set(nombre, c.id);
  }

  // --- Cargos e ítems de medición (RF-003) ---
  const cargoPorNombre = new Map<string, string>();
  const itemsPorCargo = new Map<
    string,
    { id: string; nombreItem: string; ponderador: number; meta: number }[]
  >();
  for (const c of CARGOS) {
    const cargo = await prisma.cargo.upsert({
      where: { organizationId_nombre: { organizationId: org.id, nombre: c.nombre } },
      update: { area: c.area },
      create: { organizationId: org.id, nombre: c.nombre, area: c.area },
    });
    cargoPorNombre.set(c.nombre, cargo.id);

    const lista: { id: string; nombreItem: string; ponderador: number; meta: number }[] = [];
    for (const [i, it] of c.items.entries()) {
      const existente = await prisma.itemMedicion.findFirst({
        where: { organizationId: org.id, cargoId: cargo.id, nombre: it.nombre },
      });
      const item =
        existente ??
        (await prisma.itemMedicion.create({
          data: {
            organizationId: org.id,
            cargoId: cargo.id,
            nombre: it.nombre,
            tipo: it.tipo ?? "cantidad",
            direccion: it.direccion ?? "mayor_mejor",
            alimentadoPorTubo: it.nombre.toLowerCase().includes("tubo"),
            orden: i,
          },
        }));
      lista.push({ id: item.id, nombreItem: it.nombre, ponderador: it.ponderador, meta: it.meta });
    }
    itemsPorCargo.set(c.nombre, lista);
  }

  // --- Catálogos (RF-004) ---
  for (const cat of CATALOGOS) {
    for (const [i, valor] of cat.valores.entries()) {
      await prisma.catalogoItem.upsert({
        where: { organizationId_catalogo_valor: { organizationId: org.id, catalogo: cat.catalogo, valor } },
        update: { orden: i, area: cat.area ?? null },
        create: { organizationId: org.id, catalogo: cat.catalogo, valor, area: cat.area ?? null, orden: i },
      });
    }
  }

  // --- Equipo ---
  const userPorEmail = new Map<string, string>();
  for (const p of EQUIPO) {
    const rut = normalizarRut(p.rut);
    if (!rut) throw new Error(`RUT ficticio inválido en el seed: ${p.rut} (${p.email})`);
    const nombreCompleto = `${p.nombres} ${p.paterno} ${p.materno}`;
    const user = await prisma.user.upsert({
      where: { email: p.email },
      update: { nombre: nombreCompleto, nombres: p.nombres, apellidoPaterno: p.paterno, apellidoMaterno: p.materno, rut },
      create: {
        email: p.email,
        nombre: nombreCompleto,
        nombres: p.nombres,
        apellidoPaterno: p.paterno,
        apellidoMaterno: p.materno,
        rut,
        passwordHash,
      },
    });
    userPorEmail.set(p.email, user.id);

    const unidadId = p.delegacion ? unidadPorNombre.get(p.delegacion)! : null;
    const cargoId = p.cargo ? cargoPorNombre.get(p.cargo)! : null;
    await prisma.organizationMember.upsert({
      where: { organizationId_userId: { organizationId: org.id, userId: user.id } },
      update: { rol: p.rol, unidadTerritorialId: unidadId, cargo: p.cargo, cargoId },
      create: { organizationId: org.id, userId: user.id, rol: p.rol, unidadTerritorialId: unidadId, cargo: p.cargo, cargoId },
    });

    if (p.rol === "gerente" && unidadId) {
      await prisma.unidadTerritorial.update({ where: { id: unidadId }, data: { responsableId: user.id } });
    }
  }

  // --- Metas por funcionario e ítem (RF-007, RN-001: ponderadores suman 1) ---
  for (const p of EQUIPO) {
    if (!p.cargo) continue;
    const items = itemsPorCargo.get(p.cargo)!;
    const funcionarioId = userPorEmail.get(p.email)!;
    for (const it of items) {
      await prisma.metaItem.upsert({
        where: { periodoId_itemId_funcionarioId: { periodoId: periodo.id, itemId: it.id, funcionarioId } },
        // Debe actualizar: si no, un cambio de ponderador en el seed no se
        // refleja y la suma deja de dar 100% (RN-001).
        update: {
          metaValor: new Prisma.Decimal(it.meta),
          ponderador: new Prisma.Decimal(it.ponderador),
        },
        create: {
          organizationId: org.id,
          periodoId: periodo.id,
          itemId: it.id,
          funcionarioId,
          metaValor: new Prisma.Decimal(it.meta),
          ponderador: new Prisma.Decimal(it.ponderador),
        },
      });
    }
  }

  // --- Vecinos ficticios (ADR-008) ---
  const vecinoPorRut = new Map<string, string>();
  for (const v of VECINOS) {
    const rut = normalizarRut(v.rut);
    if (!rut) throw new Error(`RUT de vecino ficticio inválido: ${v.rut}`);
    const persona = await prisma.personaUsuaria.upsert({
      where: { organizationId_rut: { organizationId: org.id, rut } },
      update: {},
      create: {
        organizationId: org.id,
        rut,
        nombres: v.nombres,
        apellidoPaterno: v.paterno,
        apellidoMaterno: v.materno,
        telefono: v.telefono,
        sector: v.sector,
      },
    });
    vecinoPorRut.set(rut, persona.id);
  }

  // --- Ausencias: una funcionaria con 10 días, para que su objetivo al día
  // difiera del resto igual que en la planilla real (39,56% vs 50,55%) ---
  const conAusencia = userPorEmail.get("territorial.centro@sgr.demo")!;
  const yaTiene = await prisma.ausencia.findFirst({
    where: { organizationId: org.id, periodoId: periodo.id, funcionarioId: conAusencia },
  });
  if (!yaTiene) {
    await prisma.ausencia.create({
      data: {
        organizationId: org.id,
        periodoId: periodo.id,
        funcionarioId: conAusencia,
        tipo: "licencia",
        fechaDesde: new Date("2026-08-03T00:00:00.000Z"),
        fechaHasta: new Date("2026-08-12T00:00:00.000Z"),
        dias: 10,
        observacion: "Licencia médica (dato ficticio de demostración)",
      },
    });
  }

  // --- Datos transaccionales: se REGENERAN en cada corrida ---
  // Los datos maestros (organización, personas, cargos, ítems, catálogos,
  // períodos, metas) se mantienen con upsert; lo transaccional se borra y se
  // vuelve a crear, para que el seed sea reproducible y no acumule basura de
  // corridas anteriores. La auditoría tiene trigger anti-DELETE, así que se
  // desactiva temporalmente solo para esta limpieza de desarrollo.
  await prisma.$executeRawUnsafe("ALTER TABLE auditoria DISABLE TRIGGER auditoria_sin_delete");
  await prisma.auditoria.deleteMany({ where: { organizationId: org.id } });
  await prisma.$executeRawUnsafe("ALTER TABLE auditoria ENABLE TRIGGER auditoria_sin_delete");
  await prisma.validacion.deleteMany({ where: { organizationId: org.id } });
  await prisma.evidencia.deleteMany({ where: { organizationId: org.id } });
  await prisma.actividad.deleteMany({ where: { organizationId: org.id } });
  await prisma.tareaHistorial.deleteMany({ where: { organizationId: org.id } });
  await prisma.tarea.deleteMany({ where: { organizationId: org.id } });

  // --- Tubo de trabajo ---
  {
    const ejemplos = [
      { titulo: "Camino cortado por lluvia en sector rural", pilar: "DISERCO", estado: "en_proceso", dias: 3, ext: true, territorio: "Zona Rural", apoyo: "DISERCO" },
      { titulo: "Solicitud de máquina para despeje de camino", pilar: "DISERCO", estado: "pendiente", dias: -2, ext: true, territorio: "Zona Rural", apoyo: "DISERCO" },
      { titulo: "Taller de reciclaje con junta de vecinos", pilar: "Organizaciones Comunitarias", estado: "realizado", dias: -8, ext: false, territorio: "Sector Norte", apoyo: null },
      { titulo: "Operativo de limpieza en plaza principal", pilar: "DISERCO", estado: "realizado", dias: -5, ext: false, territorio: "Sector Sur", apoyo: "Sección Aseo" },
      { titulo: "Entrega de caja de útiles escolares", pilar: "Social (DIDECO)", estado: "pendiente", dias: 5, ext: true, territorio: "Sector Poniente", apoyo: null },
      { titulo: "Solicitud de iluminación en pasaje", pilar: "Seguridad", estado: "ingresado", dias: 7, ext: true, territorio: "Sector Oriente", apoyo: "Alumbrado Público" },
      { titulo: "Ronda preventiva con inspectores municipales", pilar: "Seguridad", estado: "pendiente", dias: -1, ext: false, territorio: "Sector Norte", apoyo: "Seguridad Ciudadana" },
      { titulo: "Conformación de directiva junta de vecinos", pilar: "Organizaciones Comunitarias", estado: "en_proceso", dias: 7, ext: false, territorio: "Sector Sur", apoyo: null },
    ];
    const responsables = ["territorial.centro@sgr.demo", "social.centro@sgr.demo", "diserco.centro@sgr.demo", "apoyo.centro@sgr.demo"];
    const rutsVecinos = [...vecinoPorRut.values()];

    for (const delegacion of ["Centro", "Rural"]) {
      for (const [i, t] of ejemplos.entries()) {
        const tarea = await prisma.tarea.create({
          data: {
            organizationId: org.id,
            unidadTerritorialId: unidadPorNombre.get(delegacion)!,
            categoriaId: categoriaPorNombre.get(t.pilar)!,
            titulo: t.titulo,
            estado: t.estado,
            interesExterno: t.ext,
            territorio: t.territorio,
            areaApoyo: t.apoyo,
            fechaSolicitud: new Date(Date.now() - 10 * 86_400_000),
            fechaCompromiso: new Date(Date.now() + t.dias * 86_400_000),
            responsableId: userPorEmail.get(responsables[i % responsables.length]!)!,
            personaUsuariaId: t.ext ? rutsVecinos[i % rutsVecinos.length]! : null,
          },
        });
        // RF-018: toda tarea nace con su primera entrada de historial
        await prisma.tareaHistorial.create({
          data: {
            organizationId: org.id,
            tareaId: tarea.id,
            estadoAnterior: null,
            estadoNuevo: t.estado,
            autorId: userPorEmail.get("delegado.centro@sgr.demo")!,
            observacion: "Registro inicial (seed)",
          },
        });
      }
    }
  }

  // --- Actividades con evidencia validada, para que el cálculo tenga insumo ---
  // Se insertan en bloque (createMany) y los códigos se calculan en memoria,
  // porque generarCodigo() abre una transacción con bloqueo por llamada: sirve
  // para el uso real concurrente, no para sembrar cientos de filas.
  {
    const verificadorId = userPorEmail.get("verificador@sgr.demo")!;
    const funcionarios = EQUIPO.filter((p) => p.cargo);

    // Cumplimiento aproximado que se busca para cada persona, para que el
    // semáforo muestre los tres colores contra el objetivo del día (~68%).
    const cumplimientoObjetivo: Record<string, number> = {
      "apoyo.centro@sgr.demo": 0.95, // verde
      "social.centro@sgr.demo": 0.8, // verde
      "planificacion.centro@sgr.demo": 0.62, // naranjo
      "territorial.rural@sgr.demo": 0.55, // naranjo
      "territorial.centro@sgr.demo": 0.3, // rojo (además tiene licencia)
      "diserco.centro@sgr.demo": 0.25, // rojo
      "social.rural@sgr.demo": 0.15, // rojo
    };

    const actividades: Prisma.ActividadCreateManyInput[] = [];
    const evidencias: Prisma.EvidenciaCreateManyInput[] = [];
    const validaciones: Prisma.ValidacionCreateManyInput[] = [];
    const correlativoPorDia = new Map<string, number>();
    const inicioMs = periodo.fechaInicio.getTime();
    const hoyMs = Date.now();
    const diasDisponibles = Math.max(1, Math.floor((hoyMs - inicioMs) / 86_400_000));

    for (const p of funcionarios) {
      const funcionarioId = userPorEmail.get(p.email)!;
      const items = itemsPorCargo.get(p.cargo!)!;
      const unidadId = unidadPorNombre.get(p.delegacion!)!;
      const area = CARGOS.find((c) => c.nombre === p.cargo)!.area;
      const prefijo = area.replace(/[^A-Za-z]/g, "").toUpperCase().slice(0, 3).padEnd(3, "X");
      const factor = cumplimientoObjetivo[p.email] ?? 0.5;

      // Por cada ítem, tantas actividades como fracción de su meta
      for (const item of items) {
        const cuantas = Math.round(item.meta * factor);
        for (let n = 0; n < cuantas; n++) {
          const diaOffset = n % diasDisponibles;
          const fecha = new Date(inicioMs + diaOffset * 86_400_000);
          const clave = `${prefijo}-${fecha.toISOString().slice(0, 10).replace(/-/g, "")}`;
          const correlativo = (correlativoPorDia.get(clave) ?? 0) + 1;
          correlativoPorDia.set(clave, correlativo);
          const codigo = `${clave}-${String(correlativo).padStart(4, "0")}`;

          const actividadId = randomUUID();
          const evidenciaId = randomUUID();
          actividades.push({
            id: actividadId,
            organizationId: org.id,
            periodoId: periodo.id,
            unidadTerritorialId: unidadId,
            funcionarioId,
            itemId: item.id,
            codigo,
            fecha,
            descripcion: `${item.nombreItem} — registro ${n + 1}`,
            accion: "Gestión realizada",
            ingresoATubo: n % 5 === 0,
          });
          evidencias.push({
            id: evidenciaId,
            organizationId: org.id,
            actividadId,
            archivoNombre: `${codigo}.jpg`,
            archivoRuta: `/evidencias/${codigo}.jpg`,
            mimeType: "image/jpeg",
            tamanoBytes: 250_000,
            subidaPorId: funcionarioId,
          });
          // Una de cada 10 queda pendiente, para demostrar que lo no validado
          // NO suma al avance (RN-009)
          const pendiente = n % 10 === 9;
          validaciones.push({
            organizationId: org.id,
            evidenciaId,
            verificadorId,
            decision: pendiente ? "pendiente" : "aprobada",
            decididaEn: pendiente ? null : new Date(),
            observacion: pendiente ? null : "Revisado y conforme",
          });
        }
      }
    }

    // Inserción por lotes para no exceder el límite de parámetros de Postgres
    const LOTE = 1000;
    for (let i = 0; i < actividades.length; i += LOTE) {
      await prisma.actividad.createMany({ data: actividades.slice(i, i + LOTE) });
    }
    for (let i = 0; i < evidencias.length; i += LOTE) {
      await prisma.evidencia.createMany({ data: evidencias.slice(i, i + LOTE) });
    }
    for (let i = 0; i < validaciones.length; i += LOTE) {
      await prisma.validacion.createMany({ data: validaciones.slice(i, i + LOTE) });
    }
    console.log(`  ${actividades.length} actividades con evidencia y validación`);
  }

  await prisma.$executeRawUnsafe("REFRESH MATERIALIZED VIEW cumplimiento_ponderado_vista");

  console.log("Seed completado — TODOS LOS DATOS SON FICTICIOS.");
  console.log("  admin        admin@sgr.demo / matriz123");
  console.log("  coordinador  coordinador@sgr.demo / matriz123");
  console.log("  verificador  verificador@sgr.demo / matriz123");
  console.log("  consulta     consulta@sgr.demo / matriz123");
  console.log("  delegado     delegado.centro@sgr.demo / matriz123");
  console.log("  funcionario  territorial.centro@sgr.demo / matriz123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
