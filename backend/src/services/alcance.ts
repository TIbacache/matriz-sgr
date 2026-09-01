import { prisma } from "../lib/prisma.js";
import type { AuthPayload } from "../middleware/auth.js";

// Regla de visibilidad confirmada por el cliente (reunión 00:37:11):
// "Cada delegación tiene un libro, no se pueden ver entre ellos, pero cada
// integrante de la delegación puede ver todo el libro."
// El nivel central (admin/supervisor) sí ve todas.
// El semáforo consolidado (GET /kpis) es la excepción: lo ve todo el mundo,
// porque es lo que alimenta la sana competencia y el Efecto Hawthorne.
//
// Devuelve null cuando el rol ve TODAS las unidades de su organización.
export async function unidadesVisibles(auth: AuthPayload): Promise<string[] | null> {
  if (auth.rol === "admin" || auth.rol === "supervisor") return null;

  const [membresia, aCargo] = await Promise.all([
    prisma.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId: auth.organizationId, userId: auth.userId } },
      select: { unidadTerritorialId: true },
    }),
    // Un gerente puede ser responsable de una unidad aunque su membresía
    // apunte a otra (o a ninguna); ambas cuentan como "su" delegación.
    prisma.unidadTerritorial.findMany({
      where: { organizationId: auth.organizationId, responsableId: auth.userId },
      select: { id: true },
    }),
  ]);

  const ids = new Set<string>(aCargo.map((u) => u.id));
  if (membresia?.unidadTerritorialId) ids.add(membresia.unidadTerritorialId);
  return [...ids];
}

export async function puedeVerUnidad(auth: AuthPayload, unidadId: string): Promise<boolean> {
  const visibles = await unidadesVisibles(auth);
  return visibles === null || visibles.includes(unidadId);
}

// Alcance para VERIFICAR evidencias — RF-013 · RNF-005 (segregación de
// funciones). El verificador es un actor transversal del PDF §3: revisa
// evidencias de todas las delegaciones y por eso ve la bandeja completa.
// Es una función distinta de "ver el libro": esta NO amplía el acceso al tubo
// ni al registro diario, solo a las evidencias que debe validar.
export async function unidadesParaVerificacion(auth: AuthPayload): Promise<string[] | null> {
  if (auth.rol === "verificador") return null;
  return unidadesVisibles(auth);
}
