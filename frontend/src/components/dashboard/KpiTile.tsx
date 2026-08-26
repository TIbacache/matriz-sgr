import { useEffect, useRef } from "react";
import { animate, useReducedMotion } from "motion/react";

interface Props {
  etiqueta: string;
  valor: number;
  sufijo?: string;
  // contexto secundario bajo el valor (ej. "objetivo al día: 62%")
  contexto?: string;
  // color de acento del valor cuando codifica estado; si no, tinta normal
  color?: string;
  retraso?: number;
  decimales?: number;
}

// Stat tile según la skill: label sin dos puntos, valor grande en cifras
// PROPORCIONALES (no tabular-nums a tamaño display), contexto secundario.
// Counter-up con motion en cascada; quieto si el usuario pide reduced-motion.
export function KpiTile({ etiqueta, valor, sufijo = "", contexto, color, retraso = 0, decimales = 0 }: Props) {
  const ref = useRef<HTMLSpanElement>(null);
  const reducir = useReducedMotion();

  useEffect(() => {
    const nodo = ref.current;
    if (!nodo) return;
    if (reducir) {
      nodo.textContent = valor.toFixed(decimales);
      return;
    }
    const control = animate(0, valor, {
      duration: 1.1,
      delay: retraso,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => {
        nodo.textContent = v.toFixed(decimales);
      },
    });
    return () => control.stop();
  }, [valor, retraso, decimales, reducir]);

  return (
    <div className="card kpi-tile entrada" style={{ animationDelay: `${retraso * 1000}ms` }}>
      <span className="kpi-tile-etiqueta">{etiqueta}</span>
      <span className="kpi-tile-valor" style={color ? { color } : undefined}>
        <span ref={ref}>0</span>
        {sufijo}
      </span>
      {contexto && <span className="kpi-tile-contexto">{contexto}</span>}
    </div>
  );
}
