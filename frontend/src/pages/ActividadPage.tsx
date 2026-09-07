import { useCallback, useEffect, useMemo, useState } from "react";
import { Lock, Radio } from "lucide-react";
import { api, ApiError } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useOrgSocket } from "../lib/useOrgSocket";
import { useToast } from "../components/Toast";
import { ChipSemaforo } from "../components/ChipSemaforo";
import {
  cargarPanelActividad,
  fechaCorta,
  haceCuanto,
  PRESENTACION_ESTADO,
  ROLES_PANEL_ACTIVIDAD,
  type PanelActividad,
} from "../lib/actividad";
import type { Periodo, UnidadTerritorial } from "../lib/types";
import "./actividad.css";

// Control de actividad de usuarios — RF-030 · HU-19 · ADR-015.
//
// El docente pidió en clase que el administrador y el coordinador puedan saber
// tres cosas: quién registró trabajo, **quién no** y quién está conectado ahora
// (requerimientos-oficiales §9.ter). Las tres están aquí, en ese orden de
// importancia, porque la segunda es la que sirve para actuar.
//
// La pantalla asume una postura y la dice en voz alta: acompaña, no vigila.
//   · La fila ordena primero a quien necesita atención, no alfabéticamente.
//   · El texto de cada estado evita concluir ("puede ser vacaciones, licencia
//     o carga de trabajo: el panel avisa, no concluye").
//   · La conexión en vivo es un dato SECUNDARIO, en una tarjeta aparte y sin
//     minutos acumulados: no se mide tiempo de pantalla.
//   · El aviso de finalidad está visible para quien lo usa, porque las Leyes
//     19.628 y 21.719 piden finalidad declarada y proporcionalidad, y porque
//     un panel de personas que nadie sabe explicar se usa mal.
export function ActividadPage() {
  const { usuario, token, terminologia } = useAuth();
  const { toast, mostrarError } = useToast();

  const puedeVer = ROLES_PANEL_ACTIVIDAD.includes(usuario?.rol ?? "");

  const [periodos, setPeriodos] = useState<Periodo[]>([]);
  const [periodoId, setPeriodoId] = useState<string | null>(null);
  const [unidades, setUnidades] = useState<UnidadTerritorial[]>([]);
  const [unidadId, setUnidadId] = useState<string | null>(null);
  const [panel, setPanel] = useState<PanelActividad | null>(null);
  const [cargando, setCargando] = useState(true);
  const [motivo, setMotivo] = useState<string | null>(null);
  const [enVivo, setEnVivo] = useState<Set<string>>(new Set());

  // --- Períodos y delegaciones ---------------------------------------------
  useEffect(() => {
    if (!puedeVer) {
      setCargando(false);
      return;
    }
    Promise.all([api.get<Periodo[]>("/periodos"), api.get<UnidadTerritorial[]>("/unidades")])
      .then(([ps, us]) => {
        setPeriodos(ps);
        setUnidades(us);
        const abierto = ps.find((p) => p.estado === "abierto");
        setPeriodoId((actual) => actual ?? abierto?.id ?? ps[0]?.id ?? null);
        if (ps.length === 0) setCargando(false);
      })
      .catch((e) => {
        setCargando(false);
        mostrarError(e instanceof Error ? e.message : "Error al cargar los períodos");
      });
  }, [puedeVer, mostrarError]);

  const cargar = useCallback(
    (id: string, unidad: string | null) => {
      setCargando(true);
      cargarPanelActividad(id, unidad)
        .then((p) => {
          setPanel(p);
          setEnVivo(new Set(p.conectados.map((c) => c.userId)));
          setMotivo(null);
        })
        .catch((e) => {
          // El 403 del backend trae su motivo escrito (ADR-015): se muestra ese
          // texto, no un "sin permisos" que se leería como falla del sistema.
          if (e instanceof ApiError && e.status === 403) setMotivo(e.motivo ?? e.message);
          else mostrarError(e instanceof Error ? e.message : "Error al cargar el panel");
        })
        .finally(() => setCargando(false));
    },
    [mostrarError]
  );

  useEffect(() => {
    if (periodoId) cargar(periodoId, unidadId);
  }, [periodoId, unidadId, cargar]);

  // --- Presencia en vivo ----------------------------------------------------
  // Llega solo al room del nivel central; a este rol, por definición, sí.
  useOrgSocket(token, {
    onPresenciaOrganizacion: (d) => setEnVivo(new Set(d.conectados.map((c) => c.userId))),
  });

  const terminoUnidad = terminologia.unidad ?? "delegación";
  const terminoUnidades = terminologia.unidades ?? "delegaciones";
  const periodo = periodos.find((p) => p.id === periodoId) ?? null;

  const filas = useMemo(
    () => (panel ? panel.funcionarios.map((f) => ({ ...f, conectado: enVivo.has(f.funcionarioId) })) : []),
    [panel, enVivo]
  );
  // Cuenta a TODOS los conectados, no solo a quien tiene cargo medido: la
  // tarjeta pregunta "quién está en la plataforma", y decir 0 mientras el
  // propio coordinador está mirando la pantalla sería sencillamente falso.
  const conectadosAhora = enVivo.size;

  if (!puedeVer) {
    return (
      <div className="act">
        <h2>Control de actividad</h2>
        <p className="act-403" role="note">
          <Lock size={18} strokeWidth={1.5} aria-hidden="true" />
          <span>
            Este panel cruza el registro de trabajo de cada funcionario con su conexión en línea.
            Solo lo ven el <strong>administrador</strong> y el <strong>coordinador</strong>, que son
            quienes deben acompañar a un equipo que se está quedando atrás. Es una restricción de
            proporcionalidad, no un permiso pendiente (Leyes 19.628 y 21.719).
          </span>
        </p>
      </div>
    );
  }

  return (
    <div className="act">
      {toast}
      <header className="act-header">
        <h2>Control de actividad</h2>
        <div className="act-filtros">
          <label className="act-filtro">
            <span className="etiqueta">Período</span>
            <select
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
          </label>
          <label className="act-filtro">
            <span className="etiqueta">{terminoUnidades}</span>
            <select
              className="campo"
              value={unidadId ?? ""}
              onChange={(e) => setUnidadId(e.target.value || null)}
            >
              <option value="">Todas</option>
              {unidades.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nombre}
                </option>
              ))}
            </select>
          </label>
        </div>
      </header>

      {/* Finalidad declarada, a la vista de quien lo usa. No es letra chica:
          es lo que separa acompañar de vigilar. */}
      <p className="act-proposito" role="note">
        Este panel muestra <strong>actividad de gestión</strong> —qué registró cada persona y hace
        cuánto—, no tiempo de pantalla ni minutos de conexión. Sirve para detectar a quién hay que
        acompañar antes de que se cierre el período. Cada consulta queda registrada en la bitácora
        de auditoría.
      </p>

      {motivo && (
        <p className="act-403" role="note">
          <Lock size={18} strokeWidth={1.5} aria-hidden="true" />
          <span>{motivo}</span>
        </p>
      )}

      {cargando && !panel && (
        <div className="act-skeleton" aria-hidden="true">
          <div className="skeleton" />
          <div className="skeleton" />
          <div className="skeleton" />
        </div>
      )}

      {panel && (
        <>
          <section className="act-kpis">
            <div className="card act-kpi">
              <span className="act-kpi-etiqueta">Sin registro en el período</span>
              <span className="act-kpi-valor act-kpi-valor--alerta">{panel.resumen.sinRegistro}</span>
              <span className="act-kpi-contexto">
                de {panel.resumen.medidos} con metas configuradas
              </span>
            </div>
            <div className="card act-kpi">
              <span className="act-kpi-etiqueta">Sin registrar hace días</span>
              <span className="act-kpi-valor">{panel.resumen.atrasados}</span>
              <span className="act-kpi-contexto">
                más de {panel.umbralDias} días
                {!panel.umbralConfirmado && " (umbral por confirmar)"}
              </span>
            </div>
            <div className="card act-kpi">
              <span className="act-kpi-etiqueta">Registrando</span>
              <span className="act-kpi-valor">{panel.resumen.alDia}</span>
              <span className="act-kpi-contexto">
                {panel.resumen.totalRegistradas} actividades en el período
              </span>
            </div>
            <div className="card act-kpi">
              <span className="act-kpi-etiqueta">
                <Radio size={14} strokeWidth={1.5} aria-hidden="true" /> En la plataforma ahora
              </span>
              <span className="act-kpi-valor">{conectadosAhora}</span>
              <span className="act-kpi-contexto">
                dato secundario: no se acumula tiempo de conexión
              </span>
            </div>
          </section>

          <section className="card act-tabla-card">
            <h3 className="act-titulo">
              Quién registra y quién no
              {periodo && (
                <span className="act-subtitulo">
                  {" "}
                  · día {periodo.diasTranscurridos} de {periodo.diasTotales}
                </span>
              )}
            </h3>
            <p className="act-sub">
              Ordenado por quien necesita atención primero, no por nombre. «Registradas» cuenta el
              trabajo ingresado; «validadas», el que ya pasó por el verificador y suma al avance.
            </p>
            <div className="act-tabla-envoltura">
              <table className="tabla-sgr">
                <thead>
                  <tr>
                    <th scope="col">Funcionario</th>
                    <th scope="col">{terminoUnidad}</th>
                    <th scope="col">Cargo</th>
                    <th scope="col" className="num">Registradas</th>
                    <th scope="col" className="num">Validadas</th>
                    <th scope="col" className="num">Promedio diario</th>
                    <th scope="col">Última actividad</th>
                    <th scope="col">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {filas.map((f) => {
                    const p = PRESENTACION_ESTADO[f.estado];
                    return (
                      <tr key={f.funcionarioId}>
                        <td>
                          <span className="act-persona">
                            {f.conectado && (
                              <span
                                className="act-punto-vivo"
                                title="En la plataforma en este momento"
                                aria-label="En la plataforma en este momento"
                              />
                            )}
                            {f.nombre}
                          </span>
                        </td>
                        <td>{f.unidadNombre ?? "—"}</td>
                        <td>{f.cargo ?? "—"}</td>
                        <td className="num">{f.registradas}</td>
                        <td className="num">{f.validadas}</td>
                        <td className="num">{f.promedioDiario.toFixed(2)}</td>
                        <td>
                          {fechaCorta(f.ultimaActividad)}
                          <span className="act-hace">{haceCuanto(f.diasSinRegistrar)}</span>
                        </td>
                        <td>
                          <ChipSemaforo semaforo={p.semaforo} texto={p.texto} ayuda={p.ayuda} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {filas.length === 0 && (
              <p className="act-vacio">
                Ninguna persona con metas configuradas en {unidadId ? `esta ${terminoUnidad}` : "la organización"}.
                El panel mide a quien tiene cargo e ítems asignados: eso se configura en{" "}
                Configuración de metas (RF-006).
              </p>
            )}
          </section>

          {/* Quien no tiene cargo medido no registra actividades por diseño.
              Listarlo como "sin registro" sería una alarma falsa, y un aviso que
              marca de más deja de avisar. */}
          {panel.sinMedicion.length > 0 && (
            <p className="act-nota" role="note">
              <strong>{panel.sinMedicion.length} personas sin cargo medido</strong> no aparecen en la
              tabla porque no registran actividades: {panel.sinMedicion.map((s) => s.nombre).join(", ")}.
            </p>
          )}
        </>
      )}
    </div>
  );
}
