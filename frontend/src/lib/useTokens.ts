import { useEffect, useState } from "react";

// Lee los tokens de DESIGN.md desde el CSS y se re-evalúa cuando cambia el
// tema (data-theme en <html>). Así los gráficos ECharts —que no heredan CSS—
// siempre pintan con la paleta vigente, sin duplicar valores en JS.
export interface Tokens {
  tinta: string;
  tinta2: string;
  tinta3: string;
  superficie: string;
  fondo2: string;
  borde: string;
  acento: string;
  verde: string;
  amarillo: string;
  rojo: string;
  verdeBg: string;
  amarilloBg: string;
  rojoBg: string;
  textoSobreEstado: string;
  tubo1: string;
  tubo2: string;
  tubo3: string;
  fontCuerpo: string;
  reducirMovimiento: boolean;
}

function leerTokens(): Tokens {
  const s = getComputedStyle(document.documentElement);
  const v = (nombre: string) => s.getPropertyValue(nombre).trim();
  return {
    tinta: v("--tinta"),
    tinta2: v("--tinta-2"),
    tinta3: v("--tinta-3"),
    superficie: v("--superficie"),
    fondo2: v("--fondo-2"),
    borde: v("--borde"),
    acento: v("--acento"),
    verde: v("--estado-verde"),
    amarillo: v("--estado-amarillo"),
    rojo: v("--estado-rojo"),
    verdeBg: v("--estado-verde-bg"),
    amarilloBg: v("--estado-amarillo-bg"),
    rojoBg: v("--estado-rojo-bg"),
    textoSobreEstado: v("--texto-sobre-estado"),
    tubo1: v("--tubo-1"),
    tubo2: v("--tubo-2"),
    tubo3: v("--tubo-3"),
    fontCuerpo: v("--font-cuerpo") || "General Sans, sans-serif",
    reducirMovimiento: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  };
}

export function useTokens(): Tokens {
  const [tokens, setTokens] = useState<Tokens>(leerTokens);

  useEffect(() => {
    const observer = new MutationObserver(() => setTokens(leerTokens()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  return tokens;
}

// Color del semáforo según el avance relativo al objetivo del día
// (umbrales del cliente: verde >=100, naranjo 60-99, rojo <60).
export function colorSemaforo(avanceRelativo: number, t: Tokens): string {
  if (avanceRelativo >= 100) return t.verde;
  if (avanceRelativo >= 60) return t.amarillo;
  return t.rojo;
}

export const SIMBOLO_SEMAFORO: Record<string, string> = {
  verde: "●",
  naranjo: "▲",
  rojo: "■",
};
