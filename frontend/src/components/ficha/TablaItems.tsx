import type { CumplimientoFuncionario } from "../../lib/types";

interface Props {
  ficha: CumplimientoFuncionario;
}

// Bloque 2 de la ficha personal (DESIGN §8.2): qué se le mide a esta persona.
// Reglas que cumple:
// - Números a la derecha con tabular-nums (los dígitos no bailan al comparar).
// - La fila de total se separa con BORDE de 2px, no con color de fondo.
// - Los ítems inversos llevan marca TEXTUAL: si solo se distinguieran por
//   comportamiento, nadie entendería por qué 11 sobre una meta de 10 da 90%
//   (ADR-009).
export function TablaItems({ ficha }: Props) {
  const num = (n: number, dec = 1) => n.toFixed(dec).replace(".", ",");

  if (ficha.items.length === 0) {
    return (
      <section className="card ficha-bloque" aria-label="Ítems medidos">
        <h3 className="ficha-bloque-titulo">Ítems medidos</h3>
        <p className="vacio">
          Esta persona no tiene metas asignadas en el período, así que todavía no hay nada que
          medirle. Las metas y ponderadores se cargan en <strong>Configuración de metas</strong>,
          que es tarea de administración y coordinación (RF-007).
        </p>
      </section>
    );
  }

  return (
    <section className="card ficha-bloque" aria-label="Ítems medidos">
      <h3 className="ficha-bloque-titulo">Ítems medidos</h3>
      <p className="ficha-bloque-sub">
        El avance cuenta solo actividades con evidencia validada (RN-009).
      </p>

      <div className="tabla-envoltura">
        <table className="tabla-sgr">
          <thead>
            <tr>
              <th scope="col">Ítem</th>
              <th scope="col" className="num">Ponderador</th>
              <th scope="col" className="num">Meta</th>
              <th scope="col" className="num">Avance</th>
              <th scope="col" className="num">% cumplimiento</th>
              <th scope="col" className="num">Ponderado</th>
            </tr>
          </thead>
          <tbody>
            {ficha.items.map((i) => (
              <tr key={i.itemId}>
                <td>
                  {i.itemNombre}
                  {i.direccion === "menor_mejor" && (
                    <span className="ficha-marca-inverso"> · menor es mejor</span>
                  )}
                </td>
                <td className="num">{num(i.ponderador * 100)}%</td>
                <td className="num">
                  {num(i.meta, 0)}
                  {i.tipo === "porcentaje" ? "%" : ""}
                </td>
                <td className="num">{i.avance}</td>
                <td className="num">{num(i.cumplimiento)}%</td>
                <td className="num">{num(i.ponderado)}%</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="ficha-total">
              <th scope="row" colSpan={5}>
                Total ponderado
              </th>
              <td className="num">{num(ficha.cumplimientoTotal)}%</td>
            </tr>
            {ficha.ajustes !== 0 && (
              <tr>
                <th scope="row" colSpan={5}>
                  Ajustes por felicitaciones y reclamos
                </th>
                <td className="num">
                  {ficha.ajustes > 0 ? "+" : ""}
                  {num(ficha.ajustes)}%
                </td>
              </tr>
            )}
            {ficha.ajustes !== 0 && (
              <tr>
                <th scope="row" colSpan={5}>
                  Cumplimiento final
                </th>
                <td className="num">{num(ficha.cumplimientoFinal)}%</td>
              </tr>
            )}
          </tfoot>
        </table>
      </div>
    </section>
  );
}
