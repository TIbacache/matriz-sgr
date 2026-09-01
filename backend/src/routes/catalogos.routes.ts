import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";

// Catálogos configurables — RF-004 · RNF-015 · HU-27.
//
// Los desplegables de los formularios y la lista de formatos de evidencia
// aceptados salen de aquí, NUNCA de una constante en el código: cambiar un
// catálogo es tarea de administración, no un despliegue (RNF-015).
//
// Por defecto solo devuelve los VIGENTES: un valor desactivado desaparece de
// los registros nuevos pero sigue siendo legible en los antiguos, que es
// exactamente lo que pide RF-004.
//
// Solo lectura por ahora. El CRUD de catálogos (HU-27) sigue pendiente y está
// declarado como tal en docs/siguiente-sesion.md.

export const catalogosRouter = Router();
catalogosRouter.use(requireAuth);

// GET /catalogos[?catalogo=formato_evidencia][&area=SOCIAL][&incluirNoVigentes=1]
catalogosRouter.get("/", async (req, res) => {
  const catalogo = typeof req.query.catalogo === "string" ? req.query.catalogo : undefined;
  const area = typeof req.query.area === "string" ? req.query.area : undefined;
  const incluirNoVigentes = req.query.incluirNoVigentes === "1";

  const items = await prisma.catalogoItem.findMany({
    where: {
      organizationId: req.auth!.organizationId,
      ...(catalogo ? { catalogo } : {}),
      // Un catálogo acotado a un área también sirve a quien no filtra por ella.
      ...(area ? { OR: [{ area }, { area: null }] } : {}),
      ...(incluirNoVigentes ? {} : { vigente: true }),
    },
    select: { id: true, catalogo: true, valor: true, area: true, orden: true, vigente: true },
    orderBy: [{ catalogo: "asc" }, { orden: "asc" }],
  });
  res.json(items);
});
