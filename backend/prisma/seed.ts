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
import { guardarArchivo, rutaRelativa } from "../src/services/almacenamiento.js";
import { imagenEvidencia } from "./imagen-demo.js";

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
  // --- Delegaciones incorporadas en el Bloque C ------------------------------
  // El tablero consolidado mide PERSONAS: con solo Centro y Rural configurados,
  // cuatro de las seis delegaciones salían sin medición. Se pueblan tres y se
  // deja "La Pampa" a propósito sin nadie con meta, para que el dashboard
  // demuestre ese estado — que además es la señal que pide RF-030: quién no
  // está registrando trabajo.
  { email: "delegado.antena@sgr.demo", nombres: "Rocío", paterno: "Vergara", materno: "Cortez", rut: "21345678-4", rol: "gerente", cargo: null, delegacion: "La Antena" },
  { email: "territorial.antena@sgr.demo", nombres: "Matías", paterno: "Cepeda", materno: "Aravena", rut: "22456789-8", rol: "usuario", cargo: "Territorial OO.CC. 1", delegacion: "La Antena" },
  { email: "apoyo.antena@sgr.demo", nombres: "Ninoska", paterno: "Ibarra", materno: "Ossandón", rut: "17888444-1", rol: "usuario", cargo: "Apoyo Administrativo", delegacion: "La Antena" },
  { email: "delegado.avmar@sgr.demo", nombres: "Sebastián", paterno: "Pizarro", materno: "Alfaro", rut: "18999555-5", rol: "gerente", cargo: null, delegacion: "Avenida del Mar" },
  { email: "social.avmar@sgr.demo", nombres: "Fernanda", paterno: "Zepeda", materno: "Carvajal", rut: "19777333-2", rol: "usuario", cargo: "Gestor Social 1", delegacion: "Avenida del Mar" },
  { email: "planificacion.avmar@sgr.demo", nombres: "Álvaro", paterno: "Riquelme", materno: "Donoso", rut: "20888111-6", rol: "usuario", cargo: "Planificación y Control", delegacion: "Avenida del Mar" },
  { email: "delegado.companias@sgr.demo", nombres: "Constanza", paterno: "Barraza", materno: "Pastén", rut: "16777888-7", rol: "gerente", cargo: null, delegacion: "Las Compañías" },
  { email: "territorial.companias@sgr.demo", nombres: "Hernán", paterno: "Olivares", materno: "Trigo", rut: "15888999-4", rol: "usuario", cargo: "Territorial OO.CC. 1", delegacion: "Las Compañías" },
  { email: "diserco.companias@sgr.demo", nombres: "Yasna", paterno: "Peralta", materno: "Salgado", rut: "14999111-5", rol: "usuario", cargo: "Coordinador DISERCO", delegacion: "Las Compañías" },
  // El caso que RF-030 pide demostrar: alguien con cargo y metas configuradas
  // que NO ha registrado nada en el período. Sin una persona así, el panel de
  // actividad no puede mostrar su señal más importante —"quién no ha
  // ingresado"— y quedaría verificado solo el camino feliz. Su factor de
  // cumplimiento es 0 y por eso el generador no le crea ninguna actividad.
  { email: "apoyo.companias@sgr.demo", nombres: "Ignacia", paterno: "Fuenzalida", materno: "Cerda", rut: "13444555-6", rol: "usuario", cargo: "Apoyo Administrativo", delegacion: "Las Compañías" },
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

  // --- Miembros que ya no están en el seed (Bloque C) ------------------------
  // Esta organización es de DEMOSTRACIÓN y este archivo es su definición: quien
  // no esté en EQUIPO sobra. No es una precaución teórica — las cuentas
  // `@demo.cl` de las Fases 2 y 3 seguían vivas en la base meses después de que
  // la documentación las diera por borradas (el seed las creaba con upsert, así
  // que dejar de nombrarlas nunca las quitó), y una comprobación del smoke
  // pasaba gracias a un cargo que solo existía en ellas.
  // Va DESPUÉS de la limpieza transaccional: para entonces ya no quedan
  // actividades, evidencias ni tareas colgando de esas personas.
  {
    const emailsDelSeed = new Set<string>(EQUIPO.map((e) => e.email));
    const sobrantes = (
      await prisma.organizationMember.findMany({
        where: { organizationId: org.id },
        select: { id: true, userId: true, user: { select: { email: true } } },
      })
    ).filter((m) => !emailsDelSeed.has(m.user.email));

    if (sobrantes.length > 0) {
      const ids = sobrantes.map((m) => m.userId);
      await prisma.metaItem.deleteMany({ where: { organizationId: org.id, funcionarioId: { in: ids } } });
      await prisma.ausencia.deleteMany({ where: { organizationId: org.id, funcionarioId: { in: ids } } });
      await prisma.ajuste.deleteMany({
        where: {
          organizationId: org.id,
          OR: [{ funcionarioId: { in: ids } }, { registradoPorId: { in: ids } }],
        },
      });
      await prisma.comentario.deleteMany({ where: { organizationId: org.id, autorId: { in: ids } } });
      await prisma.unidadTerritorial.updateMany({
        where: { organizationId: org.id, responsableId: { in: ids } },
        data: { responsableId: null },
      });
      await prisma.organizationMember.deleteMany({ where: { id: { in: sobrantes.map((m) => m.id) } } });
      // La persona solo se borra si no quedó en ninguna otra organización: en
      // multi-tenant, borrarla igual sería sacarla de un tenant ajeno.
      const huerfanos = await prisma.user.findMany({
        where: { id: { in: ids }, memberships: { none: {} } },
        select: { id: true },
      });
      await prisma.user.deleteMany({ where: { id: { in: huerfanos.map((u) => u.id) } } });
      console.log(
        `Limpieza: ${sobrantes.length} miembros fuera del seed, ${huerfanos.length} usuarios eliminados`
      );
    }
  }

  // --- Tubo de trabajo ---
  {
    const ejemplos = [
      { titulo: "Camino cortado por lluvia en sector rural", pilar: "DISERCO", estado: "en_proceso", dias: 3, ext: true, territorio: "Zona Rural", apoyo: "DISERCO", pide: "vecino" },
      { titulo: "Solicitud de máquina para despeje de camino", pilar: "DISERCO", estado: "pendiente", dias: -2, ext: true, territorio: "Zona Rural", apoyo: "DISERCO", pide: "vecino" },
      { titulo: "Taller de reciclaje con junta de vecinos", pilar: "Organizaciones Comunitarias", estado: "realizado", dias: -8, ext: false, territorio: "Sector Norte", apoyo: null, pide: null },
      { titulo: "Operativo de limpieza en plaza principal", pilar: "DISERCO", estado: "realizado", dias: -5, ext: false, territorio: "Sector Sur", apoyo: "Sección Aseo", pide: null },
      // Este es el que demuestra que `solicitante` es texto libre: lo pide una
      // ORGANIZACIÓN, que no tiene RUT ni ficha. Está en un estado que el
      // tablero muestra a propósito — un caso que solo existe en una columna
      // que todavía no se pinta (RF-018, "Ingresado") no demuestra nada.
      { titulo: "Entrega de caja de útiles escolares", pilar: "Social (DIDECO)", estado: "pendiente", dias: 5, ext: true, territorio: "Sector Poniente", apoyo: null, pide: "organizacion" },
      { titulo: "Solicitud de iluminación en pasaje", pilar: "Seguridad", estado: "ingresado", dias: 7, ext: true, territorio: "Sector Oriente", apoyo: "Alumbrado Público", pide: "vecino" },
      { titulo: "Ronda preventiva con inspectores municipales", pilar: "Seguridad", estado: "pendiente", dias: -1, ext: false, territorio: "Sector Norte", apoyo: "Seguridad Ciudadana", pide: null },
      { titulo: "Conformación de directiva junta de vecinos", pilar: "Organizaciones Comunitarias", estado: "en_proceso", dias: 7, ext: false, territorio: "Sector Sur", apoyo: null, pide: null },
    ];
    const responsables = ["territorial.centro@sgr.demo", "social.centro@sgr.demo", "diserco.centro@sgr.demo", "apoyo.centro@sgr.demo"];
    const rutsVecinos = [...vecinoPorRut.values()];

    // RF-017: quién pidió cada compromiso externo. Uno de cada tres es una
    // ORGANIZACIÓN y no una persona — sin RUT ni ficha— porque es el caso que
    // justifica que `solicitante` sea texto libre y que el vínculo con el
    // vecino sea opcional: la planilla real del cliente no tiene columna RUT
    // en el tubo (estructura-planilla-real §6).
    const ORGANIZACIONES = [
      "Junta de vecinos Villa El Faro",
      "Comité de agua potable rural",
      "Club deportivo Los Aromos",
    ];
    const nombrePorVecinoId = new Map<string, string>();
    for (const v of VECINOS) {
      const rut = normalizarRut(v.rut);
      const id = rut ? vecinoPorRut.get(rut) : undefined;
      if (id) nombrePorVecinoId.set(id, `${v.nombres} ${v.paterno} ${v.materno}`);
    }

    /** Quién pidió el compromiso y si tiene ficha detrás. Determinista. */
    const solicitudDeEjemplo = (i: number, pide: string | null) => {
      if (pide === "organizacion") {
        return { solicitante: ORGANIZACIONES[i % ORGANIZACIONES.length]!, personaUsuariaId: null };
      }
      if (pide === "vecino") {
        const vecinoId = rutsVecinos[i % rutsVecinos.length]!;
        return { solicitante: nombrePorVecinoId.get(vecinoId) ?? "Vecino del sector", personaUsuariaId: vecinoId };
      }
      return { solicitante: null, personaUsuariaId: null };
    };

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
            ...solicitudDeEjemplo(i, t.pide),
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
      // Bloque C: el tablero necesita más de una delegación con medición y los
      // tres colores repartidos entre ellas, no todos concentrados en Centro.
      "planificacion.avmar@sgr.demo": 0.85, // verde
      // La Antena es la delegación que el tablero muestra AL DÍA: para que una
      // delegación salga verde no basta con una persona buena, porque la
      // delegación es el promedio de su gente (ADR-014). Las dos van altas.
      "territorial.antena@sgr.demo": 0.95, // verde
      "diserco.companias@sgr.demo": 0.6, // naranjo
      "apoyo.antena@sgr.demo": 0.8, // verde
      "social.avmar@sgr.demo": 0.45, // naranjo
      "territorial.companias@sgr.demo": 0.3, // rojo
      // Cero a propósito: es el "sin registro" del panel de actividad (RF-030).
      "apoyo.companias@sgr.demo": 0,
    };

    // Vecinos en el registro diario (ADR-008). El reparto es DETERMINISTA a
    // propósito: como Centro y Rural tienen el mismo cargo "Territorial
    // OO.CC. 1" —y por lo tanto los mismos ítems y el mismo recorrido de `n`—,
    // la primera atención de cada ítem cae siempre en el mismo vecino y en la
    // misma fecha en las dos delegaciones. Así el caso emblemático del cliente
    // (la misma persona atendida por lo mismo en dos delegaciones) queda
    // armado en los datos de demostración, que es donde debe poder mostrarse.
    const vecinos = [...vecinoPorRut.values()];
    const datosVecino = new Map(
      VECINOS.map((v, i) => [vecinos[i]!, { nombre: `${v.nombres} ${v.paterno} ${v.materno}`, fono: v.telefono }])
    );
    /** Una de cada 12 atenciones queda a nombre de un vecino identificado. */
    const CADA_CUANTAS_UN_VECINO = 12;

    // RF-015 · CA-04: el caso social que la especificación pide DEMOSTRAR.
    // Los datos de demostración son parte del entregable: si el seed no arma
    // el caso a propósito, la pantalla queda correcta y vacía. Se reparten
    // atenciones en las tres etapas —recién abierta, a medio camino y con sus
    // tres gestiones— para que la ficha muestre el avance y no un solo estado.
    // Los valores salen de los mismos catálogos que exige la API (RF-004).
    const GESTIONES_1 = ["Atención social a usuario presencial", "Visita terreno", "Entrega informe"];
    const GESTIONES_2 = ["Visita terreno", "Entrega informe", "Entrega beneficio"];
    const GESTIONES_3 = ["Entrega beneficio", "Entrega informe"];
    const TIPOS_ATENCION = ["Informes sociales", "Gestión de subsidios", "Entrega emergencia", "Derivación"];
    const SUB_ATENCIONES = ["Informe aporte económico", "Orientación social", "SUF", "Acta de entrega"];
    const atenciones: Prisma.AtencionSocialCreateManyInput[] = [];

    const actividades: Prisma.ActividadCreateManyInput[] = [];
    const evidencias: Prisma.EvidenciaCreateManyInput[] = [];
    const validaciones: Prisma.ValidacionCreateManyInput[] = [];
    const archivos: { ruta: string; contenido: Buffer }[] = [];
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
      for (const [idx, item] of items.entries()) {
        // Desfase por ítem: sin él, la primera atención de todos los ítems cae
        // el mismo día (el primero del período) y la línea de tiempo del vecino
        // sale como un muro de una sola fecha.
        const desfase = (idx * 5) % CADA_CUANTAS_UN_VECINO;
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
          // El vecino se elige por ÍNDICE DE ÍTEM, no por funcionario: así el
          // mismo ítem le toca al mismo vecino en Centro y en Rural, que es el
          // caso que el sistema debe saber detectar (ADR-008).
          const vecinoId =
            (n + desfase) % CADA_CUANTAS_UN_VECINO === 0
              ? vecinos[(idx + Math.floor((n + desfase) / CADA_CUANTAS_UN_VECINO)) % vecinos.length]!
              : null;
          const vecino = vecinoId ? datosVecino.get(vecinoId) : undefined;
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
            personaUsuariaId: vecinoId,
            contactoNombre: vecino?.nombre ?? null,
            contactoFono: vecino?.fono ?? null,
          });
          // RF-015: el detalle social es 1:1 con la actividad y solo existe
          // cuando hay una persona identificada detrás (RN-012). El número de
          // gestiones es determinista para que la demostración sea repetible.
          if (area === "SOCIAL" && vecinoId) {
            const cuantasGestiones = ((n + idx) % 3) + 1;
            const diaVisita = new Date(fecha.getTime() + 3 * 86_400_000);
            const diaInforme = new Date(fecha.getTime() + 8 * 86_400_000);
            const diaBeneficio = new Date(fecha.getTime() + 15 * 86_400_000);
            atenciones.push({
              organizationId: org.id,
              actividadId,
              tipoAtencion: TIPOS_ATENCION[(idx + n) % TIPOS_ATENCION.length]!,
              subAtencion: SUB_ATENCIONES[(idx + n) % SUB_ATENCIONES.length]!,
              requiereVisita: cuantasGestiones >= 2,
              observacion: `Caso derivado desde ${p.delegacion}. Seguimiento en curso.`,
              primeraGestion: GESTIONES_1[n % GESTIONES_1.length]!,
              fechaProgramadaVisita: cuantasGestiones >= 2 ? diaVisita : null,
              segundaGestion: cuantasGestiones >= 2 ? GESTIONES_2[n % GESTIONES_2.length]! : null,
              fechaVisita: cuantasGestiones >= 2 ? diaVisita : null,
              fechaEntregaInforme: cuantasGestiones >= 2 ? diaInforme : null,
              terceraGestion: cuantasGestiones >= 3 ? GESTIONES_3[n % GESTIONES_3.length]! : null,
              fechaEntregaBeneficio: cuantasGestiones >= 3 ? diaBeneficio : null,
            });
          }
          // La ruta la deriva el mismo helper que usa el alta real (RNF-017):
          // si el seed inventara el formato, la ficha y la bandeja pedirían un
          // archivo que el servidor no sabe resolver y responderían 410.
          const rutaEvidencia = rutaRelativa(org.id, codigo, 1, "image/png");
          const contenido = imagenEvidencia(codigo);
          archivos.push({ ruta: rutaEvidencia, contenido });
          evidencias.push({
            id: evidenciaId,
            organizationId: org.id,
            actividadId,
            archivoNombre: `${codigo}.png`,
            archivoRuta: rutaEvidencia,
            mimeType: "image/png",
            tamanoBytes: contenido.length,
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

    // RNF-005 · CU-E3: el caso de la validación propia, armado A PROPÓSITO.
    //
    // Sin él la regla es incomprobable en la demostración: las tres cuentas
    // que validan (admin, supervisor, verificador) no tienen cargo, así que
    // ninguna de las evidencias sembradas les pertenece y el 403 nunca se
    // produce. Se arma por el lado de QUIÉN SUBE, no por el de quién registra:
    // que un supervisor cargue la evidencia de un funcionario es un flujo que
    // la API ya admite (`puedeEditarActividad` incluye al nivel central) y no
    // exige inventarle actividades a alguien que no tiene metas.
    //
    // Es la misma clase de dato deliberado que La Pampa sin medición (ADR-014)
    // y que apoyo.companias con cero actividades (ADR-015).
    {
      const coordinadorId = userPorEmail.get("coordinador@sgr.demo")!;
      // La primera que quedó pendiente: `validaciones` y `evidencias` se
      // llenan en paralelo, una por actividad, así que comparten índice.
      const i = validaciones.findIndex((v) => v.decision === "pendiente");
      if (i < 0) throw new Error("El seed no dejó ninguna evidencia pendiente: CU-E3 quedaría sin caso");
      evidencias[i]!.subidaPorId = coordinadorId;
      // Encabeza la cola por antigüedad, que es el orden por defecto de la
      // bandeja: así el escenario se abre sin filtrar ni buscar.
      evidencias[i]!.createdAt = periodo.fechaInicio;
      console.log(
        `  CU-E3: la evidencia ${evidencias[i]!.archivoNombre} la subió el coordinador ` +
          `y él no puede validarla (RNF-005)`
      );
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
    for (let i = 0; i < atenciones.length; i += LOTE) {
      await prisma.atencionSocial.createMany({ data: atenciones.slice(i, i + LOTE) });
    }
    // Los archivos van al almacén después de las filas: si algo falla arriba,
    // no quedan huérfanos en disco.
    for (const a of archivos) await guardarArchivo(a.ruta, a.contenido);
    console.log(`  ${actividades.length} actividades con evidencia y validación`);
    console.log(
      `  ${actividades.filter((a) => a.personaUsuariaId).length} de ellas a nombre de un vecino ficticio (ADR-008)`
    );
    console.log(`  ${archivos.length} imágenes sintéticas escritas en el almacén de evidencias`);
    console.log(
      `  ${atenciones.length} atenciones sociales con sus gestiones (RF-015): ` +
        `${atenciones.filter((a) => a.terceraGestion).length} completas con las 3`
    );
  }

  // Bloque C: aquí se refrescaba `cumplimiento_ponderado_vista`. La vista y su
  // tabla `metas` se eliminaron: el cumplimiento se calcula al consultarlo, por
  // funcionario, así que no hay nada que precomputar después de sembrar.

  console.log("Seed completado — TODOS LOS DATOS SON FICTICIOS.");
  console.log("  admin        admin@sgr.demo / matriz123");
  console.log("  coordinador  coordinador@sgr.demo / matriz123");
  console.log("  verificador  verificador@sgr.demo / matriz123");
  console.log("  consulta     consulta@sgr.demo / matriz123");
  console.log("  delegado     delegado.centro@sgr.demo / matriz123");
  console.log("  funcionario  territorial.centro@sgr.demo / matriz123");
  console.log("  (las 23 cuentas, con su rol y delegación, en docs/estado-proyecto.md §1)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
