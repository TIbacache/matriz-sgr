import { Check, MessageSquareWarning, X } from "lucide-react";
import type { DecisionValidacion } from "../../lib/types";

interface Props {
  observacion: string;
  onObservacion: (texto: string) => void;
  onDecidir: (decision: DecisionValidacion) => void;
  enviando: boolean;
  error: string | null;
}

// Las TRES decisiones de RF-013, explícitas y equidistantes (DESIGN §8.2).
// No hay una acción escondida en un menú: rechazar es tan legítimo como
// aprobar y debe costar lo mismo.
//
// La observación es obligatoria cuando no se aprueba (CA-02): el funcionario
// tiene que saber qué corregir. El backend lo exige igual; aquí se avisa antes
// para no gastar un viaje al servidor.
export function AccionesValidacion({ observacion, onObservacion, onDecidir, enviando, error }: Props) {
  return (
    <div className="bandeja-acciones">
      <label className="etiqueta" htmlFor="bv-observacion">
        Observación (obligatoria si no apruebas)
      </label>
      <textarea
        id="bv-observacion"
        className="campo bandeja-observacion"
        value={observacion}
        onChange={(e) => onObservacion(e.target.value)}
        rows={2}
        maxLength={1000}
        placeholder="Qué debe corregirse y por qué"
      />

      {error && (
        <p className="bandeja-error" role="alert">
          {error}
        </p>
      )}

      <div className="bandeja-botones">
        <button
          type="button"
          className="btn-primario bandeja-boton"
          onClick={() => onDecidir("aprobada")}
          disabled={enviando}
        >
          <Check size={16} strokeWidth={1.5} aria-hidden="true" /> Aprobar
        </button>
        <button
          type="button"
          className="btn-secundario bandeja-boton"
          onClick={() => onDecidir("correccion_solicitada")}
          disabled={enviando}
        >
          <MessageSquareWarning size={16} strokeWidth={1.5} aria-hidden="true" /> Solicitar corrección
        </button>
        <button
          type="button"
          className="btn-peligro bandeja-boton"
          onClick={() => onDecidir("rechazada")}
          disabled={enviando}
        >
          <X size={16} strokeWidth={1.5} aria-hidden="true" /> Rechazar
        </button>
      </div>

      <p className="bandeja-ayuda-teclado">
        Teclado: <kbd>J</kbd> siguiente · <kbd>K</kbd> anterior · <kbd>Enter</kbd> aprobar
      </p>
    </div>
  );
}
