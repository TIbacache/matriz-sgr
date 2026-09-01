import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import type { CategoriaGestion, Conectado, Tarea, UnidadTerritorial } from "../lib/types";
import { colorCategoria, puedeMoverTarea } from "../lib/kanban";
import { useAuth } from "../context/AuthContext";
import { useUnidadSocket } from "../lib/useUnidadSocket";
import { KanbanBoard } from "../components/kanban/KanbanBoard";
import { PresenceBar } from "../components/PresenceBar";
import { NuevaTareaModal } from "../components/NuevaTareaModal";
import { useToast } from "../components/Toast";
import "./tubo.css";

/** Espejo de requireRol("verificador", "supervisor", "admin") del backend. */
const PUEDEN_VALIDAR = ["verificador", "supervisor", "admin"];

export function TuboPage() {
  const { usuario, token, terminologia } = useAuth();
  const { toast, mostrarError } = useToast();

  const [unidades, setUnidades] = useState<UnidadTerritorial[]>([]);
  const [categorias, setCategorias] = useState<CategoriaGestion[]>([]);
  const [unidadId, setUnidadId] = useState<string | null>(null);
  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [conectados, setConectados] = useState<Conectado[]>([]);
  const [cargando, setCargando] = useState(true);
  const [cargandoUnidades, setCargandoUnidades] = useState(true);
  const [modalAbierto, setModalAbierto] = useState(false);

  const terminoUnidad = terminologia.unidad ?? "unidad";

  // Carga inicial: unidades + categorías. El selector solo ofrece las
  // delegaciones cuyo libro este rol puede abrir (privacidad por delegación);
  // por defecto la propia (responsable) o la primera visible.
  useEffect(() => {
    if (!usuario) return;
    Promise.all([
      api.get<UnidadTerritorial[]>("/unidades"),
      api.get<CategoriaGestion[]>("/categorias"),
    ])
      .then(([us, cs]) => {
        const visibles = us.filter((u) => u.puedeVerLibro);
        setUnidades(visibles);
        setCategorias(cs);
        const propia = visibles.find((u) => u.responsableId === usuario.id);
        setUnidadId((actual) => actual ?? propia?.id ?? visibles[0]?.id ?? null);
      })
      .catch((e) => mostrarError(e instanceof Error ? e.message : "Error al cargar datos"))
      .finally(() => setCargandoUnidades(false));
  }, [usuario, mostrarError]);

  const cargarTareas = useCallback(() => {
    // Sin delegación visible no hay tubo que cargar. Salir SIN apagar el
    // indicador de carga dejaba el esqueleto girando para siempre a quien no
    // tiene libro asignado (verificador, consulta): parecía una pantalla rota.
    if (!unidadId) {
      setTareas([]);
      setCargando(false);
      return;
    }
    setCargando(true);
    api
      .get<Tarea[]>(`/tareas?unidad=${unidadId}`)
      .then(setTareas)
      .catch((e) => mostrarError(e instanceof Error ? e.message : "Error al cargar tareas"))
      .finally(() => setCargando(false));
  }, [unidadId, mostrarError]);

  useEffect(() => {
    setConectados([]);
    cargarTareas();
  }, [cargarTareas]);

  // Tiempo real: eventos del room de la unidad. Idempotentes por id, porque
  // el PATCH optimista y el evento del socket pueden llegar en cualquier orden.
  useUnidadSocket(token, unidadId, {
    onTareaCreada: (t) =>
      setTareas((prev) => (prev.some((x) => x.id === t.id) ? prev : [...prev, t])),
    onTareaActualizada: (t) =>
      setTareas((prev) => prev.map((x) => (x.id === t.id ? t : x))),
    onTareaEliminada: (id) => setTareas((prev) => prev.filter((x) => x.id !== id)),
    onPresencia: setConectados,
    onReconectado: cargarTareas,
  });

  const unidadActual = useMemo(
    () => unidades.find((u) => u.id === unidadId),
    [unidades, unidadId]
  );

  // Con los libros privados por delegación, el selector ya solo ofrece
  // unidades visibles; el drag por tarjeta lo decide puedeMoverTarea.

  const indicePorCategoria = useMemo(() => {
    const mapa = new Map<string, number>();
    categorias.forEach((c, i) => mapa.set(c.id, i));
    return mapa;
  }, [categorias]);

  const colorPorCategoria = useCallback(
    (categoriaId: string) => colorCategoria(indicePorCategoria.get(categoriaId) ?? 0),
    [indicePorCategoria]
  );

  // Actualización optimista (HU-3.1): mover ya, revertir si el PATCH falla.
  const onMover = useCallback(
    (tarea: Tarea, nuevoEstado: string) => {
      const estadoAnterior = tarea.estado;
      setTareas((prev) =>
        prev.map((t) => (t.id === tarea.id ? { ...t, estado: nuevoEstado } : t))
      );
      api.patch<Tarea>(`/tareas/${tarea.id}`, { estado: nuevoEstado }).catch((e) => {
        setTareas((prev) =>
          prev.map((t) => (t.id === tarea.id ? { ...t, estado: estadoAnterior } : t))
        );
        mostrarError(
          e instanceof Error ? `No se pudo mover la tarea: ${e.message}` : "No se pudo mover la tarea"
        );
      });
    },
    [mostrarError]
  );

  if (!usuario) return null;

  // Crear tareas: admin y supervisor siempre; gerente solo en su delegación
  // (espejo del requireRol + check de unidad del backend).
  const puedeCrear =
    usuario.rol === "admin" ||
    usuario.rol === "supervisor" ||
    (usuario.rol === "gerente" && unidadActual?.responsableId === usuario.id);

  return (
    <div className="tubo">
      {toast}
      <header className="tubo-header">
        <div>
          <h2>Tubo de trabajo</h2>
        </div>
        {/* Sin libro visible no hay nada que elegir ni con quién compartir
            presencia: se ocultan en vez de mostrar controles vacíos. */}
        {unidades.length > 0 && (
          <div className="tubo-header-derecha">
            <PresenceBar conectados={conectados} />
            {puedeCrear && unidadActual && (
              <button className="btn-primario" onClick={() => setModalAbierto(true)}>
                Nueva tarea
              </button>
            )}
            <select
              className="campo tubo-selector"
              value={unidadId ?? ""}
              onChange={(e) => setUnidadId(e.target.value)}
              aria-label={`Seleccionar ${terminoUnidad}`}
            >
              {unidades.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nombre}
                </option>
              ))}
            </select>
          </div>
        )}
      </header>

      {cargandoUnidades || cargando ? (
        <div className="tubo-skeleton" aria-hidden="true">
          <div className="skeleton" />
          <div className="skeleton" />
          <div className="skeleton" />
        </div>
      ) : unidades.length === 0 ? (
        // El libro es privado por delegación (regla del cliente, reunión
        // 00:37:11) y los roles transversales —verificador y consulta— no
        // tienen delegación asignada. No es un error: se explica y se ofrece
        // la pantalla que sí les corresponde (DESIGN §7).
        <div className="card tubo-vacio">
          <p className="vacio">
            No tienes ninguna {terminoUnidad} asignada, así que no hay tubo que mostrar. El libro
            de cada {terminoUnidad} es privado de su equipo; tu rol trabaja a nivel central.
          </p>
          <div className="tubo-vacio-acciones">
            {PUEDEN_VALIDAR.includes(usuario.rol) && (
              <Link className="btn-primario" to="/verificacion">
                Ir a la bandeja de verificación
              </Link>
            )}
            <Link className="btn-secundario" to="/dashboard">
              Ver el tablero consolidado
            </Link>
          </div>
        </div>
      ) : (
        <KanbanBoard
          tareas={tareas}
          colorPorCategoria={colorPorCategoria}
          esArrastrable={(t) => puedeMoverTarea(usuario, t, unidadActual)}
          onMover={onMover}
        />
      )}

      {modalAbierto && unidadActual && (
        <NuevaTareaModal
          unidadId={unidadActual.id}
          unidadNombre={unidadActual.nombre}
          categorias={categorias}
          onCerrar={() => setModalAbierto(false)}
          onCreada={(t) =>
            setTareas((prev) => (prev.some((x) => x.id === t.id) ? prev : [...prev, t]))
          }
        />
      )}
    </div>
  );
}
