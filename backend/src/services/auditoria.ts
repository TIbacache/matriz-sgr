import type { AccionAuditoria } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import type { AuthPayload } from "../middleware/auth.js";

// Auditoría — RNF-008 · RF-036 · HU-30 · ADR-006.
//
// Registra usuario, fecha, acción, entidad, valor anterior y valor nuevo.
// La tabla es SOLO-INSERCIÓN: la migración instala triggers que rechazan
// UPDATE y DELETE, así que ni un bug de la aplicación puede alterarla.
//
// Nunca lanza: una falla al auditar no debe tumbar la operación de negocio,
// pero sí queda en el log del servidor para investigarse.

/** Campos que jamás deben quedar escritos en la bitácora. */
const CAMPOS_SENSIBLES = new Set(["passwordHash", "password_hash", "password", "token"]);

function limpiar(valor: unknown): unknown {
  if (valor === null || valor === undefined) return null;
  if (typeof valor !== "object") return valor;
  if (Array.isArray(valor)) return valor.map(limpiar);
  const salida: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(valor as Record<string, unknown>)) {
    if (CAMPOS_SENSIBLES.has(k)) continue;
    salida[k] = v instanceof Date ? v.toISOString() : limpiar(v);
  }
  return salida;
}

export interface EventoAuditoria {
  organizationId: string;
  usuarioId?: string | null;
  accion: AccionAuditoria;
  entidad: string;
  entidadId: string;
  valorAnterior?: unknown;
  valorNuevo?: unknown;
  ip?: string | null;
  origen?: string | null;
}

export async function registrarAuditoria(evento: EventoAuditoria): Promise<void> {
  try {
    await prisma.auditoria.create({
      data: {
        organizationId: evento.organizationId,
        usuarioId: evento.usuarioId ?? null,
        accion: evento.accion,
        entidad: evento.entidad,
        entidadId: evento.entidadId,
        valorAnterior: (limpiar(evento.valorAnterior) ?? undefined) as never,
        valorNuevo: (limpiar(evento.valorNuevo) ?? undefined) as never,
        ip: evento.ip ?? null,
        origen: evento.origen ?? null,
      },
    });
  } catch (err) {
    console.error("[auditoria] no se pudo registrar el evento:", evento.entidad, evento.entidadId, err);
  }
}

/** Atajo para usar desde un controlador, tomando el contexto de la petición. */
export function auditarDesde(
  auth: AuthPayload,
  req: { ip?: string; originalUrl?: string }
): (e: Omit<EventoAuditoria, "organizationId" | "usuarioId" | "ip" | "origen">) => Promise<void> {
  return (e) =>
    registrarAuditoria({
      ...e,
      organizationId: auth.organizationId,
      usuarioId: auth.userId,
      ip: req.ip ?? null,
      origen: req.originalUrl ?? null,
    });
}
