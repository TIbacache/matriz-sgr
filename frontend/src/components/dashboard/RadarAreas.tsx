import { useMemo } from "react";
import ReactEChartsCore from "echarts-for-react/lib/core";
import { echarts, baseChart } from "../../lib/echarts";
import { useTokens } from "../../lib/useTokens";
import { promedio, type ResumenDelegacion } from "../../lib/dashboard";

interface Props {
  resumen: ResumenDelegacion[];
  areas: string[];
  seleccion: string | null;
  /** Tope de cumplimiento en %, del parámetro: fija la escala del radar */
  tope: number;
}

// Radar de áreas del cargo en forma de ÉNFASIS ("una serie es el punto, el
// resto es contexto"): la delegación elegida contra el promedio de la
// organización en gris. Nunca las seis a la vez.
//
// El eje es el mismo del mapa de calor y el valor también es el avance
// relativo, para que las dos formas se puedan leer juntas.
export function RadarAreas({ resumen, areas, seleccion, tope }: Props) {
  const t = useTokens();

  const opcion = useMemo(() => {
    const valorDe = (r: ResumenDelegacion, area: string) =>
      r.porArea.find((a) => a.area === area)?.avanceRelativo ?? null;

    // El promedio ignora a quien no tiene esa área: promediar con ceros
    // inventaría mal desempeño donde solo hay ausencia de personal.
    const promedioOrg = areas.map((area) =>
      promedio(resumen.map((r) => valorDe(r, area)).filter((v): v is number => v !== null))
    );
    const elegida = seleccion ? resumen.find((r) => r.unidadId === seleccion) : resumen[0];
    const serieElegida = areas.map((area) => (elegida ? valorDe(elegida, area) ?? 0 : 0));
    const maximo = Math.max(tope, ...promedioOrg, ...serieElegida);

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
        indicator: areas.map((a) => ({ name: a, max: maximo })),
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
              value: promedioOrg,
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
              areaStyle: { color: t.tubo3, opacity: 0.1 },
              symbolSize: 7,
            },
          ],
        },
      ],
    };
  }, [resumen, areas, seleccion, tope, t]);

  return <ReactEChartsCore echarts={echarts} option={opcion} style={{ height: 300, width: "100%" }} notMerge />;
}
