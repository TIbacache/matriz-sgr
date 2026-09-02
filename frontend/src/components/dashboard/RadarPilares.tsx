import { useMemo } from "react";
import ReactEChartsCore from "echarts-for-react/lib/core";
import { echarts, baseChart } from "../../lib/echarts";
import { useTokens } from "../../lib/useTokens";
import type { FilaKpi, ResumenDelegacion } from "../../lib/dashboard";
import { pilaresUnicos } from "../../lib/dashboard";

interface Props {
  filas: FilaKpi[];
  resumen: ResumenDelegacion[];
  seleccion: string | null;
}

// Radar de pilares en forma de ÉNFASIS (skill: "una serie es el punto, el
// resto es contexto"): la delegación seleccionada en el acento vs. el promedio
// de la organización en gris. Nunca las 6 a la vez (spaghetti ilegible).
export function RadarPilares({ filas, resumen, seleccion }: Props) {
  const t = useTokens();

  const opcion = useMemo(() => {
    const pilares = pilaresUnicos(filas);
    const promedio = pilares.map((p) => {
      const del = filas.filter((f) => f.categoria_nombre === p);
      return Math.round(del.reduce((s, f) => s + f.cumplimiento_categoria, 0) / Math.max(del.length, 1));
    });
    const elegida = seleccion
      ? resumen.find((r) => r.unidadId === seleccion)
      : resumen[0]; // sin selección: la mejor, como referencia
    const serieElegida = pilares.map(
      (p) => elegida?.porPilar.find((x) => x.categoria === p)?.cumplimiento ?? 0
    );
    const maximo = Math.max(150, ...promedio, ...serieElegida);

    return {
      ...baseChart(t),
      legend: {
        data: [elegida?.nombre ?? "", "Promedio organización"],
        bottom: 0,
        textStyle: { color: t.tinta2, fontSize: 11 },
        itemWidth: 14,
        itemHeight: 3,
      },
      radar: {
        indicator: pilares.map((p) => ({ name: p, max: maximo })),
        radius: "62%",
        center: ["50%", "46%"],
        axisName: { color: t.tinta2, fontSize: 11 },
        splitLine: { lineStyle: { color: t.borde } },
        splitArea: { show: false },
        axisLine: { lineStyle: { color: t.borde } },
      },
      tooltip: baseChart(t).tooltip,
      series: [
        {
          type: "radar",
          data: [
            {
              name: "Promedio organización",
              value: promedio,
              lineStyle: { color: t.tinta3, width: 2 },
              itemStyle: { color: t.tinta3 },
              areaStyle: { color: "transparent" },
              symbolSize: 5,
            },
            {
              name: elegida?.nombre ?? "",
              value: serieElegida,
              // Neutro de datos, no el acento: el rojo institucional nunca
              // pinta una serie (ADR-011).
              lineStyle: { color: t.tubo3, width: 2 },
              itemStyle: { color: t.tubo3, borderColor: t.superficie, borderWidth: 2 },
              // Lavado ~10% de opacidad según spec de área de la skill
              areaStyle: { color: t.tubo3, opacity: 0.1 },
              symbolSize: 7,
            },
          ],
        },
      ],
    };
  }, [filas, resumen, seleccion, t]);

  return <ReactEChartsCore echarts={echarts} option={opcion} style={{ height: 300, width: "100%" }} notMerge />;
}
