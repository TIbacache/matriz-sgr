import { useEffect, useMemo, useState, type FormEvent } from "react";
import { api, ApiError } from "../../lib/api";
import type { Actividad, AtencionSocial, CatalogoItem } from "../../lib/types";
import { fechaCl } from "../../lib/ficha";
import "../modal.css";
import "./caso-social.css";

interface Props {
  actividad: Actividad;
  /** false en período cerrado o sin permiso: el caso se lee, no se avanza. */
  puedeGestionar: boolean;
  onCerrar: () => void;
  onCambiado: (actividadId: string, atencion: AtencionSocial) => void;
}

// Caso social y sus hasta 3 gestiones — RF-015 · CA-04 · HU-03.
//
// Es lo que la planilla del cliente tiene desplegado a lo ancho en la pestaña
// SOCIAL: tipo, sub-atención, y tres bloques de gestión con sus fechas. Aquí va
// en modal y no en la fila porque el registro diario es una tabla densa a
// propósito (DESIGN §8.2) y meterle catorce columnas más la volvería ilegible;
// el caso social, en cambio, es infrecuente y se mira de a uno.
//
// La decisión de diseño que importa: **la pantalla no elige qué gestión es**.
// Manda la que toca y el servidor la coloca. Por eso aquí no hay un selector
// de "número de gestión" —sería una forma de dejar que el usuario rompa la
// secuencia que CA-04 pide demostrar— sino un solo formulario que cambia de
// campos según en qué etapa va el caso.
export function ModalCasoSocial({ actividad, puedeGestionar, onCerrar, onCambiado }: Props) {
  const atencion = actividad.atencionSocial ?? null;

  const [tipos, setTipos] = useState<string[]>([]);
  const [subs, setSubs] = useState<string[]>([]);
  const [gestiones, setGestiones] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  // Alta del caso
  const [tipoAtencion, setTipoAtencion] = useState("");
  const [subAtencion, setSubAtencion] = useState("");
  const [requiereVisita, setRequiereVisita] = useState(false);

  // Gestión que se está registrando
  const [gestion, setGestion] = useState("");
  const [observacion, setObservacion] = useState("");
  const [fechaProgramadaVisita, setFechaProgramadaVisita] = useState("");
  const [fechaVisita, setFechaVisita] = useState("");
  const [fechaEntregaInforme, setFechaEntregaInforme] = useState("");
  const [fechaEntregaBeneficio, setFechaEntregaBeneficio] = useState("");

  const siguiente = atencion?.siguienteGestion ?? 1;

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCerrar();
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [onCerrar]);

  // Los desplegables salen del catálogo (RF-004), nunca de una lista aquí.
  // El de gestiones depende de la etapa: la tercera no ofrece "visita terreno".
  useEffect(() => {
    const catalogoGestion = `gestion_${siguiente}`;
    Promise.all([
      atencion ? Promise.resolve<CatalogoItem[]>([]) : api.get<CatalogoItem[]>("/catalogos?catalogo=tipo_atencion"),
      atencion ? Promise.resolve<CatalogoItem[]>([]) : api.get<CatalogoItem[]>("/catalogos?catalogo=sub_atencion"),
      api.get<CatalogoItem[]>(`/catalogos?catalogo=${catalogoGestion}`),
    ])
      .then(([t, s, g]) => {
        setTipos(t.map((x) => x.valor));
        setSubs(s.map((x) => x.valor));
        setGestiones(g.map((x) => x.valor));
        if (!atencion) setTipoAtencion((actual) => actual || (t[0]?.valor ?? ""));
        setGestion((actual) => actual || (g[0]?.valor ?? ""));
      })
      .catch(() => setError("No se pudieron cargar los catálogos"));
  }, [atencion, siguiente]);

  const vecino = useMemo(() => {
    const p = actividad.personaUsuaria;
    if (!p) return null;
    return `${p.nombres} ${p.apellidoPaterno}${p.rut ? ` · ${p.rut}` : ""}`;
  }, [actividad.personaUsuaria]);

  const abrirCaso = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setGuardando(true);
    try {
      const creada = await api.post<AtencionSocial>(`/actividades/${actividad.id}/atencion-social`, {
        tipoAtencion,
        subAtencion: subAtencion || null,
        requiereVisita,
      });
      onCambiado(actividad.id, creada);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo abrir el caso social");
    } finally {
      setGuardando(false);
    }
  };

  const avanzar = async (e: FormEvent) => {
    e.preventDefault();
    if (!atencion) return;
    setError(null);
    setGuardando(true);
    try {
      // Solo viajan las fechas de ESTA gestión: el servidor rechaza las demás
      // y tiene razón — una fecha en el casillero equivocado es un dato falso.
      const cuerpo: Record<string, unknown> = {
        gestion,
        version: atencion.version,
        ...(observacion ? { observacion } : {}),
      };
      if (siguiente === 1 && fechaProgramadaVisita) cuerpo.fechaProgramadaVisita = fechaProgramadaVisita;
      if (siguiente === 2) {
        if (fechaVisita) cuerpo.fechaVisita = fechaVisita;
        if (fechaEntregaInforme) cuerpo.fechaEntregaInforme = fechaEntregaInforme;
      }
      if (siguiente === 3 && fechaEntregaBeneficio) cuerpo.fechaEntregaBeneficio = fechaEntregaBeneficio;

      const avanzada = await api.post<AtencionSocial>(
        `/atenciones-sociales/${atencion.id}/gestiones`,
        cuerpo
      );
      onCambiado(actividad.id, avanzada);
      setObservacion("");
      setFechaProgramadaVisita("");
      setFechaVisita("");
      setFechaEntregaInforme("");
      setFechaEntregaBeneficio("");
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setError(
          "Otra persona avanzó este caso mientras lo mirabas. Ciérralo y vuelve a abrirlo para ver " +
            "en qué gestión va: tu registro no se guardó."
        );
      } else {
        setError(err instanceof Error ? err.message : "No se pudo registrar la gestión");
      }
    } finally {
      setGuardando(false);
    }
  };

  const fechaDeGestion = (g: AtencionSocial["gestiones"][number]) =>
    g.fechaEntregaBeneficio ?? g.fechaEntregaInforme ?? g.fechaVisita ?? g.fechaProgramadaVisita ?? null;

  return (
    <div className="modal-fondo" onClick={onCerrar} role="presentation">
      <div
        className="card modal modal--ancho entrada"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Caso social"
      >
        <h3 className="modal-titulo">Caso social</h3>
        <p className="modal-sub">
          {actividad.codigo}
          {vecino ? ` · ${vecino}` : ""} · {fechaCl(actividad.fecha)}
        </p>

        {atencion ? (
          <>
            <dl className="caso-cabecera">
              <div>
                <dt>Tipo de atención</dt>
                <dd>{atencion.tipoAtencion}</dd>
              </div>
              <div>
                <dt>Sub-atención</dt>
                <dd>{atencion.subAtencion ?? "—"}</dd>
              </div>
              <div>
                <dt>Requiere visita</dt>
                <dd>{atencion.requiereVisita ? "Sí" : "No"}</dd>
              </div>
            </dl>

            {/* El avance como escalera de tres peldaños: se ve de un vistazo
                en cuál va y cuántos quedan, que es lo que pide CA-04. */}
            <ol className="caso-escalera" aria-label="Avance de las gestiones">
              {([1, 2, 3] as const).map((n) => {
                const hecha = atencion.gestiones.find((g) => g.numero === n);
                const esSiguiente = atencion.siguienteGestion === n;
                return (
                  <li
                    key={n}
                    className={[
                      "caso-peldano",
                      hecha ? "caso-peldano--hecha" : "",
                      esSiguiente ? "caso-peldano--siguiente" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <span className="caso-peldano-num" aria-hidden="true">
                      {hecha ? "✓" : n}
                    </span>
                    <span className="caso-peldano-texto">
                      <strong>Gestión {n}</strong>
                      <span className="caso-peldano-valor">
                        {hecha ? hecha.valor : esSiguiente ? "Es la que toca registrar" : "Pendiente"}
                      </span>
                      {hecha && fechaDeGestion(hecha) && (
                        <span className="caso-peldano-fecha tnum">{fechaCl(fechaDeGestion(hecha)!)}</span>
                      )}
                    </span>
                  </li>
                );
              })}
            </ol>

            {atencion.observacion && (
              <p className="caso-observacion">
                {atencion.observacion.split("\n").map((linea, i) => (
                  <span key={i}>{linea}</span>
                ))}
              </p>
            )}

            {atencion.estado === "cerrada" ? (
              <p className="caso-cerrado" role="note">
                El caso tiene sus tres gestiones registradas. RF-015 no admite una cuarta: si el
                vecino vuelve, se registra una actividad nueva y su propio caso.
              </p>
            ) : (
              puedeGestionar && (
                <form className="caso-form" onSubmit={avanzar}>
                  <h4 className="caso-form-titulo">Registrar la gestión {siguiente}</h4>

                  <label className="etiqueta" htmlFor="cs-gestion">
                    Gestión *
                  </label>
                  <select
                    id="cs-gestion"
                    className="campo"
                    value={gestion}
                    onChange={(e) => setGestion(e.target.value)}
                    required
                  >
                    {gestiones.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>

                  {siguiente === 1 && (
                    <>
                      <label className="etiqueta" htmlFor="cs-programada">
                        Fecha programada de visita
                      </label>
                      <input
                        id="cs-programada"
                        className="campo"
                        type="date"
                        value={fechaProgramadaVisita}
                        onChange={(e) => setFechaProgramadaVisita(e.target.value)}
                      />
                    </>
                  )}

                  {siguiente === 2 && (
                    <div className="modal-fila">
                      <div>
                        <label className="etiqueta" htmlFor="cs-visita">
                          Fecha de visita
                        </label>
                        <input
                          id="cs-visita"
                          className="campo"
                          type="date"
                          value={fechaVisita}
                          onChange={(e) => setFechaVisita(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="etiqueta" htmlFor="cs-informe">
                          Fecha entrega informe
                        </label>
                        <input
                          id="cs-informe"
                          className="campo"
                          type="date"
                          value={fechaEntregaInforme}
                          onChange={(e) => setFechaEntregaInforme(e.target.value)}
                        />
                      </div>
                    </div>
                  )}

                  {siguiente === 3 && (
                    <>
                      <label className="etiqueta" htmlFor="cs-beneficio">
                        Fecha entrega beneficio
                      </label>
                      <input
                        id="cs-beneficio"
                        className="campo"
                        type="date"
                        value={fechaEntregaBeneficio}
                        onChange={(e) => setFechaEntregaBeneficio(e.target.value)}
                      />
                    </>
                  )}

                  <label className="etiqueta" htmlFor="cs-obs">
                    Observación
                  </label>
                  <textarea
                    id="cs-obs"
                    className="campo modal-textarea"
                    rows={2}
                    maxLength={1000}
                    value={observacion}
                    onChange={(e) => setObservacion(e.target.value)}
                    placeholder="Se anexa a lo ya escrito; no reemplaza el relato anterior."
                  />

                  {error && <p className="modal-error" role="alert">{error}</p>}

                  <div className="modal-acciones">
                    <button type="button" className="btn-secundario" onClick={onCerrar}>
                      Cerrar
                    </button>
                    <button type="submit" className="btn-primario" disabled={guardando || !gestion}>
                      {guardando ? "Registrando…" : `Registrar gestión ${siguiente}`}
                    </button>
                  </div>
                </form>
              )
            )}
          </>
        ) : (
          <form className="caso-form" onSubmit={abrirCaso}>
            <p className="caso-intro">
              Esta actividad todavía no tiene caso social. Al abrirlo podrás registrar hasta tres
              gestiones y su secuencia quedará consultable desde la ficha del vecino, incluso si lo
              atienden en otra delegación.
            </p>

            <label className="etiqueta" htmlFor="cs-tipo">
              Tipo de atención *
            </label>
            <select
              id="cs-tipo"
              className="campo"
              value={tipoAtencion}
              onChange={(e) => setTipoAtencion(e.target.value)}
              required
            >
              {tipos.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>

            <label className="etiqueta" htmlFor="cs-sub">
              Sub-atención
            </label>
            <select
              id="cs-sub"
              className="campo"
              value={subAtencion}
              onChange={(e) => setSubAtencion(e.target.value)}
            >
              <option value="">Sin especificar</option>
              {subs.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>

            <label className="caso-check">
              <input
                type="checkbox"
                checked={requiereVisita}
                onChange={(e) => setRequiereVisita(e.target.checked)}
              />
              Requiere visita en terreno
            </label>

            {error && <p className="modal-error" role="alert">{error}</p>}

            <div className="modal-acciones">
              <button type="button" className="btn-secundario" onClick={onCerrar}>
                Cancelar
              </button>
              <button
                type="submit"
                className="btn-primario"
                disabled={guardando || !tipoAtencion || !puedeGestionar}
              >
                {guardando ? "Abriendo…" : "Abrir caso social"}
              </button>
            </div>
          </form>
        )}

        {atencion && (atencion.estado === "cerrada" || !puedeGestionar) && (
          <div className="modal-acciones">
            <button type="button" className="btn-secundario" onClick={onCerrar}>
              Cerrar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
