import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { requireRol } from "../middleware/roles.js";
import { emitEvent, roomOrganizacion } from "../services/broadcast.js";
import { auditarDesde } from "../services/auditoria.js";
import { actualizarConVersion, resolverVersion } from "../services/concurrencia.js";

// Cargos e ítems de medición — RF-003 · RF-006 · HU-04 · ADR-009.
//
// "Cargo → funciones → metas" es la abstracción que el cliente describió en la
// reunión (00:59:16) y la que hace al sistema vendible a cualquier organización:
// el sistema no sabe qué es un "Territorial OO.CC."; sabe que un cargo tiene
// ítems medibles, y eso se configura sin tocar código (RNF-015).
//
// Ni cargos ni ítems se ELIMINAN: se desactivan (`activo: false`). Borrarlos
// dejaría actividades históricas apuntando al vacío y falsearía los períodos
// ya cerrados (RF-038).

export const cargosRouter = Router();
export const itemsRouter = Router();
cargosRouter.use(requireAuth);
itemsRouter.use(requireAuth);

const versionSchema = z.object({ version: z.number().int().positive() });

const cargoSchema = z.object({
  nombre: z.string().min(1).max(120),
  area: z.string().max(60).nullable().optional(),
  activo: z.boolean().optional(),
});

const itemSchema = z.object({
  cargoId: z.string().uuid(),
  nombre: z.string().min(1).max(200),
  tipo: z.enum(["cantidad", "porcentaje"]).optional(),
  direccion: z.enum(["mayor_mejor", "menor_mejor"]).optional(),
  alimentadoPorTubo: z.boolean().optional(),
  orden: z.number().int().min(0).optional(),
  activo: z.boolean().optional(),
});

// ---------------------------------------------------------------- CARGOS ---

// GET /cargos[?incluirInactivos=1] — lectura para todos los roles: el
// funcionario necesita ver qué ítems se le miden (RF-008).
cargosRouter.get("/", async (req, res) => {
  const incluirInactivos = req.query.incluirInactivos === "1";
  const cargos = await prisma.cargo.findMany({
    where: { organizationId: req.auth!.organizationId, ...(incluirInactivos ? {} : { activo: true }) },
    include: {
      items: {
        where: incluirInactivos ? {} : { activo: true },
        orderBy: { orden: "asc" },
      },
      _count: { select: { miembros: true } },
    },
    orderBy: { nombre: "asc" },
  });
  res.json(cargos);
});

cargosRouter.post("/", requireRol("admin", "supervisor"), async (req, res) => {
  const parsed = cargoSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Datos inválidos", detalle: parsed.error.issues });
  const auth = req.auth!;

  const duplicado = await prisma.cargo.findFirst({
    where: { organizationId: auth.organizationId, nombre: parsed.data.nombre },
    select: { id: true },
  });
  if (duplicado) return res.status(422).json({ error: "Ya existe un cargo con ese nombre" });

  const cargo = await prisma.cargo.create({
    data: {
      organizationId: auth.organizationId,
      nombre: parsed.data.nombre,
      area: parsed.data.area ?? null,
      activo: parsed.data.activo ?? true,
    },
    include: { items: true },
  });

  await auditarDesde(auth, req)({ accion: "crear", entidad: "cargo", entidadId: cargo.id, valorNuevo: cargo });
  emitEvent(roomOrganizacion(auth.organizationId), "cargo:creado", cargo);
  res.status(201).json(cargo);
});

cargosRouter.patch("/:id", requireRol("admin", "supervisor"), async (req, res) => {
  const parsed = cargoSchema.partial().extend(versionSchema.shape).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Datos inválidos", detalle: parsed.error.issues });
  const auth = req.auth!;
  const id = String(req.params.id);

  const anterior = await prisma.cargo.findFirst({ where: { id, organizationId: auth.organizationId } });
  if (!anterior) return res.status(404).json({ error: "No encontrado" });
  if (parsed.data.nombre && parsed.data.nombre !== anterior.nombre) {
    const duplicado = await prisma.cargo.findFirst({
      where: { organizationId: auth.organizationId, nombre: parsed.data.nombre },
      select: { id: true },
    });
    if (duplicado) return res.status(422).json({ error: "Ya existe un cargo con ese nombre" });
  }

  const { version, ...cambios } = parsed.data;
  const resultado = await actualizarConVersion({
    actualizar: async () =>
      (
        await prisma.cargo.updateMany({
          where: { id, organizationId: auth.organizationId, version },
          data: { ...cambios, version: { increment: 1 } },
        })
      ).count,
    releer: () =>
      prisma.cargo.findFirst({ where: { id, organizationId: auth.organizationId }, include: { items: true } }),
  });
  const cargo = resolverVersion(res, resultado, "el cargo");
  if (!cargo) return;

  await auditarDesde(auth, req)({
    accion: "actualizar",
    entidad: "cargo",
    entidadId: cargo.id,
    valorAnterior: anterior,
    valorNuevo: cargo,
  });
  emitEvent(roomOrganizacion(auth.organizationId), "cargo:actualizado", cargo);
  res.json(cargo);
});

// ----------------------------------------------------------------- ÍTEMS ---

// GET /items[?cargo=<id>][&incluirInactivos=1]
itemsRouter.get("/", async (req, res) => {
  const cargoId = typeof req.query.cargo === "string" ? req.query.cargo : undefined;
  const incluirInactivos = req.query.incluirInactivos === "1";
  const items = await prisma.itemMedicion.findMany({
    where: {
      organizationId: req.auth!.organizationId,
      ...(cargoId ? { cargoId } : {}),
      ...(incluirInactivos ? {} : { activo: true }),
    },
    include: { cargo: { select: { id: true, nombre: true, area: true } } },
    orderBy: [{ cargo: { nombre: "asc" } }, { orden: "asc" }],
  });
  res.json(items);
});

itemsRouter.post("/", requireRol("admin", "supervisor"), async (req, res) => {
  const parsed = itemSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Datos inválidos", detalle: parsed.error.issues });
  const auth = req.auth!;

  // El cargo debe existir DENTRO del tenant (multi-tenant: 404, no 403).
  const cargo = await prisma.cargo.findFirst({
    where: { id: parsed.data.cargoId, organizationId: auth.organizationId },
    select: { id: true },
  });
  if (!cargo) return res.status(404).json({ error: "Cargo no encontrado" });

  const duplicado = await prisma.itemMedicion.findFirst({
    where: { organizationId: auth.organizationId, cargoId: cargo.id, nombre: parsed.data.nombre },
    select: { id: true },
  });
  if (duplicado) return res.status(422).json({ error: "El cargo ya tiene un ítem con ese nombre" });

  const item = await prisma.itemMedicion.create({
    data: { ...parsed.data, organizationId: auth.organizationId },
    include: { cargo: { select: { id: true, nombre: true, area: true } } },
  });

  await auditarDesde(auth, req)({ accion: "crear", entidad: "item_medicion", entidadId: item.id, valorNuevo: item });
  emitEvent(roomOrganizacion(auth.organizationId), "item:creado", item);
  res.status(201).json(item);
});

// PATCH /items/:id — `cargoId` no se puede mover: cambiar un ítem de cargo
// reasignaría metas y actividades ya registradas a otra función.
itemsRouter.patch("/:id", requireRol("admin", "supervisor"), async (req, res) => {
  const parsed = itemSchema.omit({ cargoId: true }).partial().extend(versionSchema.shape).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Datos inválidos", detalle: parsed.error.issues });
  const auth = req.auth!;
  const id = String(req.params.id);

  const anterior = await prisma.itemMedicion.findFirst({ where: { id, organizationId: auth.organizationId } });
  if (!anterior) return res.status(404).json({ error: "No encontrado" });

  const { version, ...cambios } = parsed.data;
  const resultado = await actualizarConVersion({
    actualizar: async () =>
      (
        await prisma.itemMedicion.updateMany({
          where: { id, organizationId: auth.organizationId, version },
          data: { ...cambios, version: { increment: 1 } },
        })
      ).count,
    releer: () =>
      prisma.itemMedicion.findFirst({
        where: { id, organizationId: auth.organizationId },
        include: { cargo: { select: { id: true, nombre: true, area: true } } },
      }),
  });
  const item = resolverVersion(res, resultado, "el ítem");
  if (!item) return;

  await auditarDesde(auth, req)({
    accion: "actualizar",
    entidad: "item_medicion",
    entidadId: item.id,
    valorAnterior: anterior,
    valorNuevo: item,
  });
  emitEvent(roomOrganizacion(auth.organizationId), "item:actualizado", item);
  res.json(item);
});
