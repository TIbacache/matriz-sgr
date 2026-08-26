import { useEffect, useState, type FormEvent } from "react";
import { api } from "../lib/api";
import type { CategoriaGestion, Tarea } from "../lib/types";
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

// Formulario de nueva tarea (cierre de HU-3.2). Campos obligatorios marcados,
// responsable elegido del directorio de la delegación (+ nivel central).
// La ficha completa de solicitud de vecino (RUT obligatorio, categoría/
// subcategoría, canal) queda para cuando el cliente entregue la parametrización
// de columnas — este modal cubre la tarea interna del tubo.
export function NuevaTareaModal({ unidadId, unidadNombre, categorias, onCerrar, onCreada }: Props) {
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [categoriaId, setCategoriaId] = useState(categorias[0]?.id ?? "");
  const [fechaCompromiso, setFechaCompromiso] = useState("");
  const [responsableId, setResponsableId] = useState("");
  const [equipo, setEquipo] = useState<MiembroDirectorio[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    api
      .get<MiembroDirectorio[]>(`/usuarios?unidad=${unidadId}`)
      .then(setEquipo)
      .catch(() => setEquipo([]));
  }, [unidadId]);

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
      const tarea = await api.post<Tarea>("/tareas", {
        titulo,
        descripcion: descripcion || null,
        unidadTerritorialId: unidadId,
        categoriaId,
        fechaCompromiso: fechaCompromiso || null,
        responsableId: responsableId || null,
      });
      onCreada(tarea);
      onCerrar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear la tarea");
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

        <label className="etiqueta" htmlFor="nt-desc">Descripción</label>
        <textarea
          id="nt-desc"
          className="campo modal-textarea"
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          maxLength={2000}
          rows={3}
        />

        {error && <p className="modal-error">{error}</p>}

        <div className="modal-acciones">
          <button type="button" className="btn-secundario" onClick={onCerrar}>
            Cancelar
          </button>
          <button type="submit" className="btn-primario" disabled={guardando || !titulo || !categoriaId}>
            {guardando ? "Creando…" : "Crear tarea"}
          </button>
        </div>
      </form>
    </div>
  );
}
