import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import type { CategoriaGestion, Conectado, Tarea, UnidadTerritorial } from "../lib/types";
import { colorCategoria, puedeMoverTarea } from "../lib/kanban";
import { useAuth } from "../context/AuthContext";
import { useUnidadSocket } from "../lib/useUnidadSocket";
import { KanbanBoard } from "../components/kanban/KanbanBoard";
import { PresenceBar } from "../components/PresenceBar";
import { useToast } from "../components/Toast";
import "./tubo.css";

export function TuboPage() {
  const { usuario, token, terminologia } = useAuth();
  const { toast, mostrarError } = useToast();

  const [unidades, setUnidades] = useState<UnidadTerritorial[]>([]);
  const [categorias, setCategorias] = useState<CategoriaGestion[]>([]);
  const [unidadId, setUnidadId] = useState<string | null>(null);
  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [conectados, setConectados] = useState<Conectado[]>([]);
  const [cargando, setCargando] = useState(true);

  const terminoUnidad = terminologia.unidad ?? "unidad";

  // Carga inicial: unidades + categorías; la unidad por defecto del gerente
  // es la suya (responsableId), para el resto la primera.
  useEffect(() => {
    if (!usuario) return;
    Promise.all([
      api.get<UnidadTerritorial[]>("/unidades"),
      api.get<CategoriaGestion[]>("/categorias"),
    ])
      .then(([us, cs]) => {
        setUnidades(us);
        setCategorias(cs);
        const propia = us.find((u) => u.responsableId === usuario.id);
        setUnidadId((actual) => actual ?? propia?.id ?? us[0]?.id ?? null);
      })
      .catch((e) => mostrarError(e instanceof Error ? e.message : "Error al cargar datos"));
  }, [usuario, mostrarError]);

  const cargarTareas = useCallback(() => {
    if (!unidadId) return;
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

  // Gerente/usuario en unidad ajena: tablero en solo lectura (HU-3.3).
  const soloLectura =
    !!usuario &&
    usuario.rol === "gerente" &&
    unidadActual !== undefined &&
    unidadActual.responsableId !== usuario.id;

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

  return (
    <div className="tubo">
      {toast}
      <header className="tubo-header">
        <div>
          <h2>Tubo de trabajo</h2>
          {soloLectura && (
            <p className="tubo-solo-lectura">
              Solo lectura: esta {terminoUnidad} no está a su cargo
            </p>
          )}
        </div>
        <div className="tubo-header-derecha">
          <PresenceBar conectados={conectados} />
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
      </header>

      {cargando ? (
        <div className="tubo-skeleton" aria-hidden="true">
          <div /><div /><div />
        </div>
      ) : (
        <KanbanBoard
          tareas={tareas}
          colorPorCategoria={colorPorCategoria}
          esArrastrable={(t) => !soloLectura && puedeMoverTarea(usuario, t, unidadActual)}
          onMover={onMover}
        />
      )}
    </div>
  );
}
