import { useMemo } from "react";
import ReactEChartsCore from "echarts-for-react/lib/core";
import { echarts, baseChart, ejesRecesivos } from "../../lib/echarts";
import { useTokens } from "../../lib/useTokens";
import type { TuboStat } from "../../lib/dashboard";

interface Props {
  tubo: TuboStat[];
  onSeleccionar: (unidadId: string) => void;
}

const ESTADOS: { clave: string; etiqueta: string }[] = [
  { clave: "pendiente", etiqueta: "Pendiente" },
  { clave: "en_proceso", etiqueta: "En proceso" },
  { clave: "realizado", etiqueta: "Realizado" },
];

// Carga del tubo por delegación: barra apilada horizontal (parte-de-un-todo).
// Los estados son etapas ORDENADAS del flujo → rampa ordinal de un solo tono
// (claro→oscuro, validada), no categórica. Gap de 2px en color de superficie
// entre segmentos (el espaciador de la skill, nunca bordes). Las vencidas van
// en tooltip y tabla (se solapan con los estados; no son un 4º segmento).
export function TuboStacked({ tubo, onSeleccionar }: Props) {
  const t = useTokens();

  const opcion = useMemo(() => {
    const orden = [...tubo].sort(
      (a, b) =>
        Object.values(b.estados).reduce((s, n) => s + n, 0) -
        Object.values(a.estados).reduce((s, n) => s + n, 0)
    );
    const nombres = orden.map((u) => u.unidadNombre);
    const rampa = [t.tubo1, t.tubo2, t.tubo3];

    return {
      ...baseChart(t),
      legend: {
        data: ESTADOS.map((e) => e.etiqueta),
        top: 0,
        left: 0,
        textStyle: { color: t.tinta2, fontSize: 11 },
        itemWidth: 12,
        itemHeight: 12,
      },
      grid: { left: 8, right: 24, top: 32, bottom: 8, containLabel: true },
      xAxis: {
        type: "value",
        ...ejesRecesivos(t),
        axisLabel: { color: t.tinta2, fontSize: 11 },
      },
      yAxis: {
        type: "category",
        data: nombres,
        inverse: true,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: t.tinta, fontSize: 12 },
        splitLine: { show: false },
      },
      tooltip: {
        ...baseChart(t).tooltip,
        formatter: (p: { dataIndex: number }) => {
          const u = orden[p.dataIndex]!;
          const total = Object.values(u.estados).reduce((s, n) => s + n, 0);
          const filasEstados = ESTADOS.map(
            (e) => `${e.etiqueta}: <strong>${u.estados[e.clave] ?? 0}</strong>`
          ).join("<br/>");
          const vencidas = u.vencidas > 0
            ? `<br/><span style="color:${t.rojo}">■ Vencidas: <strong>${u.vencidas}</strong></span>`
            : "";
          return `<strong>${u.unidadNombre}</strong> · ${total} tareas<br/>${filasEstados}${vencidas}`;
        },
      },
      series: ESTADOS.map((e, i) => ({
        name: e.etiqueta,
        type: "bar",
        stack: "tubo",
        barMaxWidth: 22,
        data: orden.map((u) => u.estados[e.clave] ?? 0),
        itemStyle: {
          color: rampa[i],
          borderColor: t.superficie,
          borderWidth: 2,
          borderRadius: i === ESTADOS.length - 1 ? [0, 4, 4, 0] : 0,
        },
      })),
    };
  }, [tubo, t]);

  const orden = useMemo(
    () =>
      [...tubo].sort(
        (a, b) =>
          Object.values(b.estados).reduce((s, n) => s + n, 0) -
          Object.values(a.estados).reduce((s, n) => s + n, 0)
      ),
    [tubo]
  );

  return (
    <ReactEChartsCore
      echarts={echarts}
      option={opcion}
      style={{ height: 240, width: "100%" }}
      notMerge
      onEvents={{
        click: (p: { dataIndex?: number }) => {
          if (typeof p.dataIndex === "number" && orden[p.dataIndex]) {
            onSeleccionar(orden[p.dataIndex]!.unidadTerritorialId);
          }
        },
      }}
    />
  );
}
