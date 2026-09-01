import { useState, type FormEvent } from "react";
import { api } from "../../lib/api";
import type { Actividad, CumplimientoItem, CumplimientoRespuesta } from "../../lib/types";
import { fechaCl, hoyDelServidor, telefonoValido } from "../../lib/ficha";

interface Props {
  periodo: CumplimientoRespuesta["periodo"];
  items: CumplimientoItem[];
  funcionarioId: string;
  /** false cuando se mira la ficha de otra persona sin permiso para registrar por ella */
  puedeRegistrar: boolean;
  onCreada: (actividad: Actividad) => void;
}

// Bloque 3 de la ficha (DESIGN §8.2): "fila nueva SIEMPRE visible arriba, sin
// abrir modal para lo frecuente". Registrar es lo que estas personas hacen
// varias veces al día; un modal por registro sería un impuesto diario.
//
// El cliente fue explícito: "tenemos un montón de usuarios que no manejan
// planilla" → cada campo lleva su etiqueta visible, los obligatorios se marcan
// con texto (no solo con color) y los errores viven junto al campo.
export function FilaNuevaActividad({ periodo, items, funcionarioId, puedeRegistrar, onCreada }: Props) {
  const hoy = hoyDelServidor(periodo);
  const [fecha, setFecha] = useState(hoy);
  const [itemId, setItemId] = useState(items[0]?.itemId ?? "");
  const [descripcion, setDescripcion] = useState("");
  const [accion, setAccion] = useState("");
  const [contactoNombre, setContactoNombre] = useState("");
  const [contactoFono, setContactoFono] = useState("");
  const [ingresoATubo, setIngresoATubo] = useState(false);
  const [errorFono, setErrorFono] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const limpiar = () => {
    setDescripcion("");
    setAccion("");
    setContactoNombre("");
    setContactoFono("");
    setIngresoATubo(false);
    setErrorFono(null);
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setExito(null);
    if (contactoFono && !telefonoValido(contactoFono)) {
      setErrorFono("Teléfono chileno no válido: 9 dígitos, por ejemplo 9 1234 5678.");
      return;
    }
    setGuardando(true);
    try {
      const actividad = await api.post<Actividad>("/actividades", {
        periodoId: periodo.id,
        funcionarioId,
        fecha,
        itemId: itemId || null,
        descripcion,
        accion: accion || null,
        contactoNombre: contactoNombre || null,
        contactoFono: contactoFono || null,
        ingresoATubo,
      });
      onCreada(actividad);
      setExito(`Registrada con el código ${actividad.codigo}. Ahora sube su evidencia.`);
      limpiar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo registrar la actividad");
    } finally {
      setGuardando(false);
    }
  };

  if (!puedeRegistrar) return null;

  return (
    <form className="ficha-nueva" onSubmit={onSubmit} aria-label="Registrar actividad">
      <div className="ficha-nueva-campos">
        <div className="ficha-campo ficha-campo--fecha">
          <label className="etiqueta" htmlFor="na-fecha">
            Fecha *
          </label>
          <input
            id="na-fecha"
            className="campo"
            type="date"
            value={fecha}
            min={periodo.fechaInicio}
            max={periodo.fechaTermino}
            onChange={(e) => setFecha(e.target.value)}
            required
            aria-required="true"
            aria-describedby="na-fecha-ayuda"
          />
          <span id="na-fecha-ayuda" className="ficha-ayuda">
            Dentro del período ({fechaCl(periodo.fechaInicio)} a {fechaCl(periodo.fechaTermino)})
          </span>
        </div>

        <div className="ficha-campo ficha-campo--item">
          <label className="etiqueta" htmlFor="na-item">
            Ítem que suma
          </label>
          <select
            id="na-item"
            className="campo"
            value={itemId}
            onChange={(e) => setItemId(e.target.value)}
          >
            <option value="">Sin ítem (no suma al avance)</option>
            {items.map((i) => (
              <option key={i.itemId} value={i.itemId}>
                {i.itemNombre}
              </option>
            ))}
          </select>
        </div>

        <div className="ficha-campo ficha-campo--ancho">
          <label className="etiqueta" htmlFor="na-desc">
            Actividad o solicitud *
          </label>
          <input
            id="na-desc"
            className="campo"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            maxLength={1000}
            minLength={3}
            required
            aria-required="true"
            placeholder="Qué se solicitó o qué se hizo"
          />
        </div>

        <div className="ficha-campo ficha-campo--ancho">
          <label className="etiqueta" htmlFor="na-accion">
            Acción ejecutada
          </label>
          <input
            id="na-accion"
            className="campo"
            value={accion}
            onChange={(e) => setAccion(e.target.value)}
            maxLength={1000}
            placeholder="Cómo se resolvió o derivó"
          />
        </div>

        <div className="ficha-campo">
          <label className="etiqueta" htmlFor="na-contacto">
            Contacto
          </label>
          <input
            id="na-contacto"
            className="campo"
            value={contactoNombre}
            onChange={(e) => setContactoNombre(e.target.value)}
            maxLength={160}
            placeholder="Nombre de quien solicita"
          />
        </div>

        <div className="ficha-campo">
          <label className="etiqueta" htmlFor="na-fono">
            Teléfono
          </label>
          <input
            id="na-fono"
            className="campo"
            value={contactoFono}
            onChange={(e) => {
              setContactoFono(e.target.value);
              if (errorFono) setErrorFono(null);
            }}
            /* Se valida al SALIR del campo, no al enviar (DESIGN §8.2) */
            onBlur={(e) =>
              setErrorFono(
                e.target.value && !telefonoValido(e.target.value)
                  ? "Teléfono chileno no válido: 9 dígitos, por ejemplo 9 1234 5678."
                  : null
              )
            }
            maxLength={20}
            inputMode="tel"
            placeholder="9 1234 5678"
            aria-invalid={errorFono ? true : undefined}
            aria-describedby={errorFono ? "na-fono-error" : undefined}
          />
          {errorFono && (
            <span id="na-fono-error" className="ficha-error-campo" role="alert">
              {errorFono}
            </span>
          )}
        </div>

        <div className="ficha-campo ficha-campo--check">
          <label className="ficha-check" htmlFor="na-tubo">
            <input
              id="na-tubo"
              type="checkbox"
              checked={ingresoATubo}
              onChange={(e) => setIngresoATubo(e.target.checked)}
            />
            Ingresó al tubo
          </label>
        </div>

        <div className="ficha-campo ficha-campo--accion">
          <button
            type="submit"
            className="btn-primario"
            disabled={guardando || descripcion.trim().length < 3}
          >
            {guardando ? "Registrando…" : "Registrar"}
          </button>
        </div>
      </div>

      {error && (
        <p className="ficha-error" role="alert">
          {error}
        </p>
      )}
      {exito && <p className="ficha-exito">{exito}</p>}
    </form>
  );
}
