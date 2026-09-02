import type { Semaforo } from "../lib/types";
import { SIMBOLO_SEMAFORO } from "../lib/useTokens";

// Chip de semáforo (DESIGN §5). Regla que este componente hace cumplir sola:
// **el estado nunca se comunica solo con color** — siempre símbolo ●▲■ más
// texto, para daltonismo y lectores de pantalla (DESIGN §8.1.4, RNF-012).
// El símbolo es decorativo para el lector (aria-hidden) porque el texto ya
// dice lo mismo; sin él, se leería "punto verde" en vez de "Al día".

const TEXTO_POR_DEFECTO: Record<Semaforo, string> = {
  verde: "Al día",
  naranjo: "Atención",
  rojo: "Crítico",
};

interface Props {
  /** null = estado neutro (ni bueno ni malo): sin color de semáforo */
  semaforo: Semaforo | null;
  texto?: string;
  /** Explicación al pasar el cursor y para el atributo title */
  ayuda?: string;
  /** Halo pulsante: SOLO para el estado crítico real y una vez por pantalla
      (DESIGN §3.6.1). Se ignora si el semáforo no es rojo. */
  pulsa?: boolean;
}

export function ChipSemaforo({ semaforo, texto, ayuda, pulsa = false }: Props) {
  const etiqueta = texto ?? (semaforo ? TEXTO_POR_DEFECTO[semaforo] : "—");
  const clases = [
    "chip-semaforo",
    `chip-semaforo--${semaforo ?? "neutro"}`,
    pulsa && semaforo === "rojo" ? "chip-semaforo--late" : "",
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <span className={clases} title={ayuda}>
      {semaforo && <span aria-hidden="true">{SIMBOLO_SEMAFORO[semaforo]} </span>}
      {etiqueta}
    </span>
  );
}
