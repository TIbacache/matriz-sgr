import type { NextFunction, Request, Response } from "express";
import type { Rol } from "@prisma/client";

// Matriz de roles centralizada en UN solo lugar: cuando el profesor entregue
// la definición final (pendiente, ver docs/restricciones-y-pendientes.md),
// solo se ajusta aquí y en los controladores que consultan alcance por recurso.
export function requireRol(...roles: Rol[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.auth) return res.status(401).json({ error: "No autenticado" });
    if (!roles.includes(req.auth.rol)) {
      return res.status(403).json({ error: "Sin permisos para esta acción" });
    }
    next();
  };
}
