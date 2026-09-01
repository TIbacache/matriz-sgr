import { useCallback, useEffect, useMemo, useState } from "react";
import { api, ApiError } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/Toast";
import { useUnidadSocket } from "../lib/useUnidadSocket";
import {
  construirFilas,
  cuerpoGuardado,
  estadoSuma,
  repartirIgual,
  validarFilas,
  type FilaMeta,
} from "../lib/metas";
import type {
  Cargo,
  CumplimientoRespuesta,
  ListaMetas,
  MiembroDirectorio,
  Periodo,
  UnidadTerritorial,
} from "../lib/types";
import { TablaMetas } from "../components/metas/TablaMetas";
import { TotalizadorMetas } from "../components/metas/TotalizadorMetas";
import "./metas.css";

/** Espejo de `requireRol("admin", "supervisor")` del backend. El servidor manda. */
const PUEDEN_CONFIGURAR = ["admin", "supervisor"];

// Configuración de metas por funcionario — RF-006 · RF-007 · RN-001 · HU-05.
//
// Aquí se decide qué se le mide a una persona y con qué peso. Todo lo que se
// calcula después —el semáforo, la ficha, el dashboard— cuelga de esto, así que
// la pantalla está construida alrededor de una sola idea: que sea imposible
// guardar un reparto que no cuadre, y que se vea en todo momento cuánto falta
// (DESIGN §8.2).
//
// Se guarda el CONJUNTO completo con un PUT, no fila por fila: es la única
// operación que puede garantizar RN-001, y evita dejar estados intermedios
// inválidos en la base.
export function MetasPage() {
  const { usuario, token } = useAuth();
  const { toast, mostrarError } = useToast();

  const [periodos, setPeriodos] = useState<Periodo[]>([]);
  const [periodoId, setPeriodoId] = useState<string | null>(null);
  const [directorio, setDirectorio] = useState<MiembroDirectorio[]>([]);
  const [unidades, setUnidades] = useState<UnidadTerritorial[]>([]);
  const [cargos, setCargos] = useState<Cargo[]>([]);
  const [funcionarioId, setFuncionarioId] = useState<string | null>(null);
  const [filas, setFilas] = useState<FilaMeta[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [sucio, setSucio] = useState(false);
  const [conflicto, setConflicto] = useState<string | null>(null);
  const [avisoExterno, setAvisoExterno] = useState(false);

  const puedeConfigurar = PUEDEN_CONFIGURAR.includes(usuario?.rol ?? "");

  // --- Carga inicial --------------------------------------------------------
  useEffect(() => {
    Promise.all([
      api.get<Periodo[]>("/periodos"),
      api.get<MiembroDirectorio[]>("/usuarios"),
      api.get<Cargo[]>("/cargos"),
      api.get<UnidadTerritorial[]>("/unidades"),
    ])
      .then(([ps, us, cs, uns]) => {
        setPeriodos(ps);
        setDirectorio(us);
        setCargos(cs);
        setUnidades(uns);
        const abierto = ps.find((p) => p.estado === "abierto");
        setPeriodoId((actual) => actual ?? abierto?.id ?? ps[0]?.id ?? null);
      })
      .catch((e) => mostrarError(e instanceof Error ? e.message : "Error al cargar la configuración"))
      .finally(() => setCargando(false));
  }, [mostrarError]);

  // Quién se puede ofrecer en el selector. Tres filtros, y los tres importan:
  //
  // 1. **Tener cargo**: sin cargo no hay ítems que medir (RF-003).
  // 2. **Ser de una delegación visible para este rol** (regla 9). Ofrecer a
  //    alguien que el servidor no deja consultar termina en un 404 al cargar y
  //    una pantalla con un error que la persona no provocó — es exactamente el
  //    fallo que dejó el tubo cargando para el verificador.
  // 3. **Solo la jefatura ve las metas de otros.** Las metas y el avance de una
  //    persona son su evaluación de desempeño: dato personal que solo debe ver
  //    quien tiene necesidad de conocerlo (Ley 19.628 y 21.719 sobre datos
  //    personales). Un funcionario ve las suyas y nada más, igual que en
  //    `/ficha`, donde `puedeElegirPersona` ya excluye al rol `usuario`.
  //    ⚠ Consulta abierta nº 11 al docente: si un funcionario puede ver las
  //    metas de sus pares. Mientras no se responda, rige lo restrictivo.
  const configurables = useMemo(() => {
    const visibles = new Set(unidades.filter((u) => u.puedeVerLibro).map((u) => u.id));
    const central = usuario?.rol === "admin" || usuario?.rol === "supervisor";
    const jefatura = central || usuario?.rol === "gerente";
    return directorio
      .filter((m) => m.cargoId !== null)
      .filter(
        (m) =>
          central ||
          m.userId === usuario?.id ||
          (jefatura && m.unidad !== null && visibles.has(m.unidad.id))
      )
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [directorio, unidades, usuario]);

  useEffect(() => {
    const primero = configurables[0];
    if (!funcionarioId && primero) setFuncionarioId(primero.userId);
  }, [configurables, funcionarioId]);

  // Quien no tiene cargo no tiene metas: ofrecerle "tu propia medición" sería
  // mandarlo a una ficha vacía.
  const tieneMedicionPropia = directorio.some((m) => m.userId === usuario?.id && m.cargoId);
  const miembro = configurables.find((m) => m.userId === funcionarioId) ?? null;
  const cargo = cargos.find((c) => c.id === miembro?.cargoId) ?? null;
  const periodo = periodos.find((p) => p.id === periodoId) ?? null;
  const periodoAbierto = periodo?.estado === "abierto";
  const editable = puedeConfigurar && periodoAbierto;

  // --- Metas vigentes del funcionario en el período -------------------------
  const cargarMetas = useCallback(async () => {
    if (!periodoId || !funcionarioId || !cargo) return;
    setCargando(true);
    try {
      // El avance validado sale del motor de cálculo, que ya cuenta SOLO lo
      // aprobado (RN-009): no hace falta un endpoint nuevo para saber qué ítem
      // no se puede quitar.
      const [lista, cumplimiento] = await Promise.all([
        api.get<ListaMetas>(`/metas-item?periodo=${periodoId}&funcionario=${funcionarioId}`),
        api.get<CumplimientoRespuesta>(`/cumplimiento/${periodoId}?funcionario=${funcionarioId}`),
      ]);
      const ficha = cumplimiento.funcionarios.find((f) => f.funcionarioId === funcionarioId);
      const avancePorItem = new Map((ficha?.items ?? []).map((i) => [i.itemId, i.avance]));
      setFilas(construirFilas(cargo.items, lista.metas, avancePorItem));
      setSucio(false);
      setConflicto(null);
      setAvisoExterno(false);
    } catch (e) {
      mostrarError(e instanceof Error ? e.message : "Error al cargar las metas");
    } finally {
      // Se apaga SIEMPRE, incluso al fallar: un esqueleto perpetuo es el error
      // que ya nos costó el tubo del verificador (DESIGN §7).
      setCargando(false);
    }
  }, [periodoId, funcionarioId, cargo, mostrarError]);

  useEffect(() => {
    void cargarMetas();
  }, [cargarMetas]);

  // --- Tiempo real: alguien más reconfiguró a esta persona -------------------
  // Avisa, no recarga sola: mover los campos bajo el cursor de quien está
  // escribiendo es la forma más rápida de provocar un error (misma lección que
  // la bandeja).
  useUnidadSocket(token, miembro?.unidad?.id ?? null, {
    onMetaCambiada: (d) => {
      if (d.periodoId === periodoId && d.funcionarioId === funcionarioId) setAvisoExterno(true);
    },
    onReconectado: () => setAvisoExterno(true),
  });

  const suma = useMemo(() => estadoSuma(filas), [filas]);
  const problemas = useMemo(() => validarFilas(filas), [filas]);

  const cambiarFila = (itemId: string, cambio: Partial<FilaMeta>) => {
    setSucio(true);
    setFilas((prev) => prev.map((f) => (f.itemId === itemId ? { ...f, ...cambio } : f)));
  };

  const guardar = async () => {
    if (!periodoId || !funcionarioId) return;
    setGuardando(true);
    setConflicto(null);
    try {
      const respuesta = await api.put<ListaMetas & { metas: ListaMetas["metas"] }>("/metas-item", {
        periodoId,
        funcionarioId,
        metas: cuerpoGuardado(filas),
      });
      // Se relee de la respuesta: las versiones cambiaron y el próximo guardado
      // las necesita (CA-08).
      const avancePorItem = new Map(filas.map((f) => [f.itemId, f.avance]));
      setFilas(construirFilas(cargo?.items ?? [], respuesta.metas, avancePorItem));
      setSucio(false);
      setAvisoExterno(false);
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        setConflicto(e.message);
      } else {
        mostrarError(e instanceof Error ? e.message : "No se pudo guardar la configuración");
      }
    } finally {
      setGuardando(false);
    }
  };

  if (!usuario) return null;

  const puedeGuardar = editable && sucio && suma.cuadrado && problemas.length === 0 && !guardando;

  return (
    <div className="metas">
      {toast}

      <header className="metas-header">
        <div>
          <h2>Configuración de metas</h2>
          <p className="metas-header-sub">
            Qué se le mide a cada persona y con qué peso. Los ponderadores de un funcionario deben
            sumar 100% (RN-001), y las metas rigen solo para el período en que se cargan.
          </p>
        </div>

        {/* Sin nadie que configurar, los filtros no filtran nada: un control
            vacío invita a interactuar con algo que no responde (DESIGN §7, la
            lección del tubo del verificador). */}
        {configurables.length > 0 && (
          <div className="metas-filtros">
            <div className="metas-filtro">
              <label className="etiqueta" htmlFor="me-periodo">Período</label>
              <select
                id="me-periodo"
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

            {/* Con una sola persona (un funcionario mirando lo suyo) el
                desplegable no ofrece elección: se muestra el nombre y ya. */}
            {configurables.length > 1 && (
              <div className="metas-filtro">
                <label className="etiqueta" htmlFor="me-persona">Funcionario</label>
                <select
                  id="me-persona"
                  className="campo"
                  value={funcionarioId ?? ""}
                  onChange={(e) => setFuncionarioId(e.target.value)}
                >
                  {configurables.map((m) => (
                    <option key={m.userId} value={m.userId}>
                      {m.nombre} — {m.cargo}
                      {m.unidad ? ` (${m.unidad.nombre})` : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}
      </header>

      {/* Quien no puede editar ve la pantalla igual, en lectura y con el motivo:
          ni página en blanco ni 403 crudo (DESIGN §8.2.8). Si además no tiene
          nada que mirar, basta con el vacío explicado de abajo: dos mensajes
          seguidos diciendo cosas parecidas se leen como ninguno. */}
      {!puedeConfigurar && configurables.length > 0 && (
        <p className="metas-aviso" role="note">
          Estás viendo esta pantalla en modo lectura: configurar metas es tarea de administración y
          coordinación (RNF-005).{" "}
          {tieneMedicionPropia && (
            <>
              Tu propia medición está en <strong>Ficha personal</strong>.
            </>
          )}
        </p>
      )}

      {periodo && !periodoAbierto && (
        <p className="metas-aviso" role="note">
          El período «{periodo.nombre}» está cerrado: sus metas quedaron congeladas y no se modifican
          (RN-013). Para cambiar lo que se mide, configura el período siguiente.
        </p>
      )}

      {avisoExterno && (
        <p className="metas-aviso metas-aviso--vivo" role="status">
          Otra persona cambió las metas de este funcionario mientras mirabas esta pantalla.
          <button className="btn-tabla" onClick={() => void cargarMetas()}>
            Ver lo vigente
          </button>
        </p>
      )}

      {conflicto && (
        <p className="metas-aviso metas-aviso--conflicto" role="alert">
          {conflicto}
          <button className="btn-tabla" onClick={() => void cargarMetas()}>
            Recargar y volver a intentar
          </button>
        </p>
      )}

      {cargando ? (
        <div className="skeleton metas-skeleton" aria-hidden="true" />
      ) : configurables.length === 0 ? (
        /* Todo vacío explica su causa y ofrece lo que SÍ corresponde a ese rol
           (DESIGN §7). Las dos causas posibles son distintas y no se pueden
           confundir en un solo mensaje. */
        <section className="card metas-bloque">
          {directorio.some((m) => m.cargoId) ? (
            <p className="vacio">
              Tu rol no tiene una delegación asignada, y el libro de cada delegación es privado
              (regla del cliente): por eso no hay funcionarios que configurar aquí.
              {usuario.rol === "verificador" && (
                <> Tu trabajo está en <strong>Verificación</strong>.</>
              )}
              {usuario.rol === "consulta" && (
                <> El consolidado que sí puedes ver está en <strong>Dashboard</strong>.</>
              )}
            </p>
          ) : (
            <p className="vacio">
              Nadie tiene un cargo asignado todavía. Sin cargo no hay ítems que medir (RF-003):
              primero hay que asociar cada persona a su cargo.
            </p>
          )}
        </section>
      ) : !cargo ? (
        <section className="card metas-bloque">
          <p className="vacio">
            {miembro?.nombre} no tiene un cargo del modelo vigente, así que no hay ítems que
            ofrecerle. Asígnale un cargo antes de configurar sus metas (RF-003).
          </p>
        </section>
      ) : cargo.items.length === 0 ? (
        <section className="card metas-bloque">
          <p className="vacio">
            El cargo «{cargo.nombre}» no tiene ítems de medición activos. Créalos primero: son lo que
            define qué se le mide a quien ocupa ese cargo (RF-003).
          </p>
        </section>
      ) : (
        <>
          <section className="card metas-contexto">
            <div>
              <h3 className="metas-nombre">{miembro?.nombre}</h3>
              <p className="metas-meta">
                {cargo.nombre}
                {miembro?.unidad ? ` · ${miembro.unidad.nombre}` : " · nivel central"}
                {periodo ? ` · ${periodo.nombre}` : ""}
              </p>
            </div>
            <TotalizadorMetas suma={suma} />
          </section>

          <section className="card metas-bloque" aria-label="Ítems del cargo">
            <div className="metas-bloque-cabecera">
              <div>
                <h3 className="metas-bloque-titulo">Ítems del cargo «{cargo.nombre}»</h3>
                <p className="metas-bloque-sub">
                  {editable
                    ? "Se muestran todos los ítems del cargo. Desmarca los que no se le miden a esta persona; el avance cuenta solo actividades con evidencia validada (RN-009)."
                    : "Se muestran todos los ítems del cargo. Los desmarcados no se le miden a esta persona; el avance cuenta solo actividades con evidencia validada (RN-009)."}
                </p>
              </div>
              {editable && (
                <button
                  className="btn-secundario"
                  onClick={() => {
                    setSucio(true);
                    setFilas((prev) => repartirIgual(prev));
                  }}
                >
                  Repartir 100% en partes iguales
                </button>
              )}
            </div>

            <TablaMetas
              filas={filas}
              problemas={problemas}
              editable={editable}
              onCambiar={cambiarFila}
            />

            {editable && (
              <div className="metas-acciones">
                <p className="metas-acciones-estado" role="status">
                  {problemas.length > 0
                    ? "Revisa los ítems marcados antes de guardar."
                    : suma.cuadrado
                      ? sucio
                        ? "Listo para guardar."
                        : "Sin cambios pendientes."
                      : suma.mensaje}
                </p>
                <div className="metas-acciones-botones">
                  <button
                    className="btn-secundario"
                    onClick={() => void cargarMetas()}
                    disabled={!sucio || guardando}
                  >
                    Descartar cambios
                  </button>
                  <button className="btn-primario" onClick={() => void guardar()} disabled={!puedeGuardar}>
                    {guardando ? "Guardando…" : "Guardar configuración"}
                  </button>
                </div>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
