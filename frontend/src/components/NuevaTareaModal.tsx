import { useEffect, useRef, useState, type FormEvent } from "react";
import { api } from "../lib/api";
import type { CatalogoItem, CategoriaGestion, Tarea } from "../lib/types";
import type { BusquedaVecinos, PersonaEncontrada } from "../lib/vecinos";
import { useAuth } from "../context/AuthContext";
import { ROLES_FICHA_VECINO } from "../lib/vecinos";
import "./modal.css";

interface MiembroDirectorio {
  userId: string;
  nombre: string;
  rol: string;
  cargo: string | null;
  unidad: { id: string; nombre: string } | null;
}

interface Props {
  unidadId: string;
  unidadNombre: string;
  categorias: CategoriaGestion[];
  onCerrar: () => void;
  // La tarea creada llega también por socket; el padre deduplica por id.
  onCreada: (t: Tarea) => void;
}

// Formulario de nueva tarea — HU-02 · RF-016 · RF-017.
//
// Las columnas de la solicitud (INT/EXT, solicitante, territorio, área de
// apoyo) son las REALES del tubo del cliente (estructura-planilla-real §6).
// Dos decisiones que conviene no reabrir:
//
// 1. **No se pide RUT.** La planilla no tiene esa columna en el tubo:
//    `SOLICITANTE` es texto libre —"la junta de vecinos del Sector Norte"— y
//    muchos compromisos son internos y no tienen persona detrás. El RUT vive
//    en la pestaña social y en las actividades.
// 2. **El formulario no crece para el caso frecuente.** Si el compromiso es
//    interno se queda como estaba; los cuatro campos de la solicitud aparecen
//    solo al marcar "Externa". Ante la duda entre elegante y obvio gana obvio
//    (RNF-011), pero eso no significa pedirlo todo siempre.
//
// El buscador de vecino es OPCIONAL y es lo que hace que el compromiso aparezca
// en la ficha de esa persona junto a sus atenciones (ADR-008). Forzarlo
// convertiría el tubo en un registro de personas que la ley no pide.
export function NuevaTareaModal({ unidadId, unidadNombre, categorias, onCerrar, onCreada }: Props) {
  const { usuario } = useAuth();

  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [categoriaId, setCategoriaId] = useState(categorias[0]?.id ?? "");
  const [fechaCompromiso, setFechaCompromiso] = useState("");
  const [responsableId, setResponsableId] = useState("");
  const [equipo, setEquipo] = useState<MiembroDirectorio[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  // --- La solicitud (RF-016, RF-017) ---
  const [interesExterno, setInteresExterno] = useState(false);
  const [solicitante, setSolicitante] = useState("");
  const [territorio, setTerritorio] = useState("");
  const [areaApoyo, setAreaApoyo] = useState("");
  const [territorios, setTerritorios] = useState<string[]>([]);
  const [areas, setAreas] = useState<string[]>([]);

  // --- Vínculo opcional con la ficha del vecino ---
  const [buscaVecino, setBuscaVecino] = useState("");
  const [candidatos, setCandidatos] = useState<PersonaEncontrada[]>([]);
  const [vecino, setVecino] = useState<PersonaEncontrada | null>(null);
  const [buscando, setBuscando] = useState(false);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);

  const puedeBuscarVecinos = usuario ? ROLES_FICHA_VECINO.includes(usuario.rol) : false;

  useEffect(() => {
    api
      .get<MiembroDirectorio[]>(`/usuarios?unidad=${unidadId}`)
      .then(setEquipo)
      .catch(() => setEquipo([]));
  }, [unidadId]);

  // Los desplegables salen del catálogo (RF-004), nunca de una lista aquí.
  useEffect(() => {
    Promise.all([
      api.get<CatalogoItem[]>("/catalogos?catalogo=territorio"),
      api.get<CatalogoItem[]>("/catalogos?catalogo=area_apoyo"),
    ])
      .then(([t, a]) => {
        setTerritorios(t.map((x) => x.valor));
        setAreas(a.map((x) => x.valor));
      })
      .catch(() => setError("No se pudieron cargar los catálogos de territorio y área de apoyo"));
  }, []);

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCerrar();
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [onCerrar]);

  // Búsqueda con espera, igual que en /vecinos: teclear no es una consulta.
  useEffect(() => {
    if (!puedeBuscarVecinos || vecino || buscaVecino.trim().length < 3) {
      setCandidatos([]);
      return;
    }
    if (temporizador.current) clearTimeout(temporizador.current);
    temporizador.current = setTimeout(() => {
      setBuscando(true);
      api
        .get<BusquedaVecinos>(`/vecinos?q=${encodeURIComponent(buscaVecino.trim())}&limite=5`)
        .then((r) => setCandidatos(r.personas))
        .catch(() => setCandidatos([]))
        .finally(() => setBuscando(false));
    }, 250);
    return () => {
      if (temporizador.current) clearTimeout(temporizador.current);
    };
  }, [buscaVecino, vecino, puedeBuscarVecinos]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setGuardando(true);
    try {
      const tarea = await api.post<Tarea>("/tareas", {
        titulo,
        descripcion: descripcion || null,
        unidadTerritorialId: unidadId,
        categoriaId,
        fechaCompromiso: fechaCompromiso || null,
        responsableId: responsableId || null,
        interesExterno,
        // Los campos de la solicitud solo viajan si es externa: mandarlos en
        // una interna dejaría datos que nadie pidió ni va a mirar.
        ...(interesExterno
          ? {
              solicitante: solicitante.trim(),
              territorio: territorio || null,
              areaApoyo: areaApoyo || null,
              personaUsuariaId: vecino?.id ?? null,
            }
          : {}),
      });
      onCreada(tarea);
      onCerrar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear la tarea");
    } finally {
      setGuardando(false);
    }
  };

  const listo = titulo && categoriaId && (!interesExterno || solicitante.trim().length > 0);

  return (
    <div className="modal-fondo" onClick={onCerrar} role="presentation">
      <form
        className="card modal entrada"
        onClick={(e) => e.stopPropagation()}
        onSubmit={onSubmit}
        aria-label="Nueva tarea"
      >
        <h3 className="modal-titulo">Nueva tarea</h3>
        <p className="modal-sub">Se agrega al tubo de {unidadNombre} y se sincroniza al instante.</p>

        <label className="etiqueta" htmlFor="nt-titulo">Título *</label>
        <input
          id="nt-titulo"
          className="campo"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          maxLength={200}
          required
          autoFocus
        />

        <div className="modal-fila">
          <div>
            <label className="etiqueta" htmlFor="nt-pilar">Pilar *</label>
            <select
              id="nt-pilar"
              className="campo"
              value={categoriaId}
              onChange={(e) => setCategoriaId(e.target.value)}
              required
            >
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="etiqueta" htmlFor="nt-fecha">Fecha compromiso</label>
            <input
              id="nt-fecha"
              className="campo"
              type="date"
              value={fechaCompromiso}
              onChange={(e) => setFechaCompromiso(e.target.value)}
            />
          </div>
        </div>

        <label className="etiqueta" htmlFor="nt-resp">Responsable</label>
        <select
          id="nt-resp"
          className="campo"
          value={responsableId}
          onChange={(e) => setResponsableId(e.target.value)}
        >
          <option value="">Sin asignar</option>
          {equipo.map((m) => (
            <option key={m.userId} value={m.userId}>
              {m.nombre}
              {m.cargo ? ` — ${m.cargo}` : ""}
            </option>
          ))}
        </select>

        {/* RF-016 · INT/EXT. Dos opciones explícitas y no una casilla: "no
            marcado" no es lo mismo que "es trabajo interno", y en la planilla
            del cliente la columna siempre tiene un valor. */}
        <fieldset className="tubo-origen">
          <legend className="etiqueta">Origen de la solicitud *</legend>
          <label className="tubo-origen-opcion">
            <input
              type="radio"
              name="nt-origen"
              checked={!interesExterno}
              onChange={() => setInteresExterno(false)}
            />
            <span>
              <strong>Interna</strong>
              <span className="tubo-origen-ayuda">Trabajo propio del municipio</span>
            </span>
          </label>
          <label className="tubo-origen-opcion">
            <input
              type="radio"
              name="nt-origen"
              checked={interesExterno}
              onChange={() => setInteresExterno(true)}
            />
            <span>
              <strong>Externa</strong>
              <span className="tubo-origen-ayuda">La pidió un vecino u organización</span>
            </span>
          </label>
        </fieldset>

        {interesExterno && (
          <div className="tubo-solicitud">
            <label className="etiqueta" htmlFor="nt-solicitante">Quién la pidió *</label>
            <input
              id="nt-solicitante"
              className="campo"
              value={solicitante}
              onChange={(e) => setSolicitante(e.target.value)}
              maxLength={160}
              required
              placeholder="Persona u organización, tal como se identificó"
            />

            <div className="modal-fila">
              <div>
                <label className="etiqueta" htmlFor="nt-territorio">Territorio</label>
                <select
                  id="nt-territorio"
                  className="campo"
                  value={territorio}
                  onChange={(e) => setTerritorio(e.target.value)}
                >
                  <option value="">Sin especificar</option>
                  {territorios.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="etiqueta" htmlFor="nt-area">Área de apoyo</label>
                <select
                  id="nt-area"
                  className="campo"
                  value={areaApoyo}
                  onChange={(e) => setAreaApoyo(e.target.value)}
                >
                  <option value="">Sin especificar</option>
                  {areas.map((a) => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </div>
            </div>

            {puedeBuscarVecinos && (
              <>
                <label className="etiqueta" htmlFor="nt-vecino">
                  Enlazar con la ficha de un vecino (opcional)
                </label>
                {vecino ? (
                  <p className="tubo-vecino-elegido">
                    <span>
                      <strong>{vecino.nombreCompleto}</strong>
                      {vecino.rutFormateado ? ` · ${vecino.rutFormateado}` : ""}
                    </span>
                    <button
                      type="button"
                      className="btn-tabla"
                      onClick={() => {
                        setVecino(null);
                        setBuscaVecino("");
                      }}
                    >
                      Quitar
                    </button>
                  </p>
                ) : (
                  <>
                    <input
                      id="nt-vecino"
                      className="campo"
                      value={buscaVecino}
                      onChange={(e) => setBuscaVecino(e.target.value)}
                      placeholder="RUT o nombre, desde 3 caracteres"
                      autoComplete="off"
                    />
                    {buscando && <p className="tubo-vecino-nota">Buscando…</p>}
                    {!buscando && candidatos.length > 0 && (
                      <ul className="tubo-vecino-lista">
                        {candidatos.map((p) => (
                          <li key={p.id}>
                            <button type="button" className="tubo-vecino-opcion" onClick={() => setVecino(p)}>
                              <span>{p.nombreCompleto}</span>
                              <span className="tubo-vecino-rut tnum">{p.rutFormateado}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                    {!buscando && buscaVecino.trim().length >= 3 && candidatos.length === 0 && (
                      <p className="tubo-vecino-nota">
                        Sin coincidencias. El compromiso se guarda igual: el vínculo es opcional y el
                        solicitante puede ser una organización.
                      </p>
                    )}
                  </>
                )}
                <p className="tubo-vecino-nota">
                  Enlazarlo hace que este compromiso aparezca en el historial de esa persona, junto a
                  sus atenciones, aunque la atiendan en otra delegación.
                </p>
              </>
            )}
          </div>
        )}

        <label className="etiqueta" htmlFor="nt-desc">Descripción</label>
        <textarea
          id="nt-desc"
          className="campo modal-textarea"
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          maxLength={2000}
          rows={3}
        />

        {error && <p className="modal-error" role="alert">{error}</p>}

        <div className="modal-acciones">
          <button type="button" className="btn-secundario" onClick={onCerrar}>
            Cancelar
          </button>
          <button type="submit" className="btn-primario" disabled={guardando || !listo}>
            {guardando ? "Creando…" : "Crear tarea"}
          </button>
        </div>
      </form>
    </div>
  );
}
