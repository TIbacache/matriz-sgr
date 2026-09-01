import type { EvidenciaEnBandeja } from "../../lib/types";
import { fechaCl, mb } from "../../lib/ficha";
import { useArchivoEvidencia } from "../../lib/useArchivoEvidencia";
import { ChipSemaforo } from "../ChipSemaforo";

interface Props {
  evidencia: EvidenciaEnBandeja;
}

const TEXTO_DECISION: Record<string, { texto: string; semaforo: "verde" | "naranjo" | "rojo" | null }> = {
  aprobada: { texto: "Aprobada", semaforo: "verde" },
  rechazada: { texto: "Rechazada", semaforo: "rojo" },
  correccion_solicitada: { texto: "Corrección solicitada", semaforo: "rojo" },
  pendiente: { texto: "Pendiente", semaforo: "naranjo" },
};

// La foto GRANDE (DESIGN §8.2): la decisión se toma mirando la imagen, así que
// la imagen manda el espacio y los datos la acompañan.
//
// El historial de decisiones previas está a la vista porque el ciclo real es
// "solicitar corrección → sube otra foto → revisar de nuevo": sin ver qué se
// pidió antes, el verificador no puede juzgar si se corrigió.
export function DetalleEvidencia({ evidencia }: Props) {
  const { url, cargando, error } = useArchivoEvidencia(evidencia.id);
  const a = evidencia.actividad;
  const esImagen = evidencia.mimeType.startsWith("image/");

  return (
    <div className="bandeja-detalle">
      <div className="bandeja-foto">
        {cargando && <div className="skeleton bandeja-foto-carga" aria-hidden="true" />}
        {error && <p className="bandeja-error">{error}</p>}
        {url &&
          (esImagen ? (
            <img
              className="bandeja-imagen"
              src={url}
              alt={`Evidencia ${a.codigo}: ${a.descripcion}`}
            />
          ) : (
            <p className="bandeja-otro-formato">
              El archivo es {evidencia.mimeType}.{" "}
              <a href={url} target="_blank" rel="noreferrer">
                Abrirlo en una pestaña nueva
              </a>{" "}
              para revisarlo.
            </p>
          ))}
      </div>

      <dl className="bandeja-datos">
        <div>
          <dt>Código</dt>
          <dd className="tnum">{a.codigo}</dd>
        </div>
        <div>
          <dt>Funcionario</dt>
          <dd>{a.funcionario.nombre}</dd>
        </div>
        <div>
          <dt>Delegación</dt>
          <dd>{a.unidad.nombre}</dd>
        </div>
        <div>
          <dt>Fecha</dt>
          <dd className="tnum">{fechaCl(a.fecha)}</dd>
        </div>
        <div>
          <dt>Ítem que suma</dt>
          <dd>{a.item?.nombre ?? "Sin ítem"}</dd>
        </div>
        <div>
          <dt>Archivo</dt>
          <dd>
            {evidencia.mimeType} · {mb(evidencia.tamanoBytes)}
          </dd>
        </div>
      </dl>

      <p className="bandeja-descripcion">{a.descripcion}</p>

      {evidencia.validaciones.length > 0 && (
        <div className="bandeja-historial">
          <h4 className="bandeja-historial-titulo">Revisiones anteriores</h4>
          <ul>
            {evidencia.validaciones.map((v) => {
              const d = TEXTO_DECISION[v.decision] ?? { texto: v.decision, semaforo: null };
              return (
                <li key={v.id}>
                  <ChipSemaforo semaforo={d.semaforo} texto={d.texto} />
                  <span className="bandeja-historial-meta">
                    {v.verificador.nombre}
                    {v.decididaEn ? ` · ${fechaCl(v.decididaEn)}` : ""}
                  </span>
                  {v.observacion && <p className="bandeja-historial-obs">{v.observacion}</p>}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
