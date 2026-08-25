import { Router } from "express";
import bcrypt from "bcrypt";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { firmarToken, requireAuth } from "../middleware/auth.js";

export const authRouter = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  // Opcional: si el usuario pertenece a varias organizaciones debe elegir una.
  organizationId: z.string().uuid().optional(),
});

authRouter.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Datos inválidos" });
  const { email, password, organizationId } = parsed.data;

  const user = await prisma.user.findUnique({
    where: { email },
    include: { memberships: { include: { organization: { select: { id: true, nombre: true } } } } },
  });

  // Mensaje genérico: no revelar si el email existe (HU-1.1).
  const credencialesInvalidas = () =>
    res.status(401).json({ error: "Credenciales inválidas" });

  if (!user) return credencialesInvalidas();
  const passwordOk = await bcrypt.compare(password, user.passwordHash);
  if (!passwordOk) return credencialesInvalidas();

  let membership = user.memberships[0];
  if (organizationId) {
    membership = user.memberships.find((m) => m.organizationId === organizationId);
  } else if (user.memberships.length > 1) {
    // Varias organizaciones y no eligió: devolver la lista para que elija.
    return res.status(409).json({
      error: "Debe indicar organizationId",
      organizaciones: user.memberships.map((m) => m.organization),
    });
  }
  if (!membership) return credencialesInvalidas();

  const token = firmarToken({
    userId: user.id,
    organizationId: membership.organizationId,
    rol: membership.rol,
    nombre: user.nombre,
  });

  res.json({
    token,
    usuario: {
      id: user.id,
      nombre: user.nombre,
      email: user.email,
      rol: membership.rol,
      organizationId: membership.organizationId,
    },
  });
});

authRouter.get("/me", requireAuth, async (req, res) => {
  const auth = req.auth!;
  const org = await prisma.organization.findUnique({
    where: { id: auth.organizationId },
    select: { id: true, nombre: true, tipo: true, configuracionTerminologia: true },
  });
  res.json({ ...auth, organizacion: org });
});
