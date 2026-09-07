import type { Server, Socket } from "socket.io";
import { verificarToken, type AuthPayload } from "../middleware/auth.js";
import { prisma } from "../lib/prisma.js";
import { roomCentral, roomOrganizacion, roomUnidad } from "../services/broadcast.js";
import { puedeVerUnidad } from "../services/alcance.js";
import {
  conectadosEnOrganizacion,
  conectadosEnUnidad,
  entrarAOrganizacion,
  entrarAUnidad,
  salirDeOrganizacion,
  salirDeUnidad,
} from "../services/presencia.js";

// Presencia en vivo (Efecto Hawthorne, Documento Maestro §3.4). El estado vive
// en `services/presencia.ts` porque el panel de actividad (RF-030) también lo
// consulta desde su endpoint, y dos copias del mismo Map se desincronizan.

const MAX_MENSAJES_POR_SEGUNDO = 10;

/** Quiénes pueden ver la presencia de TODA la organización (ADR-015). */
function esNivelCentral(rol: string): boolean {
  return rol === "admin" || rol === "supervisor";
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

    // El nivel central entra además a un room propio. La presencia de toda la
    // organización NO se difunde al room general: quién está conectado es dato
    // de monitoreo y solo lo ven admin y coordinador (ADR-015).
    const central = esNivelCentral(auth.rol);
    if (central) void socket.join(roomCentral(auth.organizationId));

    // La presencia de organización se registra al CONECTAR, no al entrar a una
    // delegación: si dependiera de `unidad:join`, quien está en la ficha o en
    // el tablero figuraría como ausente aunque esté trabajando.
    entrarAOrganizacion(auth.organizationId, socket.id, {
      userId: auth.userId,
      nombre: auth.nombre,
      rol: auth.rol,
    });
    io.to(roomCentral(auth.organizationId)).emit("presencia:organizacion", {
      conectados: conectadosEnOrganizacion(auth.organizationId),
    });

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
      entrarAUnidad(unidadId, socket.id, {
        userId: auth.userId,
        nombre: auth.nombre,
        rol: auth.rol,
      });
      socket.data.unidadId = unidadId;

      io.to(roomUnidad(unidadId)).emit("presencia:actualizada", {
        unidadId,
        conectados: conectadosEnUnidad(unidadId),
      });
      ack?.(true);
    });

    socket.on("disconnect", () => {
      clearInterval(ventana);
      salirDeOrganizacion(auth.organizationId, socket.id);
      io.to(roomCentral(auth.organizationId)).emit("presencia:organizacion", {
        conectados: conectadosEnOrganizacion(auth.organizationId),
      });

      const unidadId = socket.data.unidadId as string | undefined;
      if (!unidadId) return;
      salirDeUnidad(unidadId, socket.id);
      io.to(roomUnidad(unidadId)).emit("presencia:actualizada", {
        unidadId,
        conectados: conectadosEnUnidad(unidadId),
      });
    });
  });
}
