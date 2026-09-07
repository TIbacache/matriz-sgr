import type { Server } from "socket.io";

// Broadcast CENTRALIZADO (Documento Maestro §9): todo write en la base debe
// pasar por emitEvent. Si un endpoint nuevo no lo llama, el cambio queda
// "mudo" para los demás usuarios — revisar en cada code review (HU-8.2).

let io: Server | null = null;

export function registrarIo(server: Server) {
  io = server;
}

// Room por unidad territorial: aísla eventos por delegación para no reenviar
// cada cambio a todos los usuarios de todas las unidades.
export function roomUnidad(unidadTerritorialId: string): string {
  return `unidad:${unidadTerritorialId}`;
}

// Room por organización: para eventos que interesan a supervisores/admins
// (metas, categorías, semáforos consolidados).
export function roomOrganizacion(organizationId: string): string {
  return `org:${organizationId}`;
}

// Room del NIVEL CENTRAL (admin y coordinador) dentro de una organización.
// Existe para lo que no puede difundirse a todos: hoy, la presencia de toda la
// organización que alimenta el panel de actividad (RF-030, ADR-015). Saber
// quién está conectado es monitoreo de personas trabajadoras, no un dato de
// colaboración como la presencia dentro de un mismo libro.
export function roomCentral(organizationId: string): string {
  return `org:${organizationId}:central`;
}

export function emitEvent(room: string, event: string, data: unknown) {
  if (!io) {
    // El servidor HTTP siempre registra io antes de escuchar; esto solo puede
    // ocurrir en tests unitarios sin socket.
    console.warn(`[broadcast] io no registrado; evento ${event} descartado`);
    return;
  }
  io.to(room).emit(event, data);
}
