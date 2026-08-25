// Seed de desarrollo: una municipalidad de demostración con los 4 roles,
// 3 delegaciones, 4 pilares, tareas y metas del trimestre actual.
// Credenciales demo (solo desarrollo): password "matriz123" para todos.
import { PrismaClient, Prisma } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("matriz123", 10);

  const org = await prisma.organization.upsert({
    where: { id: "00000000-0000-0000-0000-000000000001" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000001",
      nombre: "Municipalidad Demo",
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

  const usuarios = [
    { email: "admin@demo.cl", nombre: "Ana Admin", rol: "admin" },
    { email: "supervisora@demo.cl", nombre: "Sofía Supervisora", rol: "supervisor" },
    { email: "delegado.norte@demo.cl", nombre: "Diego Delegado", rol: "gerente" },
    { email: "delegada.centro@demo.cl", nombre: "Daniela Delegada", rol: "gerente" },
    { email: "funcionario1@demo.cl", nombre: "Fernando Funcionario", rol: "usuario" },
    { email: "funcionaria2@demo.cl", nombre: "Francisca Funcionaria", rol: "usuario" },
  ] as const;

  const usersPorEmail: Record<string, string> = {};
  for (const u of usuarios) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: { email: u.email, nombre: u.nombre, passwordHash },
    });
    usersPorEmail[u.email] = user.id;
    await prisma.organizationMember.upsert({
      where: { organizationId_userId: { organizationId: org.id, userId: user.id } },
      update: { rol: u.rol },
      create: { organizationId: org.id, userId: user.id, rol: u.rol },
    });
  }

  const delegaciones = [
    { nombre: "Delegación Norte", responsable: "delegado.norte@demo.cl" },
    { nombre: "Delegación Centro", responsable: "delegada.centro@demo.cl" },
    { nombre: "Delegación Sur", responsable: null },
  ];
  const unidadIds: string[] = [];
  for (const d of delegaciones) {
    const existente = await prisma.unidadTerritorial.findFirst({
      where: { organizationId: org.id, nombre: d.nombre },
    });
    const unidad =
      existente ??
      (await prisma.unidadTerritorial.create({
        data: {
          organizationId: org.id,
          nombre: d.nombre,
          responsableId: d.responsable ? usersPorEmail[d.responsable] : null,
        },
      }));
    unidadIds.push(unidad.id);
  }

  const pilares = ["Aseo y ornato", "Seguridad", "Infraestructura", "Atención al vecino"];
  const categoriaIds: string[] = [];
  for (const [i, nombre] of pilares.entries()) {
    const existente = await prisma.categoriaGestion.findFirst({
      where: { organizationId: org.id, nombre },
    });
    const cat =
      existente ??
      (await prisma.categoriaGestion.create({
        data: { organizationId: org.id, nombre, ordenPrioridad: i },
      }));
    categoriaIds.push(cat.id);
  }

  const hayTareas = await prisma.tarea.count({ where: { organizationId: org.id } });
  if (hayTareas === 0) {
    const estados = ["pendiente", "en_proceso", "realizado"];
    const titulos = [
      "Reparar luminaria calle principal",
      "Retiro de escombros plaza",
      "Fiscalizar comercio ambulante",
      "Poda de árboles sector oriente",
      "Responder reclamos de la semana",
      "Pintar demarcación paso peatonal",
    ];
    for (const [ui, unidadId] of unidadIds.entries()) {
      for (const [ti, titulo] of titulos.entries()) {
        await prisma.tarea.create({
          data: {
            organizationId: org.id,
            unidadTerritorialId: unidadId,
            categoriaId: categoriaIds[(ti + ui) % categoriaIds.length]!,
            titulo: `${titulo} (${delegaciones[ui]!.nombre.replace("Delegación ", "")})`,
            estado: estados[(ti + ui) % estados.length]!,
            fechaCompromiso: new Date(Date.now() + (ti - 2) * 86_400_000),
            responsableId:
              ti % 2 === 0
                ? usersPorEmail["funcionario1@demo.cl"]!
                : usersPorEmail["funcionaria2@demo.cl"]!,
          },
        });
      }
    }
  }

  const trimestre = "2026-Q3";
  for (const unidadId of unidadIds) {
    for (const [ci, categoriaId] of categoriaIds.entries()) {
      const meta = 100;
      // Avances variados para que gauges/heatmap muestren los 3 colores.
      const avance = [95, 72, 40, 85][(ci + unidadIds.indexOf(unidadId)) % 4]!;
      await prisma.meta.upsert({
        where: {
          unidadTerritorialId_categoriaId_trimestre: {
            unidadTerritorialId: unidadId,
            categoriaId,
            trimestre,
          },
        },
        update: {},
        create: {
          organizationId: org.id,
          unidadTerritorialId: unidadId,
          categoriaId,
          trimestre,
          metaTrimestre: new Prisma.Decimal(meta),
          avance: new Prisma.Decimal(avance),
          ponderador: new Prisma.Decimal(0.25), // 4 pilares × 0.25 = 1
        },
      });
    }
  }

  await prisma.$executeRawUnsafe("REFRESH MATERIALIZED VIEW cumplimiento_ponderado_vista");
  console.log("Seed completado. Login demo: admin@demo.cl / matriz123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
