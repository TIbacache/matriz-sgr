import { useState, type ChangeEvent } from "react";
import { Ban, Camera, Image as ImagenIcono } from "lucide-react";
import { subirArchivo } from "../../lib/api";
import type { Actividad, Evidencia } from "../../lib/types";
import { PRESENTACION_ESTADO, estadoDeActividad, fechaCl, mb, ultimaObservacion } from "../../lib/ficha";
import { ChipSemaforo } from "../ChipSemaforo";

interface Props {
  actividades: Actividad[];
  /** Tipos MIME aceptados: salen del catálogo del backend, no de una constante */
  formatos: string[];
  tamanoMaxMb: number;
  puedeGestionar: boolean;
  onEvidenciaSubida: (actividadId: string, evidencia: Evidencia) => void;
  onVerEvidencia: (actividad: Actividad, evidencia: Evidencia) => void;
  onAnular: (actividad: Actividad) => void;
  onError: (mensaje: string) => void;
}

// El registro diario. Tabla densa a propósito: es la pantalla que estas
// personas miran todo el día, y la planilla que reemplaza también lo es.
//
// La columna de estado usa el par color+símbolo de siempre (nunca solo color)
// y explica en texto qué significa: "En revisión" no suma, "Validada" sí. Es
// la regla más importante del sistema (RN-009) y tiene que verse.
export function TablaActividades({
  actividades,
  formatos,
  tamanoMaxMb,
  puedeGestionar,
  onEvidenciaSubida,
  onVerEvidencia,
  onAnular,
  onError,
}: Props) {
  const [subiendo, setSubiendo] = useState<string | null>(null);

  const onArchivo = async (actividad: Actividad, e: ChangeEvent<HTMLInputElement>) => {
    const archivo = e.target.files?.[0];
    e.target.value = ""; // permite volver a elegir el mismo archivo tras un error
    if (!archivo) return;

    // Se avisa ANTES de enviar (DESIGN §8.2): que el límite se descubra en el
    // error del servidor es una mala experiencia con datos móviles.
    if (formatos.length > 0 && !formatos.includes(archivo.type)) {
      onError(`Formato no aceptado (${archivo.type || "desconocido"}). Se aceptan: ${formatos.join(", ")}.`);
      return;
    }
    if (archivo.size > tamanoMaxMb * 1024 * 1024) {
      onError(`La evidencia pesa ${mb(archivo.size)} y el máximo es ${tamanoMaxMb} MB.`);
      return;
    }

    setSubiendo(actividad.id);
    try {
      const evidencia = await subirArchivo<Evidencia>(`/actividades/${actividad.id}/evidencias`, archivo);
      onEvidenciaSubida(actividad.id, { ...evidencia, validaciones: [] });
    } catch (err) {
      onError(err instanceof Error ? err.message : "No se pudo subir la evidencia");
    } finally {
      setSubiendo(null);
    }
  };

  if (actividades.length === 0) {
    return (
      <p className="vacio">
        Todavía no hay actividades registradas en este período. Usa la fila de arriba para
        registrar la primera.
      </p>
    );
  }

  return (
    <div className="tabla-envoltura">
      <table className="tabla-sgr tabla-sgr--densa">
        <thead>
          <tr>
            <th scope="col">Fecha</th>
            <th scope="col">Código</th>
            <th scope="col">Ítem</th>
            <th scope="col">Actividad</th>
            <th scope="col">Estado</th>
            <th scope="col">Evidencia</th>
          </tr>
        </thead>
        <tbody>
          {actividades.map((a) => {
            const estado = estadoDeActividad(a);
            const presentacion = PRESENTACION_ESTADO[estado];
            const observacion = ultimaObservacion(a);
            const evidencia = a.evidencias[a.evidencias.length - 1];
            const puedeSubir = puedeGestionar && !a.anulada;

            return (
              <tr key={a.id} className={a.anulada ? "ficha-fila--anulada" : undefined}>
                <td className="tnum">{fechaCl(a.fecha)}</td>
                <td className="tnum ficha-codigo">{a.codigo}</td>
                <td>{a.item?.nombre ?? <span className="ficha-sin-item">Sin ítem</span>}</td>
                <td>
                  {a.descripcion}
                  {a.accion && <span className="ficha-accion"> · {a.accion}</span>}
                  {a.contactoNombre && (
                    <span className="ficha-contacto">
                      {" "}
                      · {a.contactoNombre}
                      {a.contactoFono ? ` (${a.contactoFono})` : ""}
                    </span>
                  )}
                  {a.anulada && a.motivoAnulacion && (
                    <span className="ficha-motivo"> · Anulada: {a.motivoAnulacion}</span>
                  )}
                </td>
                <td>
                  <ChipSemaforo
                    semaforo={presentacion.semaforo}
                    texto={presentacion.texto}
                    ayuda={presentacion.ayuda}
                  />
                  {observacion && <span className="ficha-observacion">{observacion}</span>}
                </td>
                <td>
                  <div className="ficha-acciones">
                    {evidencia && (
                      <button
                        type="button"
                        className="btn-tabla"
                        onClick={() => onVerEvidencia(a, evidencia)}
                      >
                        <ImagenIcono size={14} strokeWidth={1.5} aria-hidden="true" /> Ver
                      </button>
                    )}
                    {puedeSubir && (
                      <label className="btn-tabla btn-archivo">
                        <Camera size={14} strokeWidth={1.5} aria-hidden="true" />
                        {subiendo === a.id ? "Subiendo…" : evidencia ? "Otra" : "Subir"}
                        <input
                          className="sr-only"
                          type="file"
                          accept={formatos.join(",")}
                          capture="environment"
                          disabled={subiendo === a.id}
                          onChange={(e) => onArchivo(a, e)}
                          aria-label={`Subir evidencia de ${a.codigo}`}
                        />
                      </label>
                    )}
                    {puedeGestionar && !a.anulada && (
                      <button
                        type="button"
                        className="btn-tabla btn-tabla--peligro"
                        onClick={() => onAnular(a)}
                      >
                        <Ban size={14} strokeWidth={1.5} aria-hidden="true" /> Anular
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
