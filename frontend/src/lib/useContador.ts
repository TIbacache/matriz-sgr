import { useEffect, useRef } from "react";
import { animate, useReducedMotion } from "motion/react";

// Cuenta desde el valor anterior hasta el nuevo (DESIGN §3.6): la cifra hero
// de la ficha y los KPI no "aparecen", llegan. Con prefers-reduced-motion se
// escribe el valor final sin animar. Devuelve el ref del nodo cuyo texto se
// actualiza; el componente renderiza el valor formateado como hijo para que
// el primer paint y el final coincidan con lo que React cree que hay.
export function useContador(valor: number, decimales = 1, duracion = 0.9) {
  const ref = useRef<HTMLSpanElement>(null);
  const previo = useRef(0);
  const reducir = useReducedMotion();

  useEffect(() => {
    const nodo = ref.current;
    if (!nodo) return;
    const formatear = (v: number) => v.toFixed(decimales).replace(".", ",");
    const desde = previo.current;
    previo.current = valor;
    if (reducir || desde === valor) {
      nodo.textContent = formatear(valor);
      return;
    }
    const control = animate(desde, valor, {
      duration: duracion,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => {
        nodo.textContent = formatear(v);
      },
    });
    return () => control.stop();
  }, [valor, decimales, duracion, reducir]);

  return ref;
}
