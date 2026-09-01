import { useEffect, useState, type FormEvent } from "react";
import { api } from "../../lib/api";
import type { Actividad } from "../../lib/types";
import "../modal.css";

interface Props {
  actividad: Actividad;
  onCerrar: () => void;
  onAnulada: (actividad: Actividad) => void;
}

// Anulación con motivo (ADR-006). El cliente lo pidió con estas palabras:
// "cuando la persona hace algún ingreso, después no pueda borrarlo". No se
// borra nada: la actividad queda en el historial, deja de sumar y el motivo
// queda en la bitácora inmutable.
//
// Es de las pocas acciones que sí merecen modal: es infrecuente, irreversible
// y necesita que la persona escriba por qué.
export function ModalAnular({ actividad, onCerrar, onAnulada }: Props) {
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCerrar();
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [onCerrar]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setGuardando(true);
    try {
      // `version` es el bloqueo optimista (ADR-005): si alguien más tocó esta
      // actividad mientras tanto, el backend responde 409 y no sobrescribe.
      const anulada = await api.post<Actividad>(`/actividades/${actividad.id}/anulacion`, {
        version: actividad.version,
        motivo,
      });
      onAnulada(anulada);
      onCerrar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo anular la actividad");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="modal-fondo" onClick={onCerrar} role="presentation">
      <form
        className="card modal entrada"
        onClick={(e) => e.stopPropagation()}
        onSubmit={onSubmit}
        aria-label="Anular actividad"
      >
        <h3 className="modal-titulo">Anular actividad</h3>
        <p className="modal-sub">
          <span className="tnum">{actividad.codigo}</span> · {actividad.descripcion}
        </p>
        <p className="ficha-aviso" role="note">
          La actividad no se borra: queda registrada como anulada, deja de sumar al avance y el
          motivo se guarda en la auditoría. Para corregir un dato, anula y registra una nueva.
        </p>

        <label className="etiqueta" htmlFor="an-motivo">
          Motivo * (mínimo 5 caracteres)
        </label>
        <textarea
          id="an-motivo"
          className="campo modal-textarea"
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          minLength={5}
          maxLength={500}
          rows={3}
          required
          aria-required="true"
          autoFocus
        />

        {error && (
          <p className="modal-error" role="alert">
            {error}
          </p>
        )}

        <div className="modal-acciones">
          <button type="button" className="btn-secundario" onClick={onCerrar}>
            Cancelar
          </button>
          <button type="submit" className="btn-peligro" disabled={guardando || motivo.trim().length < 5}>
            {guardando ? "Anulando…" : "Anular"}
          </button>
        </div>
      </form>
    </div>
  );
}
