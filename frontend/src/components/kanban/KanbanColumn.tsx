import { useDroppable } from "@dnd-kit/core";
import type { Tarea } from "../../lib/types";
import { TareaCard } from "./TareaCard";

interface Props {
  estado: string;
  titulo: string;
  tareas: Tarea[];
  colorPorCategoria: (categoriaId: string) => string;
  esArrastrable: (tarea: Tarea) => boolean;
}

export function KanbanColumn({ estado, titulo, tareas, colorPorCategoria, esArrastrable }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: estado });

  return (
    <section
      ref={setNodeRef}
      className={isOver ? "kanban-columna kanban-columna--sobre" : "kanban-columna"}
    >
      <header className="kanban-columna-header">
        <span className="kanban-columna-titulo">{titulo}</span>
        <span className="kanban-columna-contador">{tareas.length}</span>
      </header>
      <div className="kanban-columna-lista">
        {tareas.map((t) => (
          <TareaCard
            key={t.id}
            tarea={t}
            colorCategoria={colorPorCategoria(t.categoriaId)}
            arrastrable={esArrastrable(t)}
          />
        ))}
        {tareas.length === 0 && <p className="kanban-columna-vacia">Sin tareas</p>}
      </div>
    </section>
  );
}
