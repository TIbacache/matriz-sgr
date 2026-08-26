import type { Server, Socket } from "socket.io";
import { verificarToken, type AuthPayload } from "../middleware/auth.js";
import { prisma } from "../lib/prisma.js";
import { roomOrganizacion, roomUnidad } from "../services/broadcast.js";
import { puedeVerUnidad } from "../services/alcance.js";

// Presencia en vivo (Efecto Hawthorne, Documento Maestro §3.4).
// Estado en memoria: suficiente para un solo proceso Node (arquitectura B).
// Map<unidadId, Map<socketId, usuario>>
const presencia = new Map<string, Map<string, { userId: string; nombre: string; rol: string }>>();

const MAX_MENSAJES_POR_SEGUNDO = 10;

function listaPresencia(unidadId: string) {
  const sala = presencia.get(unidadId);
  if (!sala) return [];
  // Deduplicar por userId (un usuario puede tener 2 pestañas abiertas)
  const porUsuario = new Map<string, { userId: string; nombre: string; rol: string }>();
  for (const u of sala.values()) porUsuario.set(u.userId, u);
  return [...porUsuario.values()];
}

export function configurarSockets(io: Server) {
  // Autenticación en el HANDSHAKE: sin JWT válido no se acepta la conexión
  // ni ningún evento (Documento Maestro §9 — "no confiar en el socket").
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) return next(new Error("No autenticado"));
    try {
      socket.data.auth = verificarToken(token);
      next();
    } catch {
      next(new Error("Token inválido o expirado"));
    }
  });

  io.on("connection", (socket: Socket) => {
    const auth = socket.data.auth as AuthPayload;

    // Rate limiting por socket: contador simple por ventana de 1 segundo.
    // Excederlo descarta el mensaje; reincidencia grave desconecta.
    let mensajesEnVentana = 0;
    let excesos = 0;
    const ventana = setInterval(() => (mensajesEnVentana = 0), 1000);
    socket.use((_packet, next) => {
      mensajesEnVentana += 1;
      if (mensajesEnVentana > MAX_MENSAJES_POR_SEGUNDO) {
        excesos += 1;
        if (excesos > 5) {
          console.warn(`[socket] ${auth.userId} desconectado por flood`);
          socket.disconnect(true);
        }
        return; // descarta el mensaje sin llamar next()
      }
      next();
    });

    // Todos entran al room de su organización (dashboards consolidados).
    void socket.join(roomOrganizacion(auth.organizationId));

    // El cliente pide unirse al room de una unidad (su delegación).
    socket.on("unidad:join", async (unidadId: unknown, ack?: (ok: boolean) => void) => {
      if (typeof unidadId !== "string") return ack?.(false);

      // Doble verificación: (1) la unidad pertenece a la organización del
      // token — impide cruzar tenants aunque se adivine un UUID ajeno; y
      // (2) el rol tiene visibilidad sobre ese libro — el tubo de una
      // delegación no se transmite a las demás.
      const unidad = await prisma.unidadTerritorial.findFirst({
        where: { id: unidadId, organizationId: auth.organizationId },
        select: { id: true },
      });
      if (!unidad) return ack?.(false);
      if (!(await puedeVerUnidad(auth, unidadId))) return ack?.(false);

      await socket.join(roomUnidad(unidadId));
      if (!presencia.has(unidadId)) presencia.set(unidadId, new Map());
      presencia.get(unidadId)!.set(socket.id, {
        userId: auth.userId,
        nombre: auth.nombre,
        rol: auth.rol,
      });
      socket.data.unidadId = unidadId;

      io.to(roomUnidad(unidadId)).emit("presencia:actualizada", {
        unidadId,
        conectados: listaPresencia(unidadId),
      });
      ack?.(true);
    });

    socket.on("disconnect", () => {
      clearInterval(ventana);
      const unidadId = socket.data.unidadId as string | undefined;
      if (!unidadId) return;
      presencia.get(unidadId)?.delete(socket.id);
      io.to(roomUnidad(unidadId)).emit("presencia:actualizada", {
        unidadId,
        conectados: listaPresencia(unidadId),
      });
    });
  });
}
