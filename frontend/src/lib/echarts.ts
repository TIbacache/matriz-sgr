// Registro MODULAR de ECharts: solo los gráficos y componentes que usamos,
// para mantener el bundle liviano (criterio: dashboard < 2s).
import * as echarts from "echarts/core";
import { BarChart, GaugeChart, HeatmapChart, RadarChart, CustomChart, ScatterChart } from "echarts/charts";
import {
  GridComponent,
  LegendComponent,
  MarkLineComponent,
  TooltipComponent,
  VisualMapComponent,
} from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import type { Tokens } from "./useTokens";

echarts.use([
  BarChart,
  GaugeChart,
  HeatmapChart,
  RadarChart,
  CustomChart,
  ScatterChart,
  GridComponent,
  LegendComponent,
  MarkLineComponent,
  TooltipComponent,
  VisualMapComponent,
  CanvasRenderer,
]);

export { echarts };

// Base común de toda instancia: tipografía del sistema, tooltip sobrio con
// tokens, y animación apagada si el usuario pide reduced-motion.
export function baseChart(t: Tokens) {
  return {
    animation: !t.reducirMovimiento,
    animationDuration: 400,
    animationEasing: "cubicOut" as const,
    textStyle: { fontFamily: t.fontCuerpo, color: t.tinta2 },
    tooltip: {
      backgroundColor: t.superficie,
      borderColor: t.borde,
      borderWidth: 1,
      padding: [8, 12],
      textStyle: { color: t.tinta, fontFamily: t.fontCuerpo, fontSize: 12 },
      extraCssText: "box-shadow: 0 4px 12px rgba(0,0,0,.12); border-radius: 4px;",
    },
  };
}

// Ejes recesivos según la skill: hairline sólida, un paso sobre la superficie.
export function ejesRecesivos(t: Tokens) {
  return {
    axisLine: { lineStyle: { color: t.borde } },
    axisTick: { show: false },
    axisLabel: { color: t.tinta2, fontSize: 11 },
    splitLine: { lineStyle: { color: t.borde, width: 1, type: "solid" as const } },
  };
}
