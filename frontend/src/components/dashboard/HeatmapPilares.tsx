import { useMemo } from "react";
import ReactEChartsCore from "echarts-for-react/lib/core";
import { echarts, baseChart } from "../../lib/echarts";
import { useTokens } from "../../lib/useTokens";
import type { FilaKpi } from "../../lib/dashboard";
import { pilaresUnicos } from "../../lib/dashboard";

interface Props {
  filas: FilaKpi[];
  onSeleccionar: (unidadId: string) => void;
}

// Heatmap delegación × pilar. La celda muestra el cumplimiento del ítem
// (avance/meta, tope 150) con la escala SEMÁNTICA del semáforo en clases
// discretas (visualMap piecewise) — la excepción legal de "semantic heat"
// de la skill, siempre con leyenda de escala. El valor va rotulado en la
// celda (blanco o tinta según luminancia del fondo). Click → drill-down.
export function HeatmapPilares({ filas, onSeleccionar }: Props) {
  const t = useTokens();

  const { opcion, unidadesOrden } = useMemo(() => {
    const pilares = pilaresUnicos(filas);
    const unidades = [...new Set(filas.map((f) => f.unidad_nombre))];
    const idPorNombre = new Map(filas.map((f) => [f.unidad_nombre, f.unidad_territorial_id]));
    const datos = filas.map((f) => [
      pilares.indexOf(f.categoria_nombre),
      unidades.indexOf(f.unidad_nombre),
      f.cumplimiento_categoria,
    ]);

    const opcion = {
      ...baseChart(t),
      grid: { left: 8, right: 8, top: 8, bottom: 56, containLabel: true },
      xAxis: {
        type: "category",
        data: pilares,
        position: "top",
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: t.tinta2, fontSize: 11, interval: 0, width: 90, overflow: "break" as const },
        splitArea: { show: false },
      },
      yAxis: {
        type: "category",
        data: unidades,
        inverse: true,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: t.tinta, fontSize: 12 },
      },
      visualMap: {
        type: "piecewise",
        // Clases = exactamente el modelo mental del cliente (no un gradiente):
        pieces: [
          { lt: 60, color: t.rojo, label: "Crítico (<60%)" },
          { gte: 60, lt: 100, color: t.amarillo, label: "Atención (60–99%)" },
          { gte: 100, color: t.verde, label: "Al día (≥100%)" },
        ],
        orient: "horizontal",
        left: "center",
        bottom: 0,
        itemWidth: 12,
        itemHeight: 12,
        textStyle: { color: t.tinta2, fontSize: 11 },
      },
      tooltip: {
        ...baseChart(t).tooltip,
        formatter: (p: { value: number[] }) =>
          `<strong>${unidades[p.value[1]!]}</strong> · ${pilares[p.value[0]!]}<br/>` +
          `Cumplimiento del pilar: <strong>${p.value[2]}%</strong>`,
      },
      series: [
        {
          type: "heatmap",
          data: datos,
          label: {
            show: true,
            formatter: (p: { value: number[] }) => `${Math.round(p.value[2]!)}`,
            fontSize: 11,
            fontWeight: 600,
            // Blanco sobre fondos saturados del semáforo: los tres superan 3:1
            color: "#ffffff",
          },
          itemStyle: {
            // El espaciador de la skill: gap de 2px en color de superficie
            borderColor: t.superficie,
            borderWidth: 2,
            borderRadius: 3,
          },
          emphasis: { itemStyle: { shadowBlur: 6, shadowColor: "rgba(0,0,0,0.25)" } },
        },
      ],
    };
    return { opcion, unidadesOrden: unidades.map((n) => idPorNombre.get(n)!) };
  }, [filas, t]);

  return (
    <ReactEChartsCore
      echarts={echarts}
      option={opcion}
      style={{ height: 300, width: "100%" }}
      notMerge
      onEvents={{
        click: (p: { value?: number[] }) => {
          const idx = p.value?.[1];
          if (typeof idx === "number" && unidadesOrden[idx]) onSeleccionar(unidadesOrden[idx]!);
        },
      }}
    />
  );
}
