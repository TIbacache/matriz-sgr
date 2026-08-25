import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import type { Tarea } from "../../lib/types";
import { COLUMNAS } from "../../lib/kanban";
import { KanbanColumn } from "./KanbanColumn";
import { TareaCard } from "./TareaCard";
import "./kanban.css";

interface Props {
  tareas: Tarea[];
  colorPorCategoria: (categoriaId: string) => string;
  esArrastrable: (tarea: Tarea) => boolean;
  onMover: (tarea: Tarea, nuevoEstado: string) => void;
}

// Sin orden intra-columna (decisión Fase 2 nº3): las columnas ordenan por
// fecha compromiso, así que solo importa a QUÉ columna se suelta la tarjeta.
// Por eso useDraggable/useDroppable simples en vez de sortable.
export function KanbanBoard({ tareas, colorPorCategoria, esArrastrable, onMover }: Props) {
  const [tareaActiva, setTareaActiva] = useState<Tarea | null>(null);

  // Pointer + Touch: drag en desktop y móvil (dnd-kit, no HTML5 drag nativo).
  // La distancia de activación evita que un click/tap cuente como arrastre.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } })
  );

  const onDragStart = (e: DragStartEvent) => {
    setTareaActiva(tareas.find((t) => t.id === e.active.id) ?? null);
  };

  const onDragEnd = (e: DragEndEvent) => {
    setTareaActiva(null);
    const tarea = tareas.find((t) => t.id === e.active.id);
    const nuevoEstado = e.over?.id;
    if (!tarea || typeof nuevoEstado !== "string") return;
    if (tarea.estado === nuevoEstado) return;
    onMover(tarea, nuevoEstado);
  };

  const porColumna = (estado: string) =>
    tareas
      .filter((t) => t.estado === estado)
      .sort((a, b) => (a.fechaCompromiso ?? "9999").localeCompare(b.fechaCompromiso ?? "9999"));

  return (
    <DndContext
      sensors={sensors}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setTareaActiva(null)}
    >
      <div className="kanban">
        {COLUMNAS.map((col) => (
          <KanbanColumn
            key={col.estado}
            estado={col.estado}
            titulo={col.titulo}
            tareas={porColumna(col.estado)}
            colorPorCategoria={colorPorCategoria}
            esArrastrable={esArrastrable}
          />
        ))}
      </div>
      <DragOverlay dropAnimation={null}>
        {tareaActiva && (
          <TareaCard
            tarea={tareaActiva}
            colorCategoria={colorPorCategoria(tareaActiva.categoriaId)}
            arrastrable
            enOverlay
          />
        )}
      </DragOverlay>
    </DndContext>
  );
}
