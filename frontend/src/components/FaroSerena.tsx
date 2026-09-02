// El Faro Monumental de La Serena sobre la Avenida del Mar, en duotono sobre
// el rojo heráldico (DESIGN §10.4). Es la imagen que la ciudad reconoce al
// instante, y un faro orienta: lo mismo que hace el sistema con el trabajo de
// las delegaciones. Vectorial a propósito: pesa lo que pesa este archivo, no
// tiene licencia que pedir y no entra en la ruta crítica de la ficha.
//
// Vive solo (DESIGN §3.6, régimen de ambiente): el haz gira e ilumina el mar,
// las olas avanzan a tres velocidades que no riman, las estrellas titilan cada
// una a su ritmo y el astro deriva. `activo` (autenticando) acelera el haz.
// Todo con transform/opacity —nada dispara layout— y se apaga con
// prefers-reduced-motion en login.css.
//
// Solo dos tintas: blanco a distintas opacidades y --marca-oscuro para el mar.
// Los colores viven en login.css (clases), no aquí (DESIGN §8.10).

// Cada ola es un patrón de 80px repetido a lo ancho de DOS viewBox: así la
// traslación de -80px cierra el ciclo sin costura.
function ola(y: number): string {
  let d = `M-80 ${y}`;
  for (let x = -80; x < 1600; x += 80) d += ` q20 -8 40 0 t40 0`;
  return d;
}

// Duraciones primas: nunca coinciden dos titilares (DESIGN §3.6.bis).
const ESTRELLAS: [number, number, number, number][] = [
  // cx, cy, r, duración
  [70, 40, 1.6, 3.1],
  [150, 22, 1.2, 4.3],
  [230, 58, 1.4, 5.3],
  [470, 30, 1.2, 6.1],
  [560, 60, 1.5, 3.7],
  [720, 26, 1.3, 7.3],
  [770, 70, 1.1, 4.7],
  [420, 96, 1.0, 5.9],
];

export function FaroSerena({ activo }: { activo: boolean }) {
  return (
    <svg
      className={activo ? "faro faro--activo" : "faro"}
      viewBox="0 0 800 360"
      preserveAspectRatio="xMidYMax slice"
      role="img"
      aria-labelledby="faro-titulo"
    >
      <title id="faro-titulo">Faro Monumental de La Serena sobre la costa, de noche, con el haz girando</title>
      <defs>
        {/* El haz se desvanece hacia el mar; el color lo pone la clase .faro */}
        <linearGradient id="faro-haz-grad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="currentColor" stopOpacity="0.34" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="faro-reflejo-grad" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="currentColor" stopOpacity="0.28" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Cielo: estrellas que titilan cada una a su ritmo */}
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

      {/* Astro: deriva apenas */}
      <circle className="faro-astro" cx="640" cy="92" r="34" />

      {/* Mar en tres capas que avanzan a velocidades primas */}
      <rect className="faro-mar" x="0" y="232" width="800" height="128" />
      {/* Reflejo del haz sobre el agua: se enciende cuando el haz apunta al mar */}
      <ellipse className="faro-reflejo" cx="600" cy="250" rx="230" ry="16" />
      <g className="faro-olas faro-olas--1">
        <path className="faro-ola" d={ola(262)} />
      </g>
      <g className="faro-olas faro-olas--2">
        <path className="faro-ola faro-ola--media" d={ola(292)} />
      </g>
      <g className="faro-olas faro-olas--3">
        <path className="faro-ola faro-ola--lejos" d={ola(322)} />
      </g>

      {/* Haz: gira alrededor de la linterna; uno fuerte hacia el mar y uno tenue opuesto */}
      <g className="faro-giro">
        <polygon className="faro-haz" points="340,74 800,30 800,118" />
        <polygon className="faro-haz faro-haz--tenue" points="340,74 0,58 0,90" />
      </g>

      {/* Promontorio: la explanada del faro entra en el mar */}
      <path
        className="faro-tierra"
        d="M0 360 V 244 C 90 236 180 226 300 226 C 400 226 470 236 500 246 C 528 256 548 300 590 360 Z"
      />

      {/* Muralla almenada de la base (el faro es un pequeño fuerte) */}
      <g className="faro-piedra">
        <rect x="236" y="196" width="208" height="34" />
        {[236, 264, 292, 320, 348, 376, 404, 432].map((x) => (
          <rect key={x} x={x} y="186" width="12" height="10" />
        ))}
      </g>
      <rect className="faro-piedra--sombra" x="340" y="196" width="104" height="34" />
      <rect className="faro-puerta" x="332" y="208" width="16" height="22" />

      {/* Torre troncocónica */}
      <polygon className="faro-piedra" points="314,196 366,196 354,92 326,92" />
      <polygon className="faro-piedra--sombra" points="340,196 366,196 354,92 340,92" />
      <rect className="faro-puerta" x="336" y="122" width="8" height="12" />
      <rect className="faro-puerta" x="336" y="150" width="8" height="12" />

      {/* Galería, linterna y cúpula */}
      <rect className="faro-piedra" x="318" y="86" width="44" height="8" />
      <rect className="faro-baranda" x="318" y="78" width="44" height="8" />
      <rect className="faro-vidrio" x="326" y="56" width="28" height="24" />
      <path className="faro-piedra" d="M322 56 Q340 36 358 56 Z" />
      <rect className="faro-piedra" x="338" y="26" width="4" height="12" />
      <circle className="faro-luz" cx="340" cy="68" r="7" />
    </svg>
  );
}
