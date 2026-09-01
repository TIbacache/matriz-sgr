import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/Toast";
import { useUnidadSocket } from "../lib/useUnidadSocket";
import { avisoParametros } from "../lib/ficha";
import type {
  Actividad,
  CatalogoItem,
  CumplimientoRespuesta,
  Evidencia,
  Periodo,
  UnidadTerritorial,
} from "../lib/types";
import { CabeceraFicha } from "../components/ficha/CabeceraFicha";
import { TablaItems } from "../components/ficha/TablaItems";
import { FilaNuevaActividad } from "../components/ficha/FilaNuevaActividad";
import { TablaActividades } from "../components/ficha/TablaActividades";
import { ModalAnular } from "../components/ficha/ModalAnular";
import { VistaEvidencia } from "../components/ficha/VistaEvidencia";
import "./ficha.css";

const CATALOGO_FORMATOS = "formato_evidencia";
const LIMITE_ACTIVIDADES = 100;

// Ficha personal — RF-008 · HU-06. La "pestaña personal" de la planilla: donde
// cada funcionario ve su medición y registra su trabajo.
//
// Tres bloques verticales, en el orden que fija DESIGN §8.2: identidad y
// semáforo → ítems medidos → registro del día a día. Nada de esto calcula
// nada: los números vienen de GET /cumplimiento/:periodoId, que es el motor
// por funcionario ya verificado.
export function FichaPage() {
  const { usuario, token } = useAuth();
  const { toast, mostrarError } = useToast();

  const [periodos, setPeriodos] = useState<Periodo[]>([]);
  const [periodoId, setPeriodoId] = useState<string | null>(null);
  const [datos, setDatos] = useState<CumplimientoRespuesta | null>(null);
  const [funcionarioId, setFuncionarioId] = useState<string | null>(usuario?.id ?? null);
  const [actividades, setActividades] = useState<Actividad[]>([]);
  const [unidades, setUnidades] = useState<UnidadTerritorial[]>([]);
  const [formatos, setFormatos] = useState<string[]>([]);
  const [cargando, setCargando] = useState(true);
  const [alerta, setAlerta] = useState<string | null>(null);
  const [anulando, setAnulando] = useState<Actividad | null>(null);
  const [viendo, setViendo] = useState<{ actividad: Actividad; evidencia: Evidencia } | null>(null);

  // --- Carga inicial: períodos, delegaciones y formatos aceptados -----------
  useEffect(() => {
    Promise.all([
      api.get<Periodo[]>("/periodos"),
      api.get<UnidadTerritorial[]>("/unidades"),
      api.get<CatalogoItem[]>(`/catalogos?catalogo=${CATALOGO_FORMATOS}`),
    ])
      .then(([ps, us, cats]) => {
        setPeriodos(ps);
        setUnidades(us);
        setFormatos(cats.map((c) => c.valor));
        // El período abierto más reciente es el que se trabaja hoy.
        const abierto = ps.find((p) => p.estado === "abierto");
        setPeriodoId((actual) => actual ?? abierto?.id ?? ps[0]?.id ?? null);
      })
      .catch((e) => mostrarError(e instanceof Error ? e.message : "Error al cargar la ficha"));
  }, [mostrarError]);

  // --- Cumplimiento del período --------------------------------------------
  const cargarCumplimiento = useCallback(() => {
    if (!periodoId) return;
    api
      .get<CumplimientoRespuesta>(`/cumplimiento/${periodoId}`)
      .then(setDatos)
      .catch((e) => mostrarError(e instanceof Error ? e.message : "Error al calcular el cumplimiento"));
  }, [periodoId, mostrarError]);

  useEffect(() => {
    cargarCumplimiento();
  }, [cargarCumplimiento]);

  // --- Actividades del funcionario en el período ----------------------------
  const cargarActividades = useCallback(() => {
    if (!periodoId || !funcionarioId) return;
    setCargando(true);
    api
      .get<{ actividades: Actividad[] }>(
        `/actividades?periodo=${periodoId}&funcionario=${funcionarioId}&limite=${LIMITE_ACTIVIDADES}&anuladas=1`
      )
      .then((r) => setActividades(r.actividades))
      .catch((e) => mostrarError(e instanceof Error ? e.message : "Error al cargar las actividades"))
      .finally(() => setCargando(false));
  }, [periodoId, funcionarioId, mostrarError]);

  useEffect(() => {
    cargarActividades();
  }, [cargarActividades]);

  const periodo = datos?.periodo ?? null;
  const ficha = useMemo(
    () => datos?.funcionarios.find((f) => f.funcionarioId === funcionarioId) ?? null,
    [datos, funcionarioId]
  );

  // --- Tiempo real: el room de la delegación de esta persona ----------------
  useUnidadSocket(token, ficha?.unidadTerritorialId ?? null, {
    onActividadCreada: (a) => {
      if (a.funcionarioId !== funcionarioId) return;
      setActividades((prev) => (prev.some((x) => x.id === a.id) ? prev : [a, ...prev]));
    },
    onActividadActualizada: (a) =>
      setActividades((prev) => prev.map((x) => (x.id === a.id ? a : x))),
    // Al validar cambia el puntaje: se recargan las dos cosas para que la
    // cifra de arriba y el estado de la fila cuenten lo mismo (CA-06).
    onValidacionRegistrada: (d) => {
      if (!actividades.some((a) => a.id === d.actividadId)) return;
      cargarActividades();
      cargarCumplimiento();
    },
    onReconectado: () => {
      cargarActividades();
      cargarCumplimiento();
    },
  });

  if (!usuario) return null;

  // El libro es privado por delegación (regla del cliente): solo se ofrecen
  // las fichas de las delegaciones cuyo libro este rol puede abrir, más la
  // propia. El semáforo consolidado, que sí es público, vive en el dashboard.
  const unidadesVisibles = new Set(unidades.filter((u) => u.puedeVerLibro).map((u) => u.id));
  const puedeElegirPersona = ["admin", "supervisor", "gerente"].includes(usuario.rol);
  const opciones = (datos?.funcionarios ?? []).filter(
    (f) =>
      f.funcionarioId === usuario.id ||
      (puedeElegirPersona && f.unidadTerritorialId && unidadesVisibles.has(f.unidadTerritorialId))
  );

  const esPropia = funcionarioId === usuario.id;
  const rolRegistra = !["verificador", "consulta"].includes(usuario.rol);
  const puedeGestionar = rolRegistra && (esPropia || puedeElegirPersona);

  const delegacion =
    unidades.find((u) => u.id === ficha?.unidadTerritorialId)?.nombre ?? null;
  const periodoElegido = periodos.find((p) => p.id === periodoId) ?? null;

  return (
    <div className="ficha">
      {toast}

      <header className="ficha-header">
        <div>
          <h2>Ficha personal</h2>
          <p className="ficha-header-sub">
            Tu medición y tu registro diario. Una actividad suma al avance solo cuando su
            evidencia está validada.
          </p>
        </div>

        <div className="ficha-filtros">
          <div className="ficha-filtro">
            <label className="etiqueta" htmlFor="fi-periodo">
              Período
            </label>
            <select
              id="fi-periodo"
              className="campo"
              value={periodoId ?? ""}
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

          {puedeElegirPersona && opciones.length > 1 && (
            <div className="ficha-filtro">
              <label className="etiqueta" htmlFor="fi-persona">
                Funcionario
              </label>
              <select
                id="fi-persona"
                className="campo"
                value={funcionarioId ?? ""}
                onChange={(e) => setFuncionarioId(e.target.value)}
              >
                {opciones.map((f) => (
                  <option key={f.funcionarioId} value={f.funcionarioId}>
                    {f.nombre}
                    {f.cargo ? ` — ${f.cargo}` : ""}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </header>

      {periodoElegido?.estado === "cerrado" && (
        <p className="ficha-aviso" role="note">
          Este período está cerrado: sus resultados quedaron congelados y no admite registros ni
          validaciones (RN-013).
        </p>
      )}

      {!datos && <div className="skeleton ficha-skeleton" aria-hidden="true" />}

      {datos && periodo && ficha && (
        <CabeceraFicha
          ficha={ficha}
          periodo={periodo}
          delegacion={delegacion}
          aviso={avisoParametros(datos.parametros)}
        />
      )}

      {datos && !ficha && (
        <section className="card ficha-bloque">
          <p className="vacio">
            No hay medición para esta persona en el período seleccionado: todavía no tiene metas
            asignadas (RF-007).
          </p>
        </section>
      )}

      {ficha && <TablaItems ficha={ficha} />}

      <section className="card ficha-bloque" aria-label="Registro de actividades">
        <h3 className="ficha-bloque-titulo">Registro de actividades</h3>
        <p className="ficha-bloque-sub">
          Evidencia aceptada: {formatos.length > 0 ? formatos.join(", ") : "según configuración"} ·
          máximo {datos?.parametros["evidencia_tamano_max_mb"]?.valor ?? 10} MB.
        </p>

        {periodo && periodoElegido?.estado === "abierto" && (
          <FilaNuevaActividad
            /* Remontar al cambiar de período o de persona: la fecha por
               defecto y el ítem preseleccionado dependen de ambos. */
            key={`${periodo.id}-${funcionarioId}`}
            periodo={periodo}
            items={ficha?.items ?? []}
            funcionarioId={funcionarioId ?? usuario.id}
            puedeRegistrar={puedeGestionar}
            onCreada={(a) => {
              setActividades((prev) => (prev.some((x) => x.id === a.id) ? prev : [a, ...prev]));
              setAlerta(a.alertaTrazabilidad?.mensaje ?? null);
              cargarCumplimiento();
            }}
          />
        )}

        {alerta && (
          <p className="ficha-alerta-trazabilidad" role="note">
            {alerta}
            <button className="btn-tabla" onClick={() => setAlerta(null)}>
              Entendido
            </button>
          </p>
        )}

        {cargando ? (
          <div className="skeleton ficha-skeleton" aria-hidden="true" />
        ) : (
          <TablaActividades
            actividades={actividades}
            formatos={formatos}
            tamanoMaxMb={datos?.parametros["evidencia_tamano_max_mb"]?.valor ?? 10}
            puedeGestionar={puedeGestionar && periodoElegido?.estado === "abierto"}
            onEvidenciaSubida={(actividadId, evidencia) =>
              setActividades((prev) =>
                prev.map((a) =>
                  a.id === actividadId ? { ...a, evidencias: [...a.evidencias, evidencia] } : a
                )
              )
            }
            onVerEvidencia={(actividad, evidencia) => setViendo({ actividad, evidencia })}
            onAnular={setAnulando}
            onError={mostrarError}
          />
        )}
      </section>

      {anulando && (
        <ModalAnular
          actividad={anulando}
          onCerrar={() => setAnulando(null)}
          onAnulada={(a) => {
            setActividades((prev) => prev.map((x) => (x.id === a.id ? a : x)));
            cargarCumplimiento();
          }}
        />
      )}

      {viendo && (
        <VistaEvidencia
          actividad={viendo.actividad}
          evidencia={viendo.evidencia}
          onCerrar={() => setViendo(null)}
        />
      )}
    </div>
  );
}
