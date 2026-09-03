import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth, type AuthPayload } from "../middleware/auth.js";
import { requireRol } from "../middleware/roles.js";
import { emitEvent, roomUnidad } from "../services/broadcast.js";
import { unidadesVisibles } from "../services/alcance.js";
import { auditarDesde } from "../services/auditoria.js";
import { actualizarConVersion, resolverVersion } from "../services/concurrencia.js";

// Agenda colectiva, "el tubo" — EP-04 · RF-016 a RF-021 · CA-08 · CA-09.
//
// Ruta heredada de la Fase 2, endurecida en el Bloque A3. El tubo es la
// pantalla más concurrida del sistema —varias personas arrastrando tarjetas en
// el mismo libro, en vivo— y era justo la que sobrescribía en silencio: el
// PATCH del drag & drop no comparaba versión, así que dos movimientos
// simultáneos dejaban ganar al último sin que nadie se enterara (CA-08).

export const tareasRouter = Router();
tareasRouter.use(requireAuth);

const versionSchema = z.object({ version: z.number().int().positive() });

const tareaSchema = z.object({
  titulo: z.string().min(1).max(200),
  descripcion: z.string().max(2000).nullable().optional(),
  unidadTerritorialId: z.string().uuid(),
  categoriaId: z.string().uuid(),
  estado: z.string().min(1).max(50).optional(),
  fechaCompromiso: z.coerce.date().nullable().optional(),
  responsableId: z.string().uuid().nullable().optional(),
});

// Alcance de edición según matriz de permisos (Documento Maestro §4):
// admin/supervisor → toda la organización; gerente → solo su delegación
// (unidad de la que es responsable); usuario → solo sus propias tareas.
async function puedeEditar(
  auth: AuthPayload,
  tarea: { responsableId: string | null; unidadTerritorialId: string }
): Promise<boolean> {
  if (auth.rol === "admin" || auth.rol === "supervisor") return true;
  if (auth.rol === "gerente") {
    const unidad = await prisma.unidadTerritorial.findFirst({
      where: { id: tarea.unidadTerritorialId, responsableId: auth.userId },
      select: { id: true },
    });
    return unidad !== null;
  }
  return tarea.responsableId === auth.userId; // rol usuario
}

// GET /tareas?unidad=<id> — también es el mecanismo de RECUPERACIÓN tras
// reconexión de Socket.io (HU-3.4): el cliente recarga el estado completo.
// El libro es privado por delegación: un gerente/funcionario solo ve el tubo
// de la suya (ver services/alcance.ts).
tareasRouter.get("/", async (req, res) => {
  const unidadId = typeof req.query.unidad === "string" ? req.query.unidad : undefined;
  const visibles = await unidadesVisibles(req.auth!);
  if (unidadId && visibles !== null && !visibles.includes(unidadId)) {
    return res.status(404).json({ error: "No encontrado" });
  }
  const tareas = await prisma.tarea.findMany({
    where: {
      organizationId: req.auth!.organizationId,
      ...(unidadId
        ? { unidadTerritorialId: unidadId }
        : visibles !== null
          ? { unidadTerritorialId: { in: visibles } }
          : {}),
    },
    include: {
      responsable: { select: { id: true, nombre: true } },
      categoria: { select: { id: true, nombre: true } },
    },
    orderBy: [{ estado: "asc" }, { fechaCompromiso: "asc" }],
  });
  res.json(tareas);
});

tareasRouter.post("/", requireRol("admin", "supervisor", "gerente"), async (req, res) => {
  const parsed = tareaSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Datos inválidos" });
  const auth = req.auth!;

  // La unidad y la categoría deben existir DENTRO del tenant del token.
  const [unidad, categoria] = await Promise.all([
    prisma.unidadTerritorial.findFirst({
      where: { id: parsed.data.unidadTerritorialId, organizationId: auth.organizationId },
    }),
    prisma.categoriaGestion.findFirst({
      where: { id: parsed.data.categoriaId, organizationId: auth.organizationId },
      select: { id: true },
    }),
  ]);
  if (!unidad || !categoria) return res.status(404).json({ error: "Unidad o categoría no encontrada" });
  if (auth.rol === "gerente" && unidad.responsableId !== auth.userId) {
    return res.status(403).json({ error: "Solo puede crear tareas en su delegación" });
  }

  const tarea = await prisma.tarea.create({
    data: { ...parsed.data, organizationId: auth.organizationId },
    include: {
      responsable: { select: { id: true, nombre: true } },
      categoria: { select: { id: true, nombre: true } },
    },
  });
  await auditarDesde(auth, req)({
    accion: "crear",
    entidad: "tarea",
    entidadId: tarea.id,
    valorNuevo: tarea,
  });
  emitEvent(roomUnidad(tarea.unidadTerritorialId), "tarea:creada", tarea);
  res.status(201).json(tarea);
});

// PATCH /tareas/:id — lo dispara el drag & drop del kanban (HU-3.1).
// Exige `version`: mover una tarjeta es un write como cualquier otro y dos
// personas pueden estar mirando el mismo libro (CA-08).
tareasRouter.patch("/:id", async (req, res) => {
  const parsed = tareaSchema.partial().extend(versionSchema.shape).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Datos inválidos", detalle: parsed.error.issues });
  const auth = req.auth!;

  const existente = await prisma.tarea.findFirst({
    where: { id: req.params.id, organizationId: auth.organizationId },
  });
  if (!existente) return res.status(404).json({ error: "No encontrado" });
  if (!(await puedeEditar(auth, existente))) {
    return res.status(403).json({ error: "Sin permisos sobre esta tarea" });
  }
  // Mover una tarea de unidad exige permisos también en la unidad destino.
  if (
    parsed.data.unidadTerritorialId &&
    parsed.data.unidadTerritorialId !== existente.unidadTerritorialId
  ) {
    const destinoOk = await puedeEditar(auth, {
      responsableId: existente.responsableId,
      unidadTerritorialId: parsed.data.unidadTerritorialId,
    });
    if (!destinoOk) return res.status(403).json({ error: "Sin permisos en la unidad destino" });
  }

  const { version, ...cambios } = parsed.data;
  const resultado = await actualizarConVersion({
    actualizar: async () =>
      (
        await prisma.tarea.updateMany({
          where: { id: existente.id, organizationId: auth.organizationId, version },
          data: { ...cambios, version: { increment: 1 } },
        })
      ).count,
    releer: () =>
      prisma.tarea.findFirst({
        where: { id: existente.id, organizationId: auth.organizationId },
        include: {
          responsable: { select: { id: true, nombre: true } },
          categoria: { select: { id: true, nombre: true } },
        },
      }),
  });
  const tarea = resolverVersion(res, resultado, "esta tarea");
  if (!tarea) return;

  await auditarDesde(auth, req)({
    // Mover una tarjeta es un cambio de estado, no una edición cualquiera:
    // la bitácora lo distingue para poder reconstruir el recorrido del tubo.
    accion: cambios.estado && cambios.estado !== existente.estado ? "cambiar_estado" : "actualizar",
    entidad: "tarea",
    entidadId: tarea.id,
    valorAnterior: existente,
    valorNuevo: tarea,
  });
  emitEvent(roomUnidad(tarea.unidadTerritorialId), "tarea:actualizada", tarea);
  if (tarea.unidadTerritorialId !== existente.unidadTerritorialId) {
    // La unidad de origen también debe enterarse de que la tarea se fue.
    emitEvent(roomUnidad(existente.unidadTerritorialId), "tarea:eliminada", { id: tarea.id });
  }
  res.json(tarea);
});

tareasRouter.delete("/:id", async (req, res) => {
  const auth = req.auth!;
  const existente = await prisma.tarea.findFirst({
    where: { id: req.params.id, organizationId: auth.organizationId },
  });
  if (!existente) return res.status(404).json({ error: "No encontrado" });
  if (auth.rol === "usuario" || !(await puedeEditar(auth, existente))) {
    return res.status(403).json({ error: "Sin permisos sobre esta tarea" });
  }

  await prisma.tarea.delete({ where: { id: existente.id } });

  // Se audita DESPUÉS de borrar y con el registro completo: la bitácora es lo
  // único que queda de la tarea (RNF-008, ADR-006).
  await auditarDesde(auth, req)({
    accion: "eliminar",
    entidad: "tarea",
    entidadId: existente.id,
    valorAnterior: existente,
  });
  emitEvent(roomUnidad(existente.unidadTerritorialId), "tarea:eliminada", { id: existente.id });
  res.status(204).end();
});
