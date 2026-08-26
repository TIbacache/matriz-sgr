import { useMemo } from "react";
import ReactEChartsCore from "echarts-for-react/lib/core";
import { echarts, baseChart, ejesRecesivos } from "../../lib/echarts";
import { useTokens } from "../../lib/useTokens";
import type { ResumenDelegacion } from "../../lib/dashboard";

interface Props {
  resumen: ResumenDelegacion[];
  seleccion: string | null;
}

// Proyección a fin de trimestre, a ritmo actual — forma dumbbell de la skill
// ("antes → después por ítem: un tono, dos intensidades"): punto claro = hoy,
// punto oscuro = proyección, unidos por una línea. Referencias verticales en
// 100% (meta) y 80% (el "ojo" del cliente). Un solo tono petróleo; el estado
// ya lo dicen los gauges — aquí el trabajo es la analítica, no el color.
export function ProyeccionChart({ resumen, seleccion }: Props) {
  const t = useTokens();

  const opcion = useMemo(() => {
    const orden = [...resumen].sort((a, b) => a.proyeccion - b.proyeccion);
    const nombres = orden.map((r) => r.nombre);
    const maxX = Math.max(150, ...orden.map((r) => r.proyeccion)) + 10;

    return {
      ...baseChart(t),
      grid: { left: 8, right: 48, top: 28, bottom: 8, containLabel: true },
      xAxis: {
        type: "value",
        min: 0,
        max: maxX,
        ...ejesRecesivos(t),
        axisLabel: { color: t.tinta2, fontSize: 11, formatter: "{value}%" },
      },
      yAxis: {
        type: "category",
        data: nombres,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          color: t.tinta,
          fontSize: 12,
          formatter: (nombre: string) => nombre,
        },
        splitLine: { show: false },
      },
      tooltip: {
        ...baseChart(t).tooltip,
        formatter: (p: { dataIndex: number }) => {
          const r = orden[p.dataIndex]!;
          return (
            `<strong>${r.nombre}</strong><br/>` +
            `Hoy: <strong>${r.cumplimiento}%</strong> (día ${r.diasTranscurridos} de ${r.diasEfectivos})<br/>` +
            `Proyección al cierre: <strong>${r.proyeccion}%</strong><br/>` +
            `<span style="color:${t.tinta2}">a ritmo actual, tope 150%</span>`
          );
        },
      },
      series: [
        // La línea del dumbbell
        {
          type: "custom",
          renderItem: (
            _params: unknown,
            api: { value: (i: number) => number; coord: (v: number[]) => number[] }
          ) => {
            const desde = api.coord([api.value(1), api.value(0)]);
            const hasta = api.coord([api.value(2), api.value(0)]);
            return {
              type: "line",
              shape: { x1: desde[0], y1: desde[1], x2: hasta[0], y2: hasta[1] },
              style: { stroke: t.tubo2, lineWidth: 2, lineCap: "round" },
            };
          },
          data: orden.map((r, i) => [i, r.cumplimiento, r.proyeccion]),
          z: 1,
          silent: true,
        },
        // Hoy (tono claro) — anillo de superficie de 2px según la skill
        {
          type: "scatter",
          symbolSize: 10,
          itemStyle: { color: t.tubo1, borderColor: t.superficie, borderWidth: 2 },
          data: orden.map((r, i) => [r.cumplimiento, i]),
          z: 2,
        },
        // Proyección (tono oscuro) con etiqueta directa en el extremo
        {
          type: "scatter",
          symbolSize: 10,
          itemStyle: { color: t.tubo3, borderColor: t.superficie, borderWidth: 2 },
          label: {
            show: true,
            position: "right",
            formatter: (p: { dataIndex: number }) => `${orden[p.dataIndex]!.proyeccion}%`,
            color: t.tinta,
            fontSize: 11,
            fontWeight: 600,
          },
          data: orden.map((r, i) => [r.proyeccion, i]),
          z: 3,
          markLine: {
            symbol: "none",
            silent: true,
            lineStyle: { type: "solid", width: 1 },
            label: { fontSize: 10, color: t.tinta2 },
            data: [
              { xAxis: 100, lineStyle: { color: t.tinta3 }, label: { formatter: "Meta 100%" } },
              { xAxis: 80, lineStyle: { color: t.amarillo }, label: { formatter: "Ojo 80%" } },
            ],
          },
        },
      ],
    };
  }, [resumen, t]);

  // La selección no repinta series (regla: el color sigue a la entidad);
  // la delegación elegida se resalta en la tabla y el radar.
  void seleccion;

  return <ReactEChartsCore echarts={echarts} option={opcion} style={{ height: 260, width: "100%" }} notMerge />;
}
