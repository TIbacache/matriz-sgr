import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/Toast";
import { useOrgSocket } from "../lib/useOrgSocket";
import type {
  DecisionValidacion,
  EvidenciaEnBandeja,
  ListaEvidencias as ListaEvidenciasResp,
  Periodo,
  UnidadTerritorial,
} from "../lib/types";
import { ListaEvidencias } from "../components/bandeja/ListaEvidencias";
import { DetalleEvidencia } from "../components/bandeja/DetalleEvidencia";
import { AccionesValidacion } from "../components/bandeja/AccionesValidacion";
import "./bandeja.css";

const ROLES_QUE_VALIDAN = ["verificador", "supervisor", "admin"];
const LIMITE = 50;

const ESTADOS: { valor: string; etiqueta: string }[] = [
  { valor: "pendiente", etiqueta: "Por revisar" },
  { valor: "correccion_solicitada", etiqueta: "Corrección solicitada" },
  { valor: "rechazada", etiqueta: "Rechazadas" },
  { valor: "aprobada", etiqueta: "Aprobadas" },
];

// Bandeja del verificador — RF-013 · RF-014 · HU-11.
//
// Es una LISTA DE TRABAJO, no un tablero (DESIGN §8.2): cola a la izquierda,
// foto grande a la derecha y tres acciones equidistantes. Se puede recorrer
// entera con el teclado (J/K/Enter) porque quien revisa cien evidencias no
// debería tener que tomar el mouse cien veces — y porque RNF-012 lo exige.
export function BandejaPage() {
  const { usuario, token } = useAuth();
  const { toast, mostrarError } = useToast();

  const [periodos, setPeriodos] = useState<Periodo[]>([]);
  const [unidades, setUnidades] = useState<UnidadTerritorial[]>([]);
  const [periodoId, setPeriodoId] = useState<string>("");
  const [unidadId, setUnidadId] = useState<string>("");
  const [estado, setEstado] = useState<string>("pendiente");
  const [evidencias, setEvidencias] = useState<EvidenciaEnBandeja[]>([]);
  const [total, setTotal] = useState(0);
  const [seleccionadaId, setSeleccionadaId] = useState<string | null>(null);
  const [observacion, setObservacion] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [errorAccion, setErrorAccion] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [hayNuevas, setHayNuevas] = useState(false);

  useEffect(() => {
    Promise.all([api.get<Periodo[]>("/periodos"), api.get<UnidadTerritorial[]>("/unidades")])
      .then(([ps, us]) => {
        setPeriodos(ps);
        setUnidades(us);
        setPeriodoId((actual) => actual || ps.find((p) => p.estado === "abierto")?.id || ps[0]?.id || "");
      })
      .catch((e) => mostrarError(e instanceof Error ? e.message : "Error al cargar la bandeja"));
  }, [mostrarError]);

  const cargar = useCallback(() => {
    if (!periodoId) return;
    setCargando(true);
    setHayNuevas(false);
    const filtros = new URLSearchParams({ estado, periodo: periodoId, limite: String(LIMITE) });
    if (unidadId) filtros.set("unidad", unidadId);
    api
      .get<ListaEvidenciasResp>(`/evidencias?${filtros.toString()}`)
      .then((r) => {
        setEvidencias(r.evidencias);
        setTotal(r.total);
        // Se conserva la selección si sigue en la lista; si no, la primera.
        setSeleccionadaId((actual) =>
          actual && r.evidencias.some((e) => e.id === actual) ? actual : (r.evidencias[0]?.id ?? null)
        );
      })
      .catch((e) => mostrarError(e instanceof Error ? e.message : "Error al cargar las evidencias"))
      .finally(() => setCargando(false));
  }, [estado, periodoId, unidadId, mostrarError]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  // Aviso no invasivo: llega trabajo nuevo mientras se revisa. No se recarga
  // sola, porque mover la lista bajo el cursor de quien está decidiendo es
  // la forma más rápida de provocar un error.
  useOrgSocket(token, {
    onEvidenciaPendiente: () => setHayNuevas(true),
    onReconectado: cargar,
  });

  const seleccionada = useMemo(
    () => evidencias.find((e) => e.id === seleccionadaId) ?? null,
    [evidencias, seleccionadaId]
  );

  const mover = useCallback(
    (paso: number) => {
      setSeleccionadaId((actual) => {
        if (evidencias.length === 0) return null;
        const i = evidencias.findIndex((e) => e.id === actual);
        const siguiente = Math.min(Math.max((i < 0 ? 0 : i) + paso, 0), evidencias.length - 1);
        return evidencias[siguiente]!.id;
      });
      setObservacion("");
      setErrorAccion(null);
    },
    [evidencias]
  );

  const decidir = useCallback(
    async (decision: DecisionValidacion) => {
      if (!seleccionada) return;
      if (decision !== "aprobada" && observacion.trim().length < 5) {
        setErrorAccion("Rechazar o pedir corrección exige una observación de al menos 5 caracteres.");
        document.getElementById("bv-observacion")?.focus();
        return;
      }
      setEnviando(true);
      setErrorAccion(null);
      try {
        await api.post(`/evidencias/${seleccionada.id}/validacion`, {
          decision,
          observacion: observacion.trim() || null,
        });
        // Sale de la cola actual y se avanza sola a la siguiente: es una lista
        // de trabajo, y lo decidido ya no es trabajo.
        const indice = evidencias.findIndex((e) => e.id === seleccionada.id);
        const restantes = evidencias.filter((e) => e.id !== seleccionada.id);
        setEvidencias(restantes);
        setTotal((t) => Math.max(0, t - 1));
        setSeleccionadaId(restantes[Math.min(indice, restantes.length - 1)]?.id ?? null);
        setObservacion("");
      } catch (err) {
        setErrorAccion(err instanceof Error ? err.message : "No se pudo registrar la decisión");
      } finally {
        setEnviando(false);
      }
    },
    [seleccionada, observacion, evidencias]
  );

  const puedeValidar = ROLES_QUE_VALIDAN.includes(usuario?.rol ?? "");

  // Atajos de teclado (DESIGN §8.2). No se disparan mientras se escribe en un
  // campo: si no, la J del texto saltaría de evidencia.
  useEffect(() => {
    if (!puedeValidar) return;
    const onTecla = (e: KeyboardEvent) => {
      const destino = e.target as HTMLElement | null;
      const escribiendo =
        destino instanceof HTMLInputElement ||
        destino instanceof HTMLTextAreaElement ||
        destino instanceof HTMLSelectElement;
      if (escribiendo || e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === "j" || e.key === "J") {
        e.preventDefault();
        mover(1);
      } else if (e.key === "k" || e.key === "K") {
        e.preventDefault();
        mover(-1);
      } else if (e.key === "Enter") {
        e.preventDefault();
        void decidir("aprobada");
      }
    };
    window.addEventListener("keydown", onTecla);
    return () => window.removeEventListener("keydown", onTecla);
  }, [mover, decidir, puedeValidar]);

  if (!usuario) return null;

  return (
    <div className="bandeja">
      {toast}

      <header className="bandeja-header">
        <div>
          <h2>Bandeja de verificación</h2>
          <p className="bandeja-header-sub">
            Solo una validación aprobada suma al avance del funcionario (RN-009). Nadie puede
            validar su propia evidencia.
          </p>
        </div>

        <div className="bandeja-filtros">
          <div className="bandeja-filtro">
            <label className="etiqueta" htmlFor="bv-estado">
              Estado
            </label>
            <select
              id="bv-estado"
              className="campo"
              value={estado}
              onChange={(e) => setEstado(e.target.value)}
            >
              {ESTADOS.map((s) => (
                <option key={s.valor} value={s.valor}>
                  {s.etiqueta}
                </option>
              ))}
            </select>
          </div>
          <div className="bandeja-filtro">
            <label className="etiqueta" htmlFor="bv-periodo">
              Período
            </label>
            <select
              id="bv-periodo"
              className="campo"
              value={periodoId}
              onChange={(e) => setPeriodoId(e.target.value)}
            >
              {periodos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                  {p.estado === "cerrado" ? " (cerrado)" : ""}
                </option>
              ))}
            </select>
          </div>
          <div className="bandeja-filtro">
            <label className="etiqueta" htmlFor="bv-unidad">
              Delegación
            </label>
            <select
              id="bv-unidad"
              className="campo"
              value={unidadId}
              onChange={(e) => setUnidadId(e.target.value)}
            >
              <option value="">Todas</option>
              {unidades.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nombre}
                </option>
              ))}
            </select>
          </div>
        </div>
      </header>

      {!puedeValidar && (
        <p className="ficha-aviso" role="note">
          Tu rol puede consultar la bandeja, pero no registrar decisiones: validar exige
          verificador, coordinador o administrador (segregación de funciones, RNF-005).
        </p>
      )}

      {hayNuevas && (
        <p className="bandeja-nuevas" role="status">
          Llegaron evidencias nuevas mientras revisabas.
          <button className="btn-tabla" onClick={cargar}>
            Actualizar la lista
          </button>
        </p>
      )}

      <div className="bandeja-cuerpo">
        <section className="card bandeja-cola" aria-label="Cola de revisión">
          <h3 className="bandeja-cola-titulo">
            {ESTADOS.find((s) => s.valor === estado)?.etiqueta ?? estado}
            <span className="bandeja-contador tnum">{total}</span>
          </h3>
          {cargando ? (
            <div className="skeleton bandeja-skeleton" aria-hidden="true" />
          ) : (
            <ListaEvidencias
              evidencias={evidencias}
              seleccionadaId={seleccionadaId}
              onSeleccionar={(id) => {
                setSeleccionadaId(id);
                setObservacion("");
                setErrorAccion(null);
              }}
            />
          )}
        </section>

        <section className="card bandeja-panel" aria-label="Evidencia seleccionada">
          {seleccionada ? (
            <>
              <DetalleEvidencia evidencia={seleccionada} />
              {puedeValidar && (
                <AccionesValidacion
                  observacion={observacion}
                  onObservacion={setObservacion}
                  onDecidir={decidir}
                  enviando={enviando}
                  error={errorAccion}
                />
              )}
            </>
          ) : (
            <p className="vacio">
              {cargando
                ? "Cargando…"
                : "No queda nada por revisar con este filtro. Buen trabajo."}
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
