import { useDraggable } from "@dnd-kit/core";
import type { Tarea } from "../../lib/types";
import { fechaVencida, formatearFecha, iniciales } from "../../lib/kanban";

interface Props {
  tarea: Tarea;
  colorCategoria: string;
  arrastrable: boolean;
  // true cuando la tarjeta se renderiza dentro del DragOverlay
  enOverlay?: boolean;
}

export function TareaCard({ tarea, colorCategoria, arrastrable, enOverlay }: Props) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: tarea.id,
    disabled: !arrastrable || enOverlay,
  });

  const vencida = fechaVencida(tarea.fechaCompromiso) && tarea.estado !== "realizado";

  return (
    <article
      ref={enOverlay ? undefined : setNodeRef}
      {...(enOverlay ? {} : { ...attributes, ...listeners })}
      className={[
        "tarea-card",
        arrastrable && "tarea-card--arrastrable",
        isDragging && "tarea-card--fantasma",
        enOverlay && "tarea-card--overlay",
      ]
        .filter(Boolean)
        .join(" ")}
      style={{ borderLeftColor: colorCategoria }}
    >
      <h4 className="tarea-card-titulo">{tarea.titulo}</h4>
      <div className="tarea-card-meta">
        {tarea.categoria && (
          <span className="tarea-card-categoria" style={{ color: colorCategoria }}>
            {tarea.categoria.nombre}
          </span>
        )}
        {tarea.fechaCompromiso && (
          <span className={vencida ? "tarea-card-fecha tarea-card-fecha--vencida" : "tarea-card-fecha"}>
            {formatearFecha(tarea.fechaCompromiso)}
            {vencida && " · vencida"}
          </span>
        )}
      </div>
      {tarea.responsable && (
        <span className="tarea-card-avatar" title={tarea.responsable.nombre}>
          {iniciales(tarea.responsable.nombre)}
        </span>
      )}
    </article>
  );
}
