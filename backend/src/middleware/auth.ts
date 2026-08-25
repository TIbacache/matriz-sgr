import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import type { Rol } from "@prisma/client";

// Payload del JWT: identidad + tenant + rol. Se firma en /auth/login.
export interface AuthPayload {
  userId: string;
  organizationId: string;
  rol: Rol;
  nombre: string;
}

declare module "express-serve-static-core" {
  interface Request {
    auth?: AuthPayload;
  }
}

export function firmarToken(payload: AuthPayload): string {
  return jwt.sign(payload, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  } as jwt.SignOptions);
}

export function verificarToken(token: string): AuthPayload {
  const decoded = jwt.verify(token, env.jwtSecret);
  if (typeof decoded === "string") throw new Error("Token inválido");
  return decoded as unknown as AuthPayload;
}

// Middleware: exige Bearer token válido en todo endpoint protegido.
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No autenticado" });
  }
  try {
    req.auth = verificarToken(header.slice("Bearer ".length));
    next();
  } catch {
    return res.status(401).json({ error: "Token inválido o expirado" });
  }
}
