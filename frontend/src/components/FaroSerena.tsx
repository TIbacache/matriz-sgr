// El Faro Monumental de La Serena sobre la Avenida del Mar, en duotono sobre
// el rojo heráldico (DESIGN §10.4). Dibujado a partir del faro real: torre
// cuadrada de piedra clara con las ventanas en hilera y luz adentro, galería
// con almenas de ladrillo, linterna de vidrio con mástil, y el fuerte de la
// base con sus dos torreones redondos y la puerta en arco. Es la imagen que la
// ciudad reconoce al instante, y un faro orienta: lo mismo que hace el sistema.
// Vectorial a propósito: pesa lo que pesa este archivo, sin licencia que pedir.
//
// Vive solo (DESIGN §3.6.2, régimen de ambiente): el haz gira e ilumina el
// mar, las ventanas se encienden cada una a su ritmo, las olas avanzan a tres
// velocidades que no riman, las estrellas titilan y el astro deriva. `activo`
// (autenticando) acelera el haz. Todo con transform/opacity y se apaga con
// prefers-reduced-motion en login.css.
//
// Tintas: blanco a distintas opacidades, negro translúcido para el ladrillo y
// --marca-oscuro para el mar. Los colores viven en login.css (DESIGN §8.10).

// El panel puede ser más ancho que el dibujo (el contenedor conserva la
// proporción con `meet` para no recortar la linterna), así que el mar, el
// promontorio y las olas se extienden MÁS ALLÁ del viewBox por los dos lados:
// el SVG tiene overflow visible y así el agua llega a los bordes del panel.
const DESBORDE = 800;

// Cada ola es un patrón de 80px repetido a lo ancho de TRES viewBox: así la
// traslación de -80px cierra el ciclo sin costura y cubre el desborde.
function ola(y: number): string {
  let d = `M${-DESBORDE - 80} ${y}`;
  for (let x = -DESBORDE - 80; x < 800 + DESBORDE; x += 80) d += ` q20 -8 40 0 t40 0`;
  return d;
}

// Duraciones primas: nunca coinciden dos titilares (DESIGN §3.6.2).
const ESTRELLAS: [number, number, number, number][] = [
  [70, 40, 1.6, 3.1],
  [150, 22, 1.2, 4.3],
  [230, 58, 1.4, 5.3],
  [470, 30, 1.2, 6.1],
  [560, 60, 1.5, 3.7],
  [720, 26, 1.3, 7.3],
  [770, 70, 1.1, 4.7],
  [420, 96, 1.0, 5.9],
];

// Ventanas de la torre, de abajo hacia arriba, cada una con su ritmo
const VENTANAS: [number, number][] = [
  [176, 4.1],
  [154, 5.3],
  [132, 3.7],
  [110, 6.1],
  [88, 4.7],
];

const LINTERNA = { x: 340, y: 50 };

export function FaroSerena({ activo }: { activo: boolean }) {
  return (
    <svg
      className={activo ? "faro faro--activo" : "faro"}
      viewBox="0 0 800 360"
      preserveAspectRatio="xMidYMax meet"
      role="img"
      aria-labelledby="faro-titulo"
    >
      <title id="faro-titulo">Faro Monumental de La Serena sobre la costa, de noche, con el haz girando</title>
      <defs>
        <linearGradient id="faro-haz-grad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="currentColor" stopOpacity="0.36" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="faro-reflejo-grad" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="currentColor" stopOpacity="0.3" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Cielo */}
      {ESTRELLAS.map(([cx, cy, r, dur], i) => (
        <circle
          key={i}
          className="faro-estrella"
          cx={cx}
          cy={cy}
          r={r}
          style={{ animationDuration: `${dur}s`, animationDelay: `${-(i * 0.7)}s` }}
        />
      ))}
      <circle className="faro-astro" cx="640" cy="92" r="34" />

      {/* Mar en tres capas y el reflejo del haz */}
      <rect className="faro-mar" x={-DESBORDE} y="232" width={800 + 2 * DESBORDE} height="128" />
      <ellipse className="faro-reflejo" cx="600" cy="252" rx="230" ry="16" />
      <g className="faro-olas faro-olas--1">
        <path className="faro-ola" d={ola(262)} />
      </g>
      <g className="faro-olas faro-olas--2">
        <path className="faro-ola faro-ola--media" d={ola(292)} />
      </g>
      <g className="faro-olas faro-olas--3">
        <path className="faro-ola faro-ola--lejos" d={ola(322)} />
      </g>

      {/* Haz: gira alrededor de la linterna */}
      <g className="faro-giro">
        <polygon className="faro-haz" points={`${LINTERNA.x},${LINTERNA.y} 800,6 800,94`} />
        <polygon className="faro-haz faro-haz--tenue" points={`${LINTERNA.x},${LINTERNA.y} 0,34 0,66`} />
      </g>

      {/* Promontorio: la explanada del faro entra en el mar */}
      <path
        className="faro-tierra"
        d={`M${-DESBORDE} 360 V 250 H 0 C 90 242 180 234 300 234 C 400 234 470 242 500 250 C 528 258 548 300 590 360 Z`}
      />

      {/* ---- El fuerte de la base: muralla almenada y dos torreones ---- */}
      <g className="faro-piedra">
        <rect x="236" y="204" width="208" height="40" />
        {[240, 262, 284, 306, 328, 350, 372, 394, 416].map((x) => (
          <rect key={x} x={x} y="196" width="12" height="9" />
        ))}
        <rect x="214" y="190" width="30" height="54" rx="4" />
        <rect x="436" y="190" width="30" height="54" rx="4" />
      </g>
      {/* Ladrillo: la línea de la cornisa, los techos cónicos y el arco de la puerta */}
      <g className="faro-ladrillo">
        <rect x="236" y="212" width="208" height="3" />
        <polygon points="212,190 229,170 246,190" />
        <polygon points="434,190 451,170 468,190" />
        <rect x="216" y="196" width="26" height="3" />
        <rect x="438" y="196" width="26" height="3" />
      </g>
      <rect className="faro-piedra--sombra" x="340" y="204" width="104" height="40" />
      <rect className="faro-hueco" x="330" y="216" width="20" height="28" rx="10" />
      <rect className="faro-hueco" x="330" y="230" width="20" height="14" />

      {/* ---- La torre: cuadrada, con las ventanas en hilera ---- */}
      <rect className="faro-piedra" x="320" y="72" width="40" height="134" />
      <rect className="faro-piedra--sombra" x="342" y="72" width="18" height="134" />
      {VENTANAS.map(([y, dur], i) => (
        <g key={y}>
          <rect className="faro-marco" x="333" y={y - 2} width="14" height="18" rx="7" />
          <rect
            className="faro-ventana"
            x="336"
            y={y + 1}
            width="8"
            height="12"
            rx="4"
            style={{ animationDuration: `${dur}s`, animationDelay: `${-(i * 1.3)}s` }}
          />
        </g>
      ))}

      {/* ---- Galería con almenas de ladrillo, linterna, cúpula y mástil ---- */}
      <rect className="faro-piedra" x="310" y="64" width="60" height="10" />
      <g className="faro-ladrillo">
        <rect x="310" y="61" width="60" height="3" />
        {[310, 320, 330, 340, 350, 360].map((x) => (
          <rect key={x} x={x} y="56" width="5" height="5" />
        ))}
      </g>
      <rect className="faro-vidrio" x="328" y="36" width="24" height="28" />
      <g className="faro-ladrillo">
        <rect x="327" y="36" width="2" height="28" />
        <rect x="339" y="36" width="2" height="28" />
        <rect x="351" y="36" width="2" height="28" />
      </g>
      <path className="faro-piedra" d="M324 36 Q340 16 356 36 Z" />
      <rect className="faro-piedra" x="339" y="4" width="2" height="14" />
      <circle className="faro-piedra" cx="340" cy="4" r="2.5" />
      <circle className="faro-luz" cx={LINTERNA.x} cy={LINTERNA.y} r="7" />
    </svg>
  );
}
