// Seed de desarrollo con los datos REALES levantados en la reunión de
// requerimientos (docs/anotaciones-clase.md §3.1): las 6 delegaciones de
// La Serena, los 4 pilares de la encuesta + patrimonio, y los cargos del
// organigrama que tienen pestaña personal.
// Credenciales demo (solo desarrollo): password "matriz123" para todos.
import { PrismaClient, Prisma } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

const ORG_ID = "00000000-0000-0000-0000-000000000001";
const TRIMESTRE = "2026-Q3";

// Las 6 delegaciones reales (reunión 00:00:19)
const DELEGACIONES = [
  "Centro",
  "Rural",
  "La Antena",
  "La Pampa",
  "Avenida del Mar",
  "Las Compañías",
];

// Los 4 pilares de la encuesta + Patrimonio (que Centro y Rural agregaron).
// El orden de prioridad varía por delegación; eso se modelará cuando se
// confirme si las categorías son por delegación (pregunta abierta §8.4).
const PILARES = [
  "Seguridad",
  "DISERCO",
  "Social (DIDECO)",
  "Organizaciones Comunitarias",
  "Patrimonio",
];

// Cargos con pestaña personal (reunión 00:51:49)
const EQUIPO = [
  { email: "javier.godoy@demo.cl", nombre: "Javier Godoy", rol: "admin", cargo: "Coordinador de Delegaciones", delegacion: null },
  { email: "jf.labra@demo.cl", nombre: "Juan Francisco Labra", rol: "supervisor", cargo: "Coordinador / Control de Gestión", delegacion: null },
  { email: "delegado.centro@demo.cl", nombre: "Daniela Rojas", rol: "gerente", cargo: "Delegada", delegacion: "Centro" },
  { email: "delegado.avmar@demo.cl", nombre: "Marco Pizarro", rol: "gerente", cargo: "Delegado", delegacion: "Avenida del Mar" },
  { email: "admin.centro@demo.cl", nombre: "Paula Cortés", rol: "usuario", cargo: "Apoyo Administrativo", delegacion: "Centro" },
  { email: "diserco.centro@demo.cl", nombre: "Rodrigo Núñez", rol: "usuario", cargo: "Coordinador DISERCO", delegacion: "Centro" },
  { email: "territorial1.centro@demo.cl", nombre: "Gloria Araya", rol: "usuario", cargo: "Territorial 1", delegacion: "Centro" },
  { email: "social1.centro@demo.cl", nombre: "Génesis Vega", rol: "usuario", cargo: "Gestión Social 1", delegacion: "Centro" },
  { email: "territorial1.avmar@demo.cl", nombre: "Ignacio Tapia", rol: "usuario", cargo: "Territorial 1", delegacion: "Avenida del Mar" },
  { email: "social1.avmar@demo.cl", nombre: "Camila Riquelme", rol: "usuario", cargo: "Gestión Social 1", delegacion: "Avenida del Mar" },
];

// Solicitudes de ejemplo tomadas del lenguaje real de la reunión
const TAREAS_EJEMPLO = [
  { titulo: "Camino cortado por lluvia, sector Las Rojas", pilar: "DISERCO", estado: "en_proceso", dias: 3 },
  { titulo: "Solicitud de máquina para despeje de camino", pilar: "DISERCO", estado: "pendiente", dias: -2 },
  { titulo: "Taller de reciclaje con junta de vecinos", pilar: "Organizaciones Comunitarias", estado: "realizado", dias: -8 },
  { titulo: "Operativo de limpieza en plaza Los Torreones", pilar: "DISERCO", estado: "realizado", dias: -5 },
  { titulo: "Entrega de caja de útiles escolares", pilar: "Social (DIDECO)", estado: "pendiente", dias: 5 },
  { titulo: "Certificado para postulación universitaria", pilar: "Social (DIDECO)", estado: "en_proceso", dias: 1 },
  { titulo: "Ronda preventiva con inspectores municipales", pilar: "Seguridad", estado: "pendiente", dias: -1 },
  { titulo: "Conformación de directiva junta de vecinos", pilar: "Organizaciones Comunitarias", estado: "en_proceso", dias: 7 },
  { titulo: "Poda de árboles en avenida principal", pilar: "DISERCO", estado: "pendiente", dias: 4 },
  { titulo: "Visita técnica a todas las plazas del territorio", pilar: "DISERCO", estado: "realizado", dias: -10 },
];

async function main() {
  const passwordHash = await bcrypt.hash("matriz123", 10);

  const org = await prisma.organization.upsert({
    where: { id: ORG_ID },
    update: { nombre: "Municipalidad de La Serena (demo)" },
    create: {
      id: ORG_ID,
      nombre: "Municipalidad de La Serena (demo)",
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

  // Delegaciones
  const unidadPorNombre = new Map<string, string>();
  for (const nombre of DELEGACIONES) {
    const existente = await prisma.unidadTerritorial.findFirst({
      where: { organizationId: org.id, nombre },
    });
    const unidad =
      existente ??
      (await prisma.unidadTerritorial.create({
        data: { organizationId: org.id, nombre },
      }));
    unidadPorNombre.set(nombre, unidad.id);
  }

  // Pilares
  const categoriaPorNombre = new Map<string, string>();
  for (const [i, nombre] of PILARES.entries()) {
    const existente = await prisma.categoriaGestion.findFirst({
      where: { organizationId: org.id, nombre },
    });
    const cat =
      existente ??
      (await prisma.categoriaGestion.create({
        data: { organizationId: org.id, nombre, ordenPrioridad: i },
      }));
    categoriaPorNombre.set(nombre, cat.id);
  }

  // Equipo: usuarios + membresía con delegación y cargo
  const userPorEmail = new Map<string, string>();
  for (const p of EQUIPO) {
    const user = await prisma.user.upsert({
      where: { email: p.email },
      update: { nombre: p.nombre },
      create: { email: p.email, nombre: p.nombre, passwordHash },
    });
    userPorEmail.set(p.email, user.id);
    const unidadId = p.delegacion ? unidadPorNombre.get(p.delegacion)! : null;
    await prisma.organizationMember.upsert({
      where: { organizationId_userId: { organizationId: org.id, userId: user.id } },
      update: { rol: p.rol, unidadTerritorialId: unidadId, cargo: p.cargo },
      create: {
        organizationId: org.id,
        userId: user.id,
        rol: p.rol,
        unidadTerritorialId: unidadId,
        cargo: p.cargo,
      },
    });
    // Los delegados son responsables de su delegación
    if (p.rol === "gerente" && unidadId) {
      await prisma.unidadTerritorial.update({
        where: { id: unidadId },
        data: { responsableId: user.id },
      });
    }
  }

  // Tubo de trabajo: tareas en las dos delegaciones con equipo cargado
  if ((await prisma.tarea.count({ where: { organizationId: org.id } })) === 0) {
    const conEquipo: { delegacion: string; responsables: string[] }[] = [
      {
        delegacion: "Centro",
        responsables: [
          "territorial1.centro@demo.cl",
          "social1.centro@demo.cl",
          "diserco.centro@demo.cl",
          "admin.centro@demo.cl",
        ],
      },
      {
        delegacion: "Avenida del Mar",
        responsables: ["territorial1.avmar@demo.cl", "social1.avmar@demo.cl"],
      },
    ];
    for (const { delegacion, responsables } of conEquipo) {
      for (const [i, t] of TAREAS_EJEMPLO.entries()) {
        await prisma.tarea.create({
          data: {
            organizationId: org.id,
            unidadTerritorialId: unidadPorNombre.get(delegacion)!,
            categoriaId: categoriaPorNombre.get(t.pilar)!,
            titulo: t.titulo,
            estado: t.estado,
            fechaCompromiso: new Date(Date.now() + t.dias * 86_400_000),
            responsableId: userPorEmail.get(responsables[i % responsables.length]!)!,
          },
        });
      }
    }
  }

  // Metas del trimestre: 4 pilares ponderados 0.25 en cada delegación.
  // Avances variados para que el semáforo muestre los tres colores contra el
  // objetivo al día.
  const avancesPorDelegacion: Record<string, number[]> = {
    Centro: [95, 88, 92, 85],
    Rural: [70, 65, 72, 60],
    "La Antena": [55, 40, 48, 35],
    "La Pampa": [30, 25, 35, 20],
    "Avenida del Mar": [110, 95, 105, 90],
    "Las Compañías": [45, 38, 50, 42],
  };
  const pilaresMedidos = PILARES.slice(0, 4); // Patrimonio aún sin metas
  for (const delegacion of DELEGACIONES) {
    const avances = avancesPorDelegacion[delegacion]!;
    for (const [i, pilar] of pilaresMedidos.entries()) {
      await prisma.meta.upsert({
        where: {
          unidadTerritorialId_categoriaId_trimestre: {
            unidadTerritorialId: unidadPorNombre.get(delegacion)!,
            categoriaId: categoriaPorNombre.get(pilar)!,
            trimestre: TRIMESTRE,
          },
        },
        update: { avance: new Prisma.Decimal(avances[i]!) },
        create: {
          organizationId: org.id,
          unidadTerritorialId: unidadPorNombre.get(delegacion)!,
          categoriaId: categoriaPorNombre.get(pilar)!,
          trimestre: TRIMESTRE,
          metaTrimestre: new Prisma.Decimal(100),
          avance: new Prisma.Decimal(avances[i]!),
          ponderador: new Prisma.Decimal(0.25),
        },
      });
    }
  }

  await prisma.$executeRawUnsafe("REFRESH MATERIALIZED VIEW cumplimiento_ponderado_vista");
  console.log("Seed completado.");
  console.log("  admin      javier.godoy@demo.cl / matriz123");
  console.log("  supervisor jf.labra@demo.cl / matriz123");
  console.log("  delegada   delegado.centro@demo.cl / matriz123");
  console.log("  funcionaria territorial1.centro@demo.cl / matriz123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
