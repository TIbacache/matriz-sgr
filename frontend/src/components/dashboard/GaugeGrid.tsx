import ReactEChartsCore from "echarts-for-react/lib/core";
import { echarts, baseChart } from "../../lib/echarts";
import { useTokens, colorSemaforo, SIMBOLO_SEMAFORO } from "../../lib/useTokens";
import type { ResumenDelegacion } from "../../lib/dashboard";

interface Props {
  resumen: ResumenDelegacion[];
  seleccion: string | null;
  onSeleccionar: (unidadId: string | null) => void;
}

// El semáforo del cliente: un gauge por delegación (mandato del documento
// maestro) con el AVANCE RELATIVO al objetivo del día. Bandas fijas del
// semáforo en el arco (rojo <60, naranjo 60-100, verde >=100) y la aguja
// marcando dónde está la delegación. Click = drill-down (filtra el dashboard).
export function GaugeGrid({ resumen, seleccion, onSeleccionar }: Props) {
  const t = useTokens();

  const opcionGauge = (r: ResumenDelegacion) => ({
    ...baseChart(t),
    series: [
      {
        type: "gauge",
        startAngle: 200,
        endAngle: -20,
        min: 0,
        max: 150,
        splitNumber: 5,
        radius: "95%",
        center: ["50%", "62%"],
        axisLine: {
          lineStyle: {
            width: 10,
            color: [
              [60 / 150, t.rojoBg],
              [100 / 150, t.amarilloBg],
              [1, t.verdeBg],
            ],
          },
        },
        pointer: { width: 3, length: "58%", itemStyle: { color: colorSemaforo(r.avanceRelativo, t) } },
        anchor: { show: true, size: 6, itemStyle: { color: colorSemaforo(r.avanceRelativo, t) } },
        axisTick: { show: false },
        splitLine: { length: 4, lineStyle: { color: t.borde, width: 1 } },
        axisLabel: { show: false },
        title: { show: false },
        detail: {
          offsetCenter: [0, "36%"],
          formatter: (v: number) => `${Math.round(v)}%`,
          color: t.tinta,
          fontSize: 22,
          fontWeight: 700,
          fontFamily: "Space Grotesk, sans-serif",
        },
        data: [{ value: Math.min(r.avanceRelativo, 150) }],
      },
    ],
  });

  return (
    <div className="gauges-grid">
      {resumen.map((r) => {
        const activa = seleccion === r.unidadId;
        return (
          <button
            key={r.unidadId}
            className={`card card--interactiva gauge-card${activa ? " gauge-card--activa" : ""}${
              seleccion && !activa ? " gauge-card--apagada" : ""
            }`}
            onClick={() => onSeleccionar(activa ? null : r.unidadId)}
            aria-pressed={activa}
            title={`${r.nombre}: avance relativo ${r.avanceRelativo}% (objetivo al día ${r.objetivoAlDia}%)`}
          >
            <span className="gauge-nombre">{r.nombre}</span>
            <ReactEChartsCore
              echarts={echarts}
              option={opcionGauge(r)}
              style={{ height: 120, width: "100%", pointerEvents: "none" }}
              notMerge
            />
            <span
              className="gauge-chip"
              style={{
                background: r.semaforo === "verde" ? t.verdeBg : r.semaforo === "naranjo" ? t.amarilloBg : t.rojoBg,
                color: `var(--estado-${r.semaforo === "naranjo" ? "amarillo" : r.semaforo}-texto)`,
              }}
            >
              {SIMBOLO_SEMAFORO[r.semaforo]} {r.semaforo === "verde" ? "Al día" : r.semaforo === "naranjo" ? "Atención" : "Crítico"}
            </span>
          </button>
        );
      })}
    </div>
  );
}
