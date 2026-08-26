import { useMemo, useState } from "react";
import type { ResumenDelegacion } from "../../lib/dashboard";
import { SIMBOLO_SEMAFORO } from "../../lib/useTokens";

interface Props {
  resumen: ResumenDelegacion[];
  seleccion: string | null;
  onSeleccionar: (unidadId: string | null) => void;
}

type Columna = "nombre" | "cumplimiento" | "objetivoAlDia" | "avanceRelativo" | "proyeccion" | "vencidas";

const COLUMNAS: { clave: Columna; etiqueta: string; numerica: boolean }[] = [
  { clave: "nombre", etiqueta: "Delegación", numerica: false },
  { clave: "cumplimiento", etiqueta: "Cumplimiento", numerica: true },
  { clave: "objetivoAlDia", etiqueta: "Objetivo al día", numerica: true },
  { clave: "avanceRelativo", etiqueta: "Avance relativo", numerica: true },
  { clave: "proyeccion", etiqueta: "Proyección cierre", numerica: true },
  { clave: "vencidas", etiqueta: "Tareas vencidas", numerica: true },
];

// La "table view" que la skill exige como gemela WCAG de los gráficos: todo
// valor visible sin hover, tabular-nums, ordenable, semáforo con símbolo+texto
// (nunca solo color). Click en fila = misma selección que gauges/heatmap.
export function TablaDetalle({ resumen, seleccion, onSeleccionar }: Props) {
  const [ordenPor, setOrdenPor] = useState<Columna>("avanceRelativo");
  const [descendente, setDescendente] = useState(true);

  const filas = useMemo(() => {
    const copia = [...resumen];
    copia.sort((a, b) => {
      const va = a[ordenPor];
      const vb = b[ordenPor];
      const cmp = typeof va === "string" ? va.localeCompare(vb as string) : (va as number) - (vb as number);
      return descendente ? -cmp : cmp;
    });
    return copia;
  }, [resumen, ordenPor, descendente]);

  const ordenar = (col: Columna) => {
    if (col === ordenPor) setDescendente((d) => !d);
    else {
      setOrdenPor(col);
      setDescendente(col !== "nombre");
    }
  };

  return (
    <div className="tabla-detalle-envoltura">
      <table className="tabla-detalle">
        <thead>
          <tr>
            {COLUMNAS.map((c) => (
              <th key={c.clave} className={c.numerica ? "num" : undefined}>
                <button className="tabla-orden" onClick={() => ordenar(c.clave)}>
                  {c.etiqueta}
                  {ordenPor === c.clave && (
                    <span aria-hidden="true"> {descendente ? "↓" : "↑"}</span>
                  )}
                </button>
              </th>
            ))}
            <th>Semáforo</th>
          </tr>
        </thead>
        <tbody>
          {filas.map((r) => (
            <tr
              key={r.unidadId}
              className={seleccion === r.unidadId ? "tabla-fila--activa" : undefined}
              onClick={() => onSeleccionar(seleccion === r.unidadId ? null : r.unidadId)}
            >
              <td>{r.nombre}</td>
              <td className="num">{r.cumplimiento.toFixed(1)}%</td>
              <td className="num">{r.objetivoAlDia.toFixed(1)}%</td>
              <td className="num">{r.avanceRelativo.toFixed(1)}%</td>
              <td className="num">{r.proyeccion.toFixed(1)}%</td>
              <td className="num">{r.vencidas}</td>
              <td>
                <span className={`chip-semaforo chip-semaforo--${r.semaforo}`}>
                  {SIMBOLO_SEMAFORO[r.semaforo]}{" "}
                  {r.semaforo === "verde" ? "Al día" : r.semaforo === "naranjo" ? "Atención" : "Crítico"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="tabla-nota">
        Licencias, vacaciones y compensatorios por funcionario: pendientes de la definición de columnas del
        cliente — hoy el objetivo al día usa los días calendario del trimestre.
      </p>
    </div>
  );
}
