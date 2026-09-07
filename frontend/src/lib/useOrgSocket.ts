import { useEffect, useRef } from "react";
import { io, type Socket } from "socket.io-client";
import { API_URL } from "./api";

// Socket del room de la ORGANIZACIÓN. A diferencia de useUnidadSocket, aquí no
// se pide entrar a ninguna sala: el servidor mete a todo socket autenticado en
// `org:<organizationId>` al conectar.
//
// Lo usa la bandeja del verificador, que es transversal a las delegaciones y
// por eso no puede escuchar el room de una sola.
interface Handlers {
  /** Alguien subió una evidencia nueva: hay trabajo esperando */
  onEvidenciaPendiente?: (datos: { evidenciaId: string; actividadId: string; codigo: string }) => void;
  /** Una aprobación movió el puntaje de alguien */
  onCumplimientoCambiado?: (datos: { periodoId: string; funcionarioId: string }) => void;
  /**
   * Quién está conectado en TODA la organización. El servidor solo lo emite al
   * room del nivel central: admin y coordinador (ADR-015). Un socket de otro
   * rol nunca recibe este evento, así que el handler simplemente no se llama.
   */
  onPresenciaOrganizacion?: (datos: {
    conectados: { userId: string; nombre: string; rol: string }[];
  }) => void;
  onReconectado?: () => void;
}

export function useOrgSocket(token: string | null, handlers: Handlers) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (!token) return;
    const socket: Socket = io(API_URL, { auth: { token } });
    let conectadoAntes = false;

    socket.on("connect", () => {
      if (conectadoAntes) handlersRef.current.onReconectado?.();
      conectadoAntes = true;
    });
    socket.on("evidencia:pendiente", (d: { evidenciaId: string; actividadId: string; codigo: string }) =>
      handlersRef.current.onEvidenciaPendiente?.(d)
    );
    socket.on("cumplimiento:cambiado", (d: { periodoId: string; funcionarioId: string }) =>
      handlersRef.current.onCumplimientoCambiado?.(d)
    );
    socket.on(
      "presencia:organizacion",
      (d: { conectados: { userId: string; nombre: string; rol: string }[] }) =>
        handlersRef.current.onPresenciaOrganizacion?.(d)
    );

    return () => {
      socket.close();
    };
  }, [token]);
}
