import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";

export const usuariosRouter = Router();
usuariosRouter.use(requireAuth);

// Directorio de la organización: para elegir responsable en el formulario de
// tarea y mostrar cargos. Visible para todo rol autenticado (nombres y cargos
// son información interna de la organización, igual que el semáforo).
// Filtro opcional ?unidad=<id> para listar el equipo de una delegación
// (incluye siempre al nivel central, que no tiene unidad).
usuariosRouter.get("/", async (req, res) => {
  const unidadId = typeof req.query.unidad === "string" ? req.query.unidad : undefined;
  const miembros = await prisma.organizationMember.findMany({
    where: {
      organizationId: req.auth!.organizationId,
      ...(unidadId
        ? { OR: [{ unidadTerritorialId: unidadId }, { unidadTerritorialId: null }] }
        : {}),
    },
    include: {
      user: { select: { id: true, nombre: true, email: true } },
      unidad: { select: { id: true, nombre: true } },
    },
    orderBy: [{ rol: "asc" }, { cargo: "asc" }],
  });
  res.json(
    miembros.map((m) => ({
      userId: m.user.id,
      nombre: m.user.nombre,
      email: m.user.email,
      rol: m.rol,
      cargo: m.cargo,
      unidad: m.unidad,
    }))
  );
});
