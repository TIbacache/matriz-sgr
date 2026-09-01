import { useEffect, useState } from "react";
import { obtenerBlob } from "../../lib/api";
import type { Actividad, Evidencia } from "../../lib/types";
import { fechaCl, mb } from "../../lib/ficha";
import "../modal.css";

interface Props {
  actividad: Actividad;
  evidencia: Evidencia;
  onCerrar: () => void;
}

// Ver la evidencia (RF-012 · RNF-017). El archivo NO se enlaza con un `src`
// directo porque el endpoint exige el token: se descarga con fetch y se
// muestra desde un object URL, que se revoca al cerrar.
//
// El `alt` describe código + actividad, como exige DESIGN §8.2 / RNF-012: una
// foto sin texto alternativo deja fuera a quien usa lector de pantalla.
export function VistaEvidencia({ actividad, evidencia, onCerrar }: Props) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;
    let vigente = true;
    obtenerBlob(`/evidencias/${evidencia.id}/archivo`)
      .then((blob) => {
        if (!vigente) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "No se pudo abrir la evidencia"));
    return () => {
      vigente = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [evidencia.id]);

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCerrar();
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [onCerrar]);

  const esImagen = evidencia.mimeType.startsWith("image/");

  return (
    <div className="modal-fondo" onClick={onCerrar} role="presentation">
      <div
        className="card modal modal--ancho entrada"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`Evidencia de ${actividad.codigo}`}
      >
        <h3 className="modal-titulo tnum">{actividad.codigo}</h3>
        <p className="modal-sub">
          {actividad.descripcion} · {fechaCl(actividad.fecha)} · {mb(evidencia.tamanoBytes)}
        </p>

        {error && <p className="modal-error">{error}</p>}
        {!url && !error && <div className="skeleton ficha-evidencia-carga" aria-hidden="true" />}
        {url &&
          (esImagen ? (
            <img
              className="ficha-evidencia-imagen"
              src={url}
              alt={`Evidencia ${actividad.codigo}: ${actividad.descripcion}`}
            />
          ) : (
            <p className="ficha-evidencia-otro">
              El archivo es {evidencia.mimeType}.{" "}
              <a href={url} target="_blank" rel="noreferrer">
                Abrir en una pestaña nueva
              </a>
            </p>
          ))}

        <div className="modal-acciones">
          <button type="button" className="btn-secundario" onClick={onCerrar} autoFocus>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
