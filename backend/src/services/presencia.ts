// Presencia en vivo — quién está conectado ahora mismo.
//
// Estado EN MEMORIA: alcanza para un solo proceso Node (arquitectura B del
// Documento Maestro). Si algún día hay más de una instancia, esto se muda a
// Redis; mientras tanto, un Map es honesto y no agrega dependencias.
//
// Dos alcances distintos, y la diferencia es de privilegio, no de comodidad:
//   · por DELEGACIÓN: alimenta el tubo, donde ver quién más está trabajando en
//     el mismo libro es parte del trabajo compartido.
//   · por ORGANIZACIÓN: alimenta el panel de actividad (RF-030), que solo ven
//     admin y coordinador. Es monitoreo de personas trabajadoras y por eso no
//     se difunde al room general (ADR-015, Leyes 19.628 / 21.719).

export interface UsuarioPresente {
  userId: string;
  nombre: string;
  rol: string;
}

/** socketId → usuario, por unidad territorial */
const porUnidad = new Map<string, Map<string, UsuarioPresente>>();
/** socketId → usuario, por organización */
const porOrganizacion = new Map<string, Map<string, UsuarioPresente>>();

/** Deduplica por `userId`: una persona con dos pestañas es una persona. */
function deduplicar(sala: Map<string, UsuarioPresente> | undefined): UsuarioPresente[] {
  if (!sala) return [];
  const unicos = new Map<string, UsuarioPresente>();
  for (const u of sala.values()) unicos.set(u.userId, u);
  return [...unicos.values()];
}

export function entrarAOrganizacion(
  organizationId: string,
  socketId: string,
  usuario: UsuarioPresente
): void {
  if (!porOrganizacion.has(organizationId)) porOrganizacion.set(organizationId, new Map());
  porOrganizacion.get(organizationId)!.set(socketId, usuario);
}

export function salirDeOrganizacion(organizationId: string, socketId: string): void {
  porOrganizacion.get(organizationId)?.delete(socketId);
}

export function entrarAUnidad(unidadId: string, socketId: string, usuario: UsuarioPresente): void {
  if (!porUnidad.has(unidadId)) porUnidad.set(unidadId, new Map());
  porUnidad.get(unidadId)!.set(socketId, usuario);
}

export function salirDeUnidad(unidadId: string, socketId: string): void {
  porUnidad.get(unidadId)?.delete(socketId);
}

export function conectadosEnUnidad(unidadId: string): UsuarioPresente[] {
  return deduplicar(porUnidad.get(unidadId));
}

export function conectadosEnOrganizacion(organizationId: string): UsuarioPresente[] {
  return deduplicar(porOrganizacion.get(organizationId));
}
