import { useEffect, useRef } from "react";
import { io, type Socket } from "socket.io-client";
import { API_URL } from "./api";
import type { Actividad, Conectado, Tarea } from "./types";

// Un solo hook para el room de una delegación: el tubo y la ficha personal
// escuchan el mismo room (`unidad:<id>`) y solo cambian los eventos que les
// interesan. Todos los handlers son opcionales para que cada pantalla declare
// únicamente lo suyo.
interface Handlers {
  onTareaCreada?: (t: Tarea) => void;
  onTareaActualizada?: (t: Tarea) => void;
  onTareaEliminada?: (id: string) => void;
  onPresencia?: (conectados: Conectado[]) => void;
  // Modelo v2: el eje actividad → evidencia → validación
  onActividadCreada?: (a: Actividad) => void;
  onActividadActualizada?: (a: Actividad) => void;
  onValidacionRegistrada?: (datos: { actividadId: string; codigo: string }) => void;
  // HU-3.4: al RECONECTAR se recarga el estado completo en vez de confiar en el
  // próximo evento (los eventos perdidos durante el corte no se reenvían).
  onReconectado?: () => void;
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
      if (conectadoAntes) handlersRef.current.onReconectado?.();
      conectadoAntes = true;
    });

    socket.on("tarea:creada", (t: Tarea) => handlersRef.current.onTareaCreada?.(t));
    socket.on("tarea:actualizada", (t: Tarea) => handlersRef.current.onTareaActualizada?.(t));
    socket.on("tarea:eliminada", (d: { id: string }) => handlersRef.current.onTareaEliminada?.(d.id));
    socket.on("actividad:creada", (a: Actividad) => handlersRef.current.onActividadCreada?.(a));
    socket.on("actividad:actualizada", (a: Actividad) =>
      handlersRef.current.onActividadActualizada?.(a)
    );
    socket.on("actividad:anulada", (a: Actividad) => handlersRef.current.onActividadActualizada?.(a));
    socket.on("validacion:registrada", (d: { actividadId: string; codigo: string }) =>
      handlersRef.current.onValidacionRegistrada?.(d)
    );
    socket.on(
      "presencia:actualizada",
      (d: { unidadId: string; conectados: Conectado[] }) => {
        if (d.unidadId === unidadId) handlersRef.current.onPresencia?.(d.conectados);
      }
    );

    return () => {
      socket.close();
    };
  }, [token, unidadId]);
}
