import { useCallback, useEffect, useMemo, useState } from "react";
import {
  cargarConsolidado,
  cargarPeriodos,
  promedio,
  resumirPorDelegacion,
  type ConsolidadoRespuesta,
  type TuboStat,
} from "../lib/dashboard";
import { avisoParametros } from "../lib/ficha";
import type { Periodo } from "../lib/types";
import { useAuth } from "../context/AuthContext";
import { useOrgSocket } from "../lib/useOrgSocket";
import { useTokens } from "../lib/useTokens";
import { useToast } from "../components/Toast";
import { KpiTile } from "../components/dashboard/KpiTile";
import { GaugeGrid } from "../components/dashboard/GaugeGrid";
import { HeatmapAreas } from "../components/dashboard/HeatmapAreas";
import { ProyeccionChart } from "../components/dashboard/ProyeccionChart";
import { RadarAreas } from "../components/dashboard/RadarAreas";
import { TuboStacked } from "../components/dashboard/TuboStacked";
import { TablaDetalle } from "../components/dashboard/TablaDetalle";
import "./dashboard.css";

// Tablero de gestión — RF-029 · EP-05.
//
// Bloque C: consume `GET /cumplimiento/:periodoId/consolidado`, que consolida
// el motor por funcionario. Antes leía la vista materializada v1 y por eso
// filtraba por el string "2026-Q3"; ahora el filtro es el `periodoId`, que es
// la entidad real (RF-005).
//
// La pantalla no calcula nada: ni la proyección, ni el avance relativo, ni el
// color. Todo eso son reglas de negocio con parámetros configurables (ADR-007)
// y viven en el backend.
export function DashboardPage() {
  // Sin `usuario`: el semáforo consolidado lo ve todo el mundo (cliente,
  // reunión 00:37:11) y ya no hay ninguna acción reservada a un rol — el botón
  // "Recalcular" (admin y coordinador) se fue con la vista materializada.
  const { terminologia, token } = useAuth();
  const t = useTokens();
  const { toast, mostrarError } = useToast();

  const [periodos, setPeriodos] = useState<Periodo[]>([]);
  const [periodoId, setPeriodoId] = useState<string | null>(null);
  const [datos, setDatos] = useState<ConsolidadoRespuesta | null>(null);
  const [tubo, setTubo] = useState<TuboStat[]>([]);
  const [seleccion, setSeleccion] = useState<string | null>(null);
  const [cargandoInicial, setCargandoInicial] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [hayDatosNuevos, setHayDatosNuevos] = useState(false);

  // --- Períodos: el abierto más reciente es el que se mira hoy --------------
  useEffect(() => {
    cargarPeriodos()
      .then((ps) => {
        setPeriodos(ps);
        const abierto = ps.find((p) => p.estado === "abierto");
        setPeriodoId((actual) => actual ?? abierto?.id ?? ps[0]?.id ?? null);
        if (ps.length === 0) setCargandoInicial(false);
      })
      .catch((e) => {
        setCargandoInicial(false);
        mostrarError(e instanceof Error ? e.message : "Error al cargar los períodos");
      });
  }, [mostrarError]);

  const cargar = useCallback(
    (id: string, esInicial = false) => {
      if (!esInicial) setRefrescando(true);
      cargarConsolidado(id)
        .then(({ consolidado, tubo: tb }) => {
          setDatos(consolidado);
          setTubo(tb);
          setHayDatosNuevos(false);
        })
        .catch((e) => mostrarError(e instanceof Error ? e.message : "Error al cargar el tablero"))
        .finally(() => {
          setCargandoInicial(false);
          setRefrescando(false);
        });
    },
    [mostrarError]
  );

  useEffect(() => {
    if (periodoId) cargar(periodoId, datos === null);
    // `datos` solo decide si es la primera carga; no debe volver a disparar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodoId, cargar]);

  // --- Tiempo real: una validación aprobada mueve el puntaje de alguien -----
  // Avisa, no recarga sola: el tablero es una pantalla que se mira fijo, y que
  // las cifras salten solas bajo la vista impide comparar (misma lección que la
  // bandeja y la pantalla de metas).
  useOrgSocket(token, {
    onCumplimientoCambiado: (d) => {
      if (d.periodoId === periodoId) setHayDatosNuevos(true);
    },
    onReconectado: () => setHayDatosNuevos(true),
  });

  const resumen = useMemo(
    () => (datos ? resumirPorDelegacion(datos, tubo) : []),
    [datos, tubo]
  );

  // La selección (click en gauge, celda del mapa, barra o fila) filtra las
  // tarjetas KPI; las formas comparativas conservan el contexto y resaltan.
  const resumenFoco = seleccion ? resumen.filter((r) => r.unidadId === seleccion) : resumen;
  const avancePromedio = promedio(resumenFoco.map((r) => r.avanceRelativo));
  const proyeccionPromedio = promedio(resumenFoco.map((r) => r.proyeccion));
  const vencidasTotal = resumenFoco.reduce((s, r) => s + r.vencidas, 0);
  const enVerde = resumenFoco.filter((r) => r.semaforo === "verde").length;
  const objetivoHoy = promedio(resumenFoco.map((r) => r.objetivoAlDia));
  const nombreSeleccion = seleccion ? resumen.find((r) => r.unidadId === seleccion)?.nombre : null;
  const medidos = resumenFoco.reduce((s, r) => s + r.funcionarios, 0);

  // Los cortes del semáforo son parámetros, no números de esta pantalla
  // (RF-027): la vista v1 los tenía escritos en SQL y por eso no se podían
  // cambiar por período.
  const umbrales = useMemo(
    () => ({
      verde: Math.round((datos?.parametros["semaforo_verde"]?.valor ?? 1) * 100),
      naranjo: Math.round((datos?.parametros["semaforo_naranjo"]?.valor ?? 0.6) * 100),
    }),
    [datos]
  );
  // Igual que los umbrales: el tope y el umbral mínimo son parámetros del
  // período, no números de esta pantalla. El 150 de la proyección y el 80 de la
  // línea "Ojo" estaban escritos a mano en el frontend hasta el Bloque C.
  const tope = Math.round((datos?.parametros["tope_cumplimiento_item"]?.valor ?? 1.5) * 100);
  const umbralMinimo = Math.round((datos?.parametros["umbral_minimo_colectivo"]?.valor ?? 0.8) * 100);
  const aviso = datos ? avisoParametros(datos.parametros) : null;

  const terminoUnidades = terminologia.unidades ?? "delegaciones";
  const terminoUnidad = terminologia.unidad ?? "delegación";
  const periodo = periodos.find((p) => p.id === periodoId) ?? null;

  if (cargandoInicial) {
    return (
      <div>
        <h2>Dashboard</h2>
        <div className="dash-skeleton" aria-hidden="true">
          <div className="skeleton" /><div className="skeleton" /><div className="skeleton" /><div className="skeleton" />
        </div>
      </div>
    );
  }

  if (!datos) {
    return (
      <div className="dash">
        {toast}
        <h2>Dashboard</h2>
        <p className="dash-aviso" role="note">
          No hay ningún período configurado todavía. El tablero mide un período (RF-005): créalo
          antes de esperar cifras aquí.
        </p>
      </div>
    );
  }

  return (
    <div className="dash">
      {toast}
      <header className="dash-header">
        <h2>Dashboard</h2>
        {/* Una sola fila de filtros sobre todo lo que alcanzan */}
        <div className="dash-filtros">
          <label className="dash-filtro">
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
          <label className="dash-filtro">
            <span className="etiqueta">{terminoUnidades}</span>
            <select
              className="campo"
              value={seleccion ?? ""}
              onChange={(e) => setSeleccion(e.target.value || null)}
            >
              <option value="">Todas</option>
              {resumen.map((r) => (
                <option key={r.unidadId} value={r.unidadId}>{r.nombre}</option>
              ))}
            </select>
          </label>
          {seleccion && (
            <button className="btn-secundario" onClick={() => setSeleccion(null)}>
              Limpiar filtro
            </button>
          )}
          <button
            className="btn-secundario"
            onClick={() => periodoId && cargar(periodoId)}
            disabled={refrescando}
          >
            {refrescando ? "Actualizando…" : "Actualizar"}
          </button>
        </div>
      </header>

      {/* Aviso persistente, no un toast: es una condición del dato, no un
          evento que pasó (misma regla que el conflicto del tubo). */}
      {hayDatosNuevos && (
        <p className="dash-aviso dash-aviso--vivo" role="status">
          Se aprobó evidencia nueva en este período: las cifras de abajo ya no son las últimas.
          <button className="btn-tabla" onClick={() => periodoId && cargar(periodoId)}>
            Actualizar
          </button>
        </p>
      )}

      {/* ADR-007: un número que todavía espera definición del docente no se
          presenta como definitivo. */}
      {aviso && <p className="dash-aviso" role="note">{aviso}</p>}

      {/* Una delegación sin nadie con metas NO cumple 0%: no tiene medición.
          Antes esa diferencia no existía y el hueco se leía como mal desempeño. */}
      {datos.sinMedicion.length > 0 && (
        <p className="dash-aviso" role="note">
          Sin medición en este período:{" "}
          <strong>{datos.sinMedicion.map((u) => u.nombre).join(", ")}</strong>. No tienen ningún
          funcionario con metas configuradas, así que no aparecen en el tablero. Se configuran en{" "}
          Configuración de metas (RF-006).
        </p>
      )}

      {/* Refetch conserva el marco a opacidad reducida: sin skeleton, sin salto */}
      <div className={refrescando ? "dash-contenido dash-contenido--refrescando" : "dash-contenido"}>
        <section className="dash-kpis">
          <KpiTile
            etiqueta={nombreSeleccion ? `Avance relativo · ${nombreSeleccion}` : "Avance relativo promedio"}
            valor={avancePromedio}
            sufijo="%"
            decimales={1}
            contexto={`objetivo al día ${objetivoHoy}%`}
            color={
              avancePromedio >= umbrales.verde
                ? t.verde
                : avancePromedio >= umbrales.naranjo
                  ? t.amarillo
                  : t.rojo
            }
            retraso={0}
          />
          <KpiTile
            etiqueta="Al día (verde)"
            valor={enVerde}
            sufijo={` de ${resumenFoco.length}`}
            contexto={nombreSeleccion ? "con el filtro activo" : `${terminoUnidades} en verde hoy`}
            retraso={0.1}
          />
          <KpiTile
            etiqueta="Proyección al cierre"
            valor={proyeccionPromedio}
            sufijo="%"
            decimales={1}
            contexto={`a ritmo actual, tope ${tope}%`}
            retraso={0.2}
          />
          <KpiTile
            etiqueta="Funcionarios medidos"
            valor={medidos}
            contexto={
              periodo ? `día ${periodo.diasTranscurridos} de ${periodo.diasTotales}` : "con metas configuradas"
            }
            retraso={0.3}
          />
          <KpiTile
            etiqueta="Tareas vencidas"
            valor={vencidasTotal}
            contexto="pendientes o en proceso con fecha pasada"
            color={vencidasTotal > 0 ? t.rojo : undefined}
            retraso={0.4}
          />
        </section>

        <section className="card dash-card dash-card--completa">
          <h3 className="dash-card-titulo">Semáforo por {terminoUnidad}</h3>
          <p className="dash-card-sub">
            Avance relativo al objetivo del día, promediando a los funcionarios de cada{" "}
            {terminoUnidad}. Click en una para filtrar el resto del tablero.
          </p>
          <GaugeGrid resumen={resumen} seleccion={seleccion} onSeleccionar={setSeleccion} />
        </section>

        <section className="card dash-card">
          <h3 className="dash-card-titulo">Avance por área</h3>
          <p className="dash-card-sub">
            Área del cargo (T OO CC, SOCIAL, APOY ADM…) en cada {terminoUnidad}. Sin celda = esa{" "}
            {terminoUnidad} no tiene a nadie de esa área.
          </p>
          <HeatmapAreas
            resumen={resumen}
            areas={datos.areas}
            umbrales={umbrales}
            onSeleccionar={setSeleccion}
          />
        </section>

        <section className="card dash-card">
          <h3 className="dash-card-titulo">
            Áreas: {nombreSeleccion ?? `mejor ${terminoUnidad}`} vs promedio
          </h3>
          <p className="dash-card-sub">Selecciona una {terminoUnidad} para compararla</p>
          <RadarAreas resumen={resumen} areas={datos.areas} seleccion={seleccion} tope={tope} />
        </section>

        <section className="card dash-card">
          <h3 className="dash-card-titulo">Proyección al cierre del período</h3>
          <p className="dash-card-sub">Hoy (claro) → proyección a ritmo actual (oscuro)</p>
          <ProyeccionChart
            resumen={resumen}
            seleccion={seleccion}
            tope={tope}
            umbralMinimo={umbralMinimo}
          />
        </section>

        <section className="card dash-card">
          <h3 className="dash-card-titulo">Carga del tubo de trabajo</h3>
          <p className="dash-card-sub">Tareas por estado en cada {terminoUnidad}</p>
          <TuboStacked tubo={tubo} onSeleccionar={setSeleccion} />
        </section>

        <section className="card dash-card dash-card--completa">
          <h3 className="dash-card-titulo">Detalle por {terminoUnidad}</h3>
          <TablaDetalle resumen={resumen} seleccion={seleccion} onSeleccionar={setSeleccion} />
        </section>
      </div>
    </div>
  );
}
