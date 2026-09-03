import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, ShieldAlert, Lock, Pencil, X, HeartHandshake } from "lucide-react";
import { api, ApiError } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/Toast";
import {
  hechosEnAviso,
  estadoLegible,
  fechaCorta,
  porDelegacion,
  ROLES_FICHA_VECINO,
  type BusquedaVecinos,
  type FichaVecino,
} from "../lib/vecinos";
import "./vecinos.css";

// Ficha del vecino — ADR-008 · ADR-012 · CA-04 · RF-032 · HU-03 · HU-29.
//
// La pantalla que el cliente vino a buscar: el niño que pidió el mismo regalo
// de Navidad en cinco delegaciones. Tres piezas y ninguna decorativa
// (DESIGN §8.2 «Ficha del vecino y trazabilidad»):
//
//   1. Buscador por RUT o nombre arriba, con resultado inmediato.
//   2. Línea de tiempo vertical que CRUZA delegaciones, diciendo la de cada
//      atención. Ese cruce es todo el punto: sin él la duplicidad es invisible.
//   3. Aviso ámbar explícito cuando hay atenciones del mismo tipo en distintas
//      delegaciones dentro de la ventana configurable. **Informa; no bloquea ni
//      acusa** — que dos delegaciones atiendan a la misma persona puede ser
//      perfectamente correcto.
//
// Es además la pantalla con más datos personales del sistema, así que dice en
// voz alta lo que no muestra: una atención de otra delegación aparece con
// fecha, delegación y tipo, y su detalle queda reservado (ADR-012). Una fila
// muda sin explicación se lee como un error del sistema; una fila que dice por
// qué está reservada se lee como lo que es, una regla.

/** Deja de teclear y busca: ni por letra (ruido) ni al presionar Enter (fricción). */
const ESPERA_MS = 250;

export function VecinosPage() {
  const { usuario } = useAuth();
  const { toast, mostrarError } = useToast();
  const [params, setParams] = useSearchParams();

  const puedeVer = ROLES_FICHA_VECINO.includes(usuario?.rol ?? "");

  const [texto, setTexto] = useState(() => params.get("q") ?? "");
  const [resultado, setResultado] = useState<BusquedaVecinos | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [seleccionada, setSeleccionada] = useState<string | null>(() => params.get("id"));
  const [ficha, setFicha] = useState<FichaVecino | null>(null);
  const [cargandoFicha, setCargandoFicha] = useState(false);
  const [editando, setEditando] = useState(false);
  const campoBusqueda = useRef<HTMLInputElement>(null);

  // --- Búsqueda -------------------------------------------------------------
  useEffect(() => {
    if (!puedeVer) return;
    const q = texto.trim();
    if (q.length < 3) {
      setResultado(null);
      return;
    }
    setBuscando(true);
    const id = setTimeout(() => {
      api
        .get<BusquedaVecinos>(`/vecinos?q=${encodeURIComponent(q)}`)
        .then(setResultado)
        .catch((e) => mostrarError(e instanceof Error ? e.message : "Error al buscar"))
        .finally(() => setBuscando(false));
    }, ESPERA_MS);
    return () => clearTimeout(id);
  }, [texto, puedeVer, mostrarError]);

  // Un solo resultado: se abre solo. Es lo que pasa siempre al buscar por RUT,
  // y obligar a un clic extra sobre la única fila posible es fricción pura.
  useEffect(() => {
    if (resultado?.personas.length === 1) setSeleccionada(resultado.personas[0]!.id);
  }, [resultado]);

  // --- Ficha ----------------------------------------------------------------
  const cargarFicha = useCallback(
    (id: string) => {
      setCargandoFicha(true);
      api
        .get<FichaVecino>(`/vecinos/${id}`)
        .then(setFicha)
        .catch((e) => {
          setFicha(null);
          mostrarError(e instanceof Error ? e.message : "Error al abrir la ficha");
        })
        .finally(() => setCargandoFicha(false));
    },
    [mostrarError]
  );

  useEffect(() => {
    if (!puedeVer || !seleccionada) {
      setFicha(null);
      return;
    }
    setEditando(false);
    cargarFicha(seleccionada);
  }, [seleccionada, puedeVer, cargarFicha]);

  // La URL guarda la consulta: un enlace a la ficha de un vecino se puede
  // pegar en un correo interno sin explicar cómo llegar.
  useEffect(() => {
    const siguiente = new URLSearchParams();
    if (texto.trim()) siguiente.set("q", texto.trim());
    if (seleccionada) siguiente.set("id", seleccionada);
    setParams(siguiente, { replace: true });
  }, [texto, seleccionada, setParams]);

  const resaltados = useMemo(() => hechosEnAviso(ficha?.aviso ?? null), [ficha]);
  const porDeleg = useMemo(() => porDelegacion(ficha?.historial ?? []), [ficha]);

  if (!puedeVer) {
    return (
      <div className="vecinos">
        <header className="vecinos-header">
          <div>
            <h1>Ficha del vecino</h1>
            <p className="vecinos-sub">Trazabilidad de la persona atendida entre delegaciones.</p>
          </div>
        </header>
        <div className="vecinos-bloqueo" role="status">
          <Lock size={18} strokeWidth={1.5} aria-hidden="true" />
          <div>
            <strong>Este perfil no accede a la ficha del vecino.</strong>
            <p>
              Contiene datos personales identificados (nombre, RUT, teléfono, dirección) y su uso
              está limitado a quien atiende o supervisa la atención — principio de finalidad y
              mínimo privilegio de las Leyes 19.628 y 21.719. Los tableros e informes agregados
              siguen disponibles en el Dashboard.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="vecinos">
      {toast}
      <header className="vecinos-header">
        <div>
          <h1>Ficha del vecino</h1>
          <p className="vecinos-sub">
            La misma persona puede ser atendida en varias delegaciones. Aquí se ve su historial
            completo, con la delegación de cada atención.
          </p>
        </div>
      </header>

      <div className="vecinos-buscador">
        <label className="etiqueta" htmlFor="vecinos-q">
          Buscar por RUT o nombre
        </label>
        <div className="vecinos-campo">
          <Search size={16} strokeWidth={1.5} aria-hidden="true" />
          <input
            id="vecinos-q"
            ref={campoBusqueda}
            className="campo"
            type="search"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="13.111.222-K  ·  Rosa Maldonado"
            autoComplete="off"
            spellCheck={false}
          />
        </div>
        <p className="vecinos-ayuda">
          El RUT se reconoce escrito como sea: con puntos, sin puntos o sin guion. Desde 3
          caracteres.
        </p>
      </div>

      {texto.trim().length >= 3 && (
        <section className="vecinos-resultados" aria-live="polite">
          {buscando && !resultado && <div className="skeleton" style={{ height: 72 }} />}
          {resultado && resultado.total === 0 && (
            <p className="vacio">
              Nadie con ese {resultado.criterio === "rut" ? "RUT" : "nombre"} en el registro. Si es
              su primera atención, se crea al registrarla en la ficha personal.
            </p>
          )}
          {resultado && resultado.total > 0 && (
            <ul className="vecinos-lista">
              {resultado.personas.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    className={
                      p.id === seleccionada ? "vecinos-item vecinos-item--activo" : "vecinos-item"
                    }
                    onClick={() => setSeleccionada(p.id)}
                    aria-current={p.id === seleccionada}
                  >
                    <span className="vecinos-item-nombre">{p.nombreCompleto}</span>
                    <span className="vecinos-item-rut tnum">{p.rutFormateado || "sin RUT"}</span>
                    <span className="vecinos-item-cifras">
                      {p.atenciones} {p.atenciones === 1 ? "atención" : "atenciones"} ·{" "}
                      {p.delegaciones}{" "}
                      {p.delegaciones === 1 ? "delegación" : "delegaciones"}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {cargandoFicha && <div className="skeleton" style={{ height: 320 }} />}

      {ficha && !cargandoFicha && (
        <section className="vecinos-ficha">
          {/* El aviso va ARRIBA de todo el detalle: si aparece después de la
              línea de tiempo, quien revisa ya decidió antes de leerlo. */}
          {ficha.aviso && (
            <div className="vecinos-aviso" role="status">
              <ShieldAlert size={18} strokeWidth={1.5} aria-hidden="true" />
              <div>
                <strong>Posible atención duplicada entre delegaciones</strong>
                <p>{ficha.aviso.mensaje}</p>
                <ul className="vecinos-aviso-detalle">
                  {ficha.aviso.coincidencias.map((c) => (
                    <li key={c.clasificacion}>
                      <strong>{c.clasificacion}</strong> en {c.delegaciones.join(" y ")} —{" "}
                      {c.diasEntre === 0 ? "el mismo día" : `${c.diasEntre} días de diferencia`}
                    </li>
                  ))}
                </ul>
                <p className="vecinos-aviso-nota">
                  El aviso informa, no bloquea: puede ser correcto que dos delegaciones atiendan a
                  la misma persona. Ventana de comparación: {ficha.aviso.ventanaDias} días
                  {!ficha.aviso.ventanaConfirmada && " (valor provisional, pendiente de definición)"}
                  .
                </p>
              </div>
            </div>
          )}

          <div className="vecinos-cabecera">
            <div className="vecinos-identidad">
              <h2>{ficha.persona.nombreCompleto}</h2>
              <p className="tnum">{ficha.persona.rutFormateado || "sin RUT registrado"}</p>
              <dl className="vecinos-datos">
                <div>
                  <dt>Teléfono</dt>
                  <dd className="tnum">{ficha.persona.telefonoFormateado || "—"}</dd>
                </div>
                <div>
                  <dt>Sector</dt>
                  <dd>{ficha.persona.sector ?? "—"}</dd>
                </div>
                <div>
                  <dt>Dirección</dt>
                  <dd>{ficha.persona.direccion ?? "—"}</dd>
                </div>
              </dl>
              <button
                type="button"
                className="btn-tabla"
                onClick={() => setEditando((v) => !v)}
                aria-expanded={editando}
              >
                {editando ? <X size={14} /> : <Pencil size={14} />}
                {editando ? "Cancelar" : "Corregir datos"}
              </button>
            </div>

            <div className="vecinos-cifras">
              <div className="vecinos-cifra">
                <span className="vecinos-cifra-valor tnum">{ficha.resumen.atenciones}</span>
                <span className="vecinos-cifra-nombre">
                  {ficha.resumen.atenciones === 1 ? "atención" : "atenciones"}
                </span>
              </div>
              <div
                className={
                  ficha.resumen.delegaciones > 1
                    ? "vecinos-cifra vecinos-cifra--marcada"
                    : "vecinos-cifra"
                }
              >
                <span className="vecinos-cifra-valor tnum">{ficha.resumen.delegaciones}</span>
                <span className="vecinos-cifra-nombre">
                  {ficha.resumen.delegaciones === 1 ? "delegación" : "delegaciones"}
                </span>
              </div>
              <div className="vecinos-cifra">
                <span className="vecinos-cifra-valor">{fechaCorta(ficha.resumen.primera)}</span>
                <span className="vecinos-cifra-nombre">primera atención</span>
              </div>
              <div className="vecinos-cifra">
                <span className="vecinos-cifra-valor">{fechaCorta(ficha.resumen.ultima)}</span>
                <span className="vecinos-cifra-nombre">última atención</span>
              </div>
            </div>
          </div>

          {editando && (
            <FormularioCorreccion
              ficha={ficha}
              onGuardado={() => {
                setEditando(false);
                if (seleccionada) cargarFicha(seleccionada);
              }}
              onError={mostrarError}
            />
          )}

          {porDeleg.length > 1 && (
            <p className="vecinos-reparto">
              Reparto:{" "}
              {porDeleg.map((d, i) => (
                <span key={d.nombre}>
                  {i > 0 && " · "}
                  <strong>{d.nombre}</strong> {d.total}
                </span>
              ))}
            </p>
          )}

          {!ficha.alcance.completo && ficha.alcance.hechosReducidos > 0 && (
            <p className="vecinos-reserva">
              <Lock size={13} strokeWidth={1.6} aria-hidden="true" />
              {ficha.alcance.hechosReducidos}{" "}
              {ficha.alcance.hechosReducidos === 1 ? "atención pertenece" : "atenciones pertenecen"}{" "}
              a otra delegación: se ve la fecha, la delegación y el tipo, no el detalle. El libro de
              cada delegación es privado; la trazabilidad del vecino no lo abre.
            </p>
          )}

          <h3 className="vecinos-titulo-linea">Historial</h3>
          {ficha.historial.length === 0 ? (
            <p className="vacio">
              Esta persona está registrada pero todavía no tiene atenciones ni compromisos.
            </p>
          ) : (
            <ol className="vecinos-linea">
              {ficha.historial.map((h) => {
                const estado = estadoLegible(h.estado);
                const clave = `${h.tipo}-${h.id}`;
                const marcada = resaltados.has(clave);
                return (
                  <li
                    key={clave}
                    className={marcada ? "vecinos-hito vecinos-hito--marcado" : "vecinos-hito"}
                  >
                    <span className="vecinos-hito-punto" aria-hidden="true" />
                    <div className="vecinos-hito-cuerpo">
                      <div className="vecinos-hito-cabeza">
                        <span className="vecinos-hito-fecha tnum">{fechaCorta(h.fecha)}</span>
                        <span className="vecinos-hito-delegacion">{h.delegacion.nombre}</span>
                        <span className={`vecinos-estado vecinos-estado--${estado.tono}`}>
                          {estado.texto}
                        </span>
                        {!h.detallado && (
                          <span className="vecinos-estado vecinos-estado--reservado">
                            <Lock size={11} strokeWidth={2} aria-hidden="true" /> Detalle reservado
                          </span>
                        )}
                      </div>
                      <p className="vecinos-hito-titulo">
                        {h.clasificacion?.nombre ?? (h.tipo === "compromiso" ? "Compromiso" : "Atención")}
                        {h.titulo && <span className="vecinos-hito-sub"> — {h.titulo}</span>}
                      </p>
                      {h.detallado && h.descripcion && (
                        <p className="vecinos-hito-detalle">{h.descripcion}</p>
                      )}
                      {/* RF-015 · CA-04: el caso social y su avance. Es lo que
                          cierra la secuencia consultable: desde otra
                          delegación se ve cuántas gestiones lleva —para no
                          duplicar la ayuda— pero no de qué se trata. */}
                      {h.atencionSocial && (
                        <p className="vecinos-hito-caso">
                          <HeartHandshake size={13} strokeWidth={1.6} aria-hidden="true" />
                          <span>
                            <strong>Caso social</strong> · gestión{" "}
                            <span className="tnum">{h.atencionSocial.gestionesRegistradas}</span> de 3
                            {h.atencionSocial.estado === "cerrada" ? " · cerrado" : " · en curso"}
                            {h.atencionSocial.tipoAtencion && ` · ${h.atencionSocial.tipoAtencion}`}
                          </span>
                          {h.atencionSocial.gestiones.length > 0 && (
                            <span className="vecinos-hito-gestiones">
                              {h.atencionSocial.gestiones
                                .map((g) => `${g.numero}. ${g.valor}`)
                                .join(" → ")}
                            </span>
                          )}
                        </p>
                      )}
                      <p className="vecinos-hito-pie">
                        {h.codigo && <span className="tnum">{h.codigo}</span>}
                        {h.codigo && h.funcionario && " · "}
                        {h.funcionario && <span>{h.funcionario.nombre}</span>}
                        {!h.detallado && (
                          <span>
                            {h.codigo ? " · " : ""}Consultar a la delegación {h.delegacion.nombre}
                          </span>
                        )}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </section>
      )}
    </div>
  );
}

/**
 * Corrección de los datos del vecino. No es un extra: rectificar un dato
 * personal inexacto es un derecho del titular (Ley 19.628 art. 6, Ley 21.719).
 * Aplica bloqueo optimista: si alguien más lo cambió, el servidor responde 409
 * y aquí se dice quién ganó, nunca se sobrescribe en silencio (CA-08).
 */
function FormularioCorreccion({
  ficha,
  onGuardado,
  onError,
}: {
  ficha: FichaVecino;
  onGuardado: () => void;
  onError: (m: string) => void;
}) {
  const p = ficha.persona;
  const [nombres, setNombres] = useState(p.nombres);
  const [paterno, setPaterno] = useState(p.apellidoPaterno);
  const [materno, setMaterno] = useState(p.apellidoMaterno ?? "");
  const [telefono, setTelefono] = useState(p.telefono ?? "");
  const [direccion, setDireccion] = useState(p.direccion ?? "");
  const [sector, setSector] = useState(p.sector ?? "");
  const [guardando, setGuardando] = useState(false);
  const [conflicto, setConflicto] = useState<string | null>(null);

  const guardar = (e: React.FormEvent) => {
    e.preventDefault();
    setGuardando(true);
    setConflicto(null);
    api
      .patch(`/vecinos/${p.id}`, {
        nombres: nombres.trim(),
        apellidoPaterno: paterno.trim(),
        apellidoMaterno: materno.trim() || null,
        telefono: telefono.trim() || null,
        direccion: direccion.trim() || null,
        sector: sector.trim() || null,
        version: p.version,
      })
      .then(() => onGuardado())
      .catch((e2) => {
        if (e2 instanceof ApiError && e2.status === 409) setConflicto(e2.message);
        else onError(e2 instanceof Error ? e2.message : "No se pudo guardar");
      })
      .finally(() => setGuardando(false));
  };

  return (
    <form className="vecinos-correccion" onSubmit={guardar}>
      {conflicto && (
        <p className="vecinos-conflicto" role="alert">
          {conflicto}{" "}
          <button type="button" className="btn-tabla" onClick={onGuardado}>
            Ver lo vigente
          </button>
        </p>
      )}
      <div className="vecinos-correccion-campos">
        <label>
          <span className="etiqueta">Nombres</span>
          <input className="campo" value={nombres} onChange={(e) => setNombres(e.target.value)} required />
        </label>
        <label>
          <span className="etiqueta">Apellido paterno</span>
          <input className="campo" value={paterno} onChange={(e) => setPaterno(e.target.value)} required />
        </label>
        <label>
          <span className="etiqueta">Apellido materno</span>
          <input className="campo" value={materno} onChange={(e) => setMaterno(e.target.value)} />
        </label>
        <label>
          <span className="etiqueta">Teléfono</span>
          <input className="campo" value={telefono} onChange={(e) => setTelefono(e.target.value)} />
        </label>
        <label>
          <span className="etiqueta">Sector</span>
          <input className="campo" value={sector} onChange={(e) => setSector(e.target.value)} />
        </label>
        <label className="vecinos-correccion-ancho">
          <span className="etiqueta">Dirección</span>
          <input className="campo" value={direccion} onChange={(e) => setDireccion(e.target.value)} />
        </label>
      </div>
      <p className="vecinos-correccion-nota">
        El RUT no se edita aquí: es la llave que une el historial entre delegaciones (ADR-008).
        Corregirlo se pide a administración, que lo hace con registro en la bitácora.
      </p>
      <button className="btn-primario" type="submit" disabled={guardando}>
        {guardando ? "Guardando…" : "Guardar corrección"}
      </button>
    </form>
  );
}
