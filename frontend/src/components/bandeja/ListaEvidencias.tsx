import type { EvidenciaEnBandeja } from "../../lib/types";
import { fechaCl } from "../../lib/ficha";

interface Props {
  evidencias: EvidenciaEnBandeja[];
  seleccionadaId: string | null;
  onSeleccionar: (id: string) => void;
}

// La cola de trabajo (DESIGN §8.2: "lista de trabajo, no tablero").
// Ordenada por antigüedad desde el backend: lo que lleva más esperando va
// primero. Cada fila dice lo mínimo para elegir; el detalle está a la derecha.
export function ListaEvidencias({ evidencias, seleccionadaId, onSeleccionar }: Props) {
  if (evidencias.length === 0) {
    return <p className="vacio">No hay evidencias con este filtro.</p>;
  }

  return (
    <ul className="bandeja-lista" aria-label="Evidencias por revisar">
      {evidencias.map((e) => {
        const activa = e.id === seleccionadaId;
        return (
          <li key={e.id}>
            <button
              type="button"
              className={activa ? "bandeja-item bandeja-item--activa" : "bandeja-item"}
              onClick={() => onSeleccionar(e.id)}
              aria-current={activa ? "true" : undefined}
            >
              <span className="bandeja-item-codigo tnum">{e.actividad.codigo}</span>
              <span className="bandeja-item-desc">{e.actividad.descripcion}</span>
              <span className="bandeja-item-meta">
                {e.actividad.funcionario.nombre} · {e.actividad.unidad.nombre} ·{" "}
                <span className="tnum">{fechaCl(e.actividad.fecha)}</span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
