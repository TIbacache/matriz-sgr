import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import {
  cargarKpis,
  resumirPorDelegacion,
  trimestresDisponibles,
  type FilaKpi,
  type TuboStat,
} from "../lib/dashboard";
import { useAuth } from "../context/AuthContext";
import { useTokens } from "../lib/useTokens";
import { useToast } from "../components/Toast";
import { KpiTile } from "../components/dashboard/KpiTile";
import { GaugeGrid } from "../components/dashboard/GaugeGrid";
import { HeatmapPilares } from "../components/dashboard/HeatmapPilares";
import { ProyeccionChart } from "../components/dashboard/ProyeccionChart";
import { RadarPilares } from "../components/dashboard/RadarPilares";
import { TuboStacked } from "../components/dashboard/TuboStacked";
import { TablaDetalle } from "../components/dashboard/TablaDetalle";
import "./dashboard.css";

export function DashboardPage() {
  const { usuario, terminologia } = useAuth();
  const t = useTokens();
  const { toast, mostrarError } = useToast();

  const [filas, setFilas] = useState<FilaKpi[]>([]);
  const [tubo, setTubo] = useState<TuboStat[]>([]);
  const [trimestre, setTrimestre] = useState<string | null>(null);
  const [seleccion, setSeleccion] = useState<string | null>(null);
  const [cargandoInicial, setCargandoInicial] = useState(true);
  const [refrescando, setRefrescando] = useState(false);

  const cargar = useCallback(
    (tri: string | null, esInicial = false) => {
      if (!esInicial) setRefrescando(true);
      cargarKpis(tri ?? undefined)
        .then(({ filas: f, tubo: tb }) => {
          setFilas(f);
          setTubo(tb);
          if (!tri) {
            const disponibles = trimestresDisponibles(f);
            if (disponibles[0]) setTrimestre(disponibles[0]);
          }
        })
        .catch((e) => mostrarError(e instanceof Error ? e.message : "Error al cargar KPIs"))
        .finally(() => {
          setCargandoInicial(false);
          setRefrescando(false);
        });
    },
    [mostrarError]
  );

  useEffect(() => cargar(null, true), [cargar]);

  const trimestres = useMemo(() => trimestresDisponibles(filas), [filas]);
  const filasTrimestre = useMemo(
    () => (trimestre ? filas.filter((f) => f.trimestre === trimestre) : filas),
    [filas, trimestre]
  );
  const resumen = useMemo(() => resumirPorDelegacion(filasTrimestre, tubo), [filasTrimestre, tubo]);

  // La selección (click en gauge, celda del heatmap, barra o fila) actúa como
  // filtro de las tarjetas KPI y del heatmap; las formas comparativas
  // (gauges, proyección, tabla) conservan el contexto y solo resaltan.
  const resumenFoco = seleccion ? resumen.filter((r) => r.unidadId === seleccion) : resumen;
  const filasHeatmap = seleccion
    ? filasTrimestre.filter((f) => f.unidad_territorial_id === seleccion)
    : filasTrimestre;

  const promedio = (xs: number[]) =>
    xs.length ? Math.round((xs.reduce((s, x) => s + x, 0) / xs.length) * 10) / 10 : 0;
  const avancePromedio = promedio(resumenFoco.map((r) => r.avanceRelativo));
  const proyeccionPromedio = promedio(resumenFoco.map((r) => r.proyeccion));
  const vencidasTotal = resumenFoco.reduce((s, r) => s + r.vencidas, 0);
  const enVerde = resumenFoco.filter((r) => r.semaforo === "verde").length;
  const objetivoHoy = resumenFoco[0]?.objetivoAlDia ?? 0;
  const nombreSeleccion = seleccion ? resumen.find((r) => r.unidadId === seleccion)?.nombre : null;

  const puedeRecalcular = usuario?.rol === "admin" || usuario?.rol === "supervisor";
  const recalcular = () => {
    setRefrescando(true);
    api
      .post("/kpis/recalcular", {})
      .then(() => cargar(trimestre))
      .catch((e) => {
        setRefrescando(false);
        mostrarError(e instanceof Error ? e.message : "No se pudo recalcular");
      });
  };

  const terminoUnidades = terminologia.unidades ?? "delegaciones";

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

  return (
    <div className="dash">
      {toast}
      <header className="dash-header">
        <h2>Dashboard</h2>
        {/* Una sola fila de filtros sobre todo lo que alcanzan (regla de la skill) */}
        <div className="dash-filtros">
          <label className="dash-filtro">
            <span className="etiqueta">Trimestre</span>
            <select
              className="campo"
              value={trimestre ?? ""}
              onChange={(e) => setTrimestre(e.target.value)}
            >
              {trimestres.map((tri) => (
                <option key={tri} value={tri}>{tri}</option>
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
          {puedeRecalcular && (
            <button className="btn-secundario" onClick={recalcular} disabled={refrescando}>
              {refrescando ? "Actualizando…" : "Recalcular"}
            </button>
          )}
        </div>
      </header>

      {/* Refetch conserva el marco a opacidad reducida: sin skeleton, sin salto */}
      <div className={refrescando ? "dash-contenido dash-contenido--refrescando" : "dash-contenido"}>
        <section className="dash-kpis">
          <KpiTile
            etiqueta={nombreSeleccion ? `Avance relativo · ${nombreSeleccion}` : "Avance relativo promedio"}
            valor={avancePromedio}
            sufijo="%"
            decimales={1}
            contexto={`objetivo al día ${objetivoHoy}%`}
            color={avancePromedio >= 100 ? t.verde : avancePromedio >= 60 ? t.amarillo : t.rojo}
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
            contexto="a ritmo actual, tope 150%"
            retraso={0.2}
          />
          <KpiTile
            etiqueta="Tareas vencidas"
            valor={vencidasTotal}
            contexto="pendientes o en proceso con fecha pasada"
            color={vencidasTotal > 0 ? t.rojo : undefined}
            retraso={0.3}
          />
        </section>

        <section className="card dash-card dash-card--completa">
          <h3 className="dash-card-titulo">Semáforo por {terminologia.unidad ?? "delegación"}</h3>
          <p className="dash-card-sub">
            Avance relativo al objetivo del día. Click en una para filtrar el resto del tablero.
          </p>
          <GaugeGrid resumen={resumen} seleccion={seleccion} onSeleccionar={setSeleccion} />
        </section>

        <section className="card dash-card">
          <h3 className="dash-card-titulo">Cumplimiento por pilar</h3>
          <p className="dash-card-sub">Cumplimiento de cada ítem (avance/meta, tope 150%)</p>
          <HeatmapPilares filas={filasHeatmap} onSeleccionar={setSeleccion} />
        </section>

        <section className="card dash-card">
          <h3 className="dash-card-titulo">Pilares: {nombreSeleccion ?? "mejor delegación"} vs promedio</h3>
          <p className="dash-card-sub">Selecciona una delegación para compararla</p>
          <RadarPilares filas={filasTrimestre} resumen={resumen} seleccion={seleccion} />
        </section>

        <section className="card dash-card">
          <h3 className="dash-card-titulo">Proyección al cierre del trimestre</h3>
          <p className="dash-card-sub">Hoy (claro) → proyección a ritmo actual (oscuro)</p>
          <ProyeccionChart resumen={resumen} seleccion={seleccion} />
        </section>

        <section className="card dash-card">
          <h3 className="dash-card-titulo">Carga del tubo de trabajo</h3>
          <p className="dash-card-sub">Tareas por estado en cada {terminologia.unidad ?? "delegación"}</p>
          <TuboStacked tubo={tubo} onSeleccionar={setSeleccion} />
        </section>

        <section className="card dash-card dash-card--completa">
          <h3 className="dash-card-titulo">Detalle por {terminologia.unidad ?? "delegación"}</h3>
          <TablaDetalle resumen={resumen} seleccion={seleccion} onSeleccionar={setSeleccion} />
        </section>
      </div>
    </div>
  );
}
