import { fmt, leerNumero, type FilaMeta, type ProblemaFila } from "../../lib/metas";

interface Props {
  filas: FilaMeta[];
  problemas: ProblemaFila[];
  editable: boolean;
  onCambiar: (itemId: string, cambio: Partial<FilaMeta>) => void;
}

// Tabla de configuración (DESIGN §8.2). Decisiones que no son cosméticas:
//
// - **Todos los ítems del cargo se muestran**, tengan meta o no: uno oculto es
//   uno que nadie recuerda repartir. Los que no se miden van desmarcados.
// - **Lo que ya sumó puntaje no se puede desmarcar** (RN-009, CA-01): la casilla
//   se desactiva y la razón se escribe al lado. Un botón que siempre falla es
//   peor que un botón ausente.
// - El ponderador se pide y se muestra en **porcentaje**; la conversión a
//   fracción vive en `lib/metas.ts`, nunca aquí.
// - Los ítems inversos llevan marca **textual** (ADR-009): sin ella nadie
//   entiende por qué 11 sobre una meta de 10 da 90%.
export function TablaMetas({ filas, problemas, editable, onCambiar }: Props) {
  const problemaDe = (itemId: string) => problemas.find((p) => p.itemId === itemId);

  return (
    <div className="tabla-envoltura">
      <table className="tabla-sgr metas-tabla">
        <thead>
          <tr>
            <th scope="col" className="metas-col-check">
              <span className="sr-only">Se mide</span>
              Mide
            </th>
            <th scope="col">Ítem</th>
            <th scope="col" className="num metas-col-num">
              Meta del período <abbr title="obligatorio">*</abbr>
            </th>
            <th scope="col" className="num metas-col-num">
              Ponderador % <abbr title="obligatorio">*</abbr>
            </th>
            <th scope="col" className="num">Avance validado</th>
          </tr>
        </thead>
        <tbody>
          {filas.map((f) => {
            const problema = problemaDe(f.itemId);
            const bloqueada = f.avance > 0;
            const pond = leerNumero(f.ponderador);
            return (
              <tr key={f.itemId} className={f.incluido ? undefined : "metas-fila--fuera"}>
                <td className="metas-col-check">
                  <input
                    type="checkbox"
                    id={`mide-${f.itemId}`}
                    checked={f.incluido}
                    disabled={!editable || (bloqueada && f.incluido)}
                    onChange={(e) => onCambiar(f.itemId, { incluido: e.target.checked })}
                  />
                  <label htmlFor={`mide-${f.itemId}`} className="sr-only">
                    Medir «{f.nombre}» a esta persona
                  </label>
                </td>

                <td>
                  <span className="metas-item-nombre">{f.nombre}</span>
                  {f.direccion === "menor_mejor" && (
                    <span className="metas-marca-inverso"> · menor es mejor</span>
                  )}
                  {bloqueada && f.incluido && (
                    <span className="metas-nota-bloqueo">
                      Ya tiene avance aprobado en este período: puedes ajustar su meta o su peso,
                      pero no quitarla (RN-009).
                    </span>
                  )}
                  {problema && (
                    <span className="metas-error" role="alert">
                      {problema.mensaje}
                    </span>
                  )}
                </td>

                <td className="num">
                  <label className="sr-only" htmlFor={`meta-${f.itemId}`}>
                    Meta de «{f.nombre}»
                  </label>
                  <input
                    id={`meta-${f.itemId}`}
                    className="campo metas-input"
                    type="text"
                    inputMode="decimal"
                    value={f.meta}
                    disabled={!editable || !f.incluido}
                    aria-invalid={problema ? true : undefined}
                    placeholder={f.tipo === "porcentaje" ? "%" : "n°"}
                    onChange={(e) => onCambiar(f.itemId, { meta: e.target.value })}
                  />
                </td>

                <td className="num">
                  <label className="sr-only" htmlFor={`pond-${f.itemId}`}>
                    Ponderador de «{f.nombre}», en porcentaje
                  </label>
                  <input
                    id={`pond-${f.itemId}`}
                    className="campo metas-input"
                    type="text"
                    inputMode="decimal"
                    value={f.ponderador}
                    disabled={!editable || !f.incluido}
                    aria-invalid={problema ? true : undefined}
                    onChange={(e) => onCambiar(f.itemId, { ponderador: e.target.value })}
                  />
                </td>

                <td className="num">
                  {f.incluido ? (
                    <>
                      {f.avance}
                      {pond !== null && pond > 0 && leerNumero(f.meta) ? (
                        <span className="metas-avance-pct">
                          {" "}
                          ({fmt(Math.min(150, (f.avance / (leerNumero(f.meta) || 1)) * 100), 0)}%)
                        </span>
                      ) : null}
                    </>
                  ) : (
                    <span className="metas-sin-medir">no se mide</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
