import { useEffect, useRef } from "react";
import { io, type Socket } from "socket.io-client";
import { API_URL } from "./api";
import type { Conectado, Tarea } from "./types";

interface Handlers {
  onTareaCreada: (t: Tarea) => void;
  onTareaActualizada: (t: Tarea) => void;
  onTareaEliminada: (id: string) => void;
  onPresencia: (conectados: Conectado[]) => void;
  // HU-3.4: al RECONECTAR se recarga el estado completo del tubo en vez de
  // confiar en el próximo evento (los eventos perdidos durante el corte no
  // se reenvían).
  onReconectado: () => void;
}

export function useUnidadSocket(token: string | null, unidadId: string | null, handlers: Handlers) {
  // Ref para no reconectar el socket cada vez que cambian los callbacks.
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (!token || !unidadId) return;

    const socket: Socket = io(API_URL, { auth: { token } });
    let conectadoAntes = false;

    socket.on("connect", () => {
      // En cada connect (primero o reconexión) hay que re-entrar al room:
      // el servidor no recuerda las salas de un socket caído.
      socket.emit("unidad:join", unidadId, (ok: boolean) => {
        if (!ok) console.warn("[socket] join rechazado para unidad", unidadId);
      });
      if (conectadoAntes) handlersRef.current.onReconectado();
      conectadoAntes = true;
    });

    socket.on("tarea:creada", (t: Tarea) => handlersRef.current.onTareaCreada(t));
    socket.on("tarea:actualizada", (t: Tarea) => handlersRef.current.onTareaActualizada(t));
    socket.on("tarea:eliminada", (d: { id: string }) => handlersRef.current.onTareaEliminada(d.id));
    socket.on(
      "presencia:actualizada",
      (d: { unidadId: string; conectados: Conectado[] }) => {
        if (d.unidadId === unidadId) handlersRef.current.onPresencia(d.conectados);
      }
    );

    return () => {
      socket.close();
    };
  }, [token, unidadId]);
}
