import { fmt, type EstadoSuma } from "../../lib/metas";

interface Props {
  suma: EstadoSuma;
}

// El protagonista de la pantalla (DESIGN §8.2.1). RN-001 exige que los
// ponderadores de un funcionario sumen 100%, y descubrir el desajuste recién al
// guardar es el fallo de la planilla que venimos a reemplazar: aquí la suma se
// ve en todo momento.
//
// Accesibilidad: `role="status"` y no `alert`, porque esto cambia con cada
// tecla — un alert interrumpiría la lectura constantemente (DESIGN §8.2.10).
// El estado se dice con TEXTO además del color y del ancho de la barra.
export function TotalizadorMetas({ suma }: Props) {
  // La barra se recorta al 100% para que "se pasa" no desborde la caja; la
  // cifra y el texto siguen diciendo la verdad.
  const ancho = Math.min(100, Math.max(0, suma.total));

  return (
    <div className={`metas-total metas-total--${suma.estado}`}>
      <div className="metas-total-cifras">
        <span className="metas-total-etiqueta">Suma de ponderadores</span>
        <span className="metas-total-valor">{fmt(suma.total)}%</span>
      </div>

      <div className="metas-total-barra" aria-hidden="true">
        <div className="metas-total-relleno" style={{ width: `${ancho}%` }} />
      </div>

      <p className="metas-total-mensaje" role="status">
        {suma.estado === "cuadrado" ? "✓ " : ""}
        {suma.mensaje}
        {suma.estado !== "cuadrado" && (
          <span className="metas-total-regla"> · los ponderadores deben sumar 100% (RN-001)</span>
        )}
      </p>
    </div>
  );
}
