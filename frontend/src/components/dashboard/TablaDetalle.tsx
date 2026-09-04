import { useMemo, useState } from "react";
import type { ResumenDelegacion } from "../../lib/dashboard";
import { ChipSemaforo } from "../ChipSemaforo";

interface Props {
  resumen: ResumenDelegacion[];
  seleccion: string | null;
  onSeleccionar: (unidadId: string | null) => void;
}

type Columna =
  | "nombre"
  | "funcionarios"
  | "cumplimiento"
  | "objetivoAlDia"
  | "avanceRelativo"
  | "proyeccion"
  | "vencidas";

const COLUMNAS: { clave: Columna; etiqueta: string; numerica: boolean }[] = [
  { clave: "nombre", etiqueta: "Delegación", numerica: false },
  { clave: "funcionarios", etiqueta: "Funcionarios", numerica: true },
  { clave: "cumplimiento", etiqueta: "Cumplimiento", numerica: true },
  { clave: "objetivoAlDia", etiqueta: "Objetivo al día", numerica: true },
  { clave: "avanceRelativo", etiqueta: "Avance relativo", numerica: true },
  { clave: "proyeccion", etiqueta: "Proyección cierre", numerica: true },
  { clave: "vencidas", etiqueta: "Tareas vencidas", numerica: true },
];

// La "table view" que acompaña a los gráficos como gemela accesible: todo valor
// visible sin hover, tabular-nums, ordenable, semáforo con símbolo + texto
// (nunca solo color). Click en fila = misma selección que gauges y mapa.
//
// Bloque C: usa `.tabla-sgr` como el resto del sistema. Tenía una tabla propia
// (`.tabla-detalle`) casi idéntica, que era deuda declarada: dos estilos para
// el mismo objeto terminan divergiendo en el primer arreglo que se hace en uno.
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
      <table className="tabla-sgr tabla-clickeable">
        <thead>
          <tr>
            {COLUMNAS.map((c) => (
              <th key={c.clave} scope="col" className={c.numerica ? "num" : undefined}>
                <button className="tabla-orden" onClick={() => ordenar(c.clave)}>
                  {c.etiqueta}
                  {ordenPor === c.clave && (
                    <span aria-hidden="true"> {descendente ? "↓" : "↑"}</span>
                  )}
                </button>
              </th>
            ))}
            <th scope="col">Semáforo</th>
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
              <td className="num">{r.funcionarios}</td>
              <td className="num">{r.cumplimiento.toFixed(1)}%</td>
              <td className="num">{r.objetivoAlDia.toFixed(1)}%</td>
              <td className="num">{r.avanceRelativo.toFixed(1)}%</td>
              <td className="num">{r.proyeccion.toFixed(1)}%</td>
              <td className="num">{r.vencidas}</td>
              <td>
                <ChipSemaforo semaforo={r.semaforo} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="tabla-nota">
        La delegación es el promedio de sus funcionarios (ADR-014). El objetivo al día ya descuenta
        las ausencias registradas de cada persona (RN-007), por eso dos delegaciones del mismo
        período pueden tener objetivos distintos.
      </p>
    </div>
  );
}
