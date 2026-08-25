import type { Conectado } from "../lib/types";
import { iniciales } from "../lib/kanban";
import "./presence.css";

// Presencia en vivo (Efecto Hawthorne, HU-6.1): quiénes están conectados
// ahora mismo en la unidad seleccionada.
export function PresenceBar({ conectados }: { conectados: Conectado[] }) {
  return (
    <div className="presencia" aria-label="Usuarios conectados">
      <span className="presencia-punto" aria-hidden="true">●</span>
      <span className="presencia-texto">
        {conectados.length === 0
          ? "Nadie conectado"
          : `${conectados.length} en línea`}
      </span>
      <div className="presencia-avatares">
        {conectados.map((c) => (
          <span key={c.userId} className="presencia-avatar" title={`${c.nombre} (${c.rol})`}>
            {iniciales(c.nombre)}
          </span>
        ))}
      </div>
    </div>
  );
}
