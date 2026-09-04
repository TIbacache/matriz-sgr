import { useMemo } from "react";
import ReactEChartsCore from "echarts-for-react/lib/core";
import { echarts, baseChart } from "../../lib/echarts";
import { useTokens } from "../../lib/useTokens";
import type { ResumenDelegacion } from "../../lib/dashboard";

interface Props {
  resumen: ResumenDelegacion[];
  areas: string[];
  /** Umbrales del semáforo en %, leídos del parámetro (RF-027, ADR-007) */
  umbrales: { verde: number; naranjo: number };
  onSeleccionar: (unidadId: string) => void;
}

// Mapa de calor delegación × ÁREA DEL CARGO (T OO CC, SOCIAL, APOY ADM…), que
// es como agrupa la planilla real. Antes el eje era `CategoriaGestion`, que son
// las categorías del TUBO: no tenían relación con lo que se le mide a la
// persona, así que el mapa cruzaba dos cosas distintas.
//
// La celda muestra el AVANCE RELATIVO del área (su cumplimiento contra su
// objetivo del día), no el cumplimiento crudo: así el mapa dice lo mismo que
// los gauges. Escala semántica del semáforo en clases discretas (visualMap
// piecewise), siempre con leyenda. Los cortes salen de los parámetros y no de
// números escritos aquí, que era justo el defecto de la vista v1.
// Una delegación sin nadie de esa área no tiene celda: ausencia no es cero.
export function HeatmapAreas({ resumen, areas, umbrales, onSeleccionar }: Props) {
  const t = useTokens();

  const { opcion, unidadesOrden } = useMemo(() => {
    const nombres = resumen.map((r) => r.nombre);
    const datos: number[][] = [];
    for (const [fila, r] of resumen.entries()) {
      for (const a of r.porArea) {
        const col = areas.indexOf(a.area);
        if (col >= 0) datos.push([col, fila, a.avanceRelativo]);
      }
    }
    const detalle = new Map(
      resumen.flatMap((r) => r.porArea.map((a) => [`${r.nombre}|${a.area}`, a] as const))
    );

    const opcion = {
      ...baseChart(t),
      grid: { left: 8, right: 8, top: 8, bottom: 56, containLabel: true },
      xAxis: {
        type: "category",
        data: areas,
        position: "top",
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: t.tinta2, fontSize: 11, interval: 0, width: 90, overflow: "break" as const },
        splitArea: { show: false },
      },
      yAxis: {
        type: "category",
        data: nombres,
        inverse: true,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: t.tinta, fontSize: 12 },
      },
      visualMap: {
        type: "piecewise",
        pieces: [
          { lt: umbrales.naranjo, color: t.rojo, label: `Crítico (<${umbrales.naranjo}%)` },
          {
            gte: umbrales.naranjo,
            lt: umbrales.verde,
            color: t.amarillo,
            // El corte superior es exclusivo: "60–100" y "≥100" se solaparían
            // en la leyenda y dejarían al lector sin saber dónde cae un 100.
            label: `Atención (${umbrales.naranjo}–${umbrales.verde - 1}%)`,
          },
          { gte: umbrales.verde, color: t.verde, label: `Al día (≥${umbrales.verde}%)` },
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
        formatter: (p: { value: number[] }) => {
          const nombre = nombres[p.value[1]!]!;
          const area = areas[p.value[0]!]!;
          const a = detalle.get(`${nombre}|${area}`);
          if (!a) return "";
          const cuantos = `${a.funcionarios} ${a.funcionarios === 1 ? "funcionario" : "funcionarios"}`;
          return (
            `<strong>${nombre}</strong> · ${area}<br/>` +
            `Avance relativo: <strong>${a.avanceRelativo}%</strong><br/>` +
            `Cumplimiento ${a.cumplimiento}% · objetivo al día ${a.objetivoAlDia}%<br/>` +
            `<span style="color:${t.tinta2}">${cuantos}</span>`
          );
        },
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
            // Blanco sobre los fondos saturados del semáforo: los tres superan 3:1
            color: t.textoSobreEstado,
          },
          itemStyle: {
            // El espaciador: gap de 2px en color de superficie, nunca bordes
            borderColor: t.superficie,
            borderWidth: 2,
            borderRadius: 3,
          },
          emphasis: { itemStyle: { shadowBlur: 6, shadowColor: "rgba(0,0,0,0.25)" } },
        },
      ],
    };
    return { opcion, unidadesOrden: resumen.map((r) => r.unidadId) };
  }, [resumen, areas, umbrales, t]);

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
