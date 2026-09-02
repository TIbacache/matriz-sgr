// La Serena en la barra lateral, en una sola escena (DESIGN §10.4, régimen
// de ambiente §3.6.2): de izquierda a derecha, la iglesia de San Francisco,
// un jarro pato diaguita, la cúpula de La Recova, El Miliciano sobre su
// columna, un papayo con sus papayas y el Faro Monumental; detrás, los cerros
// del valle y la camanchaca pasando; abajo, una greca diaguita que recorre el
// borde. Es lo que hace que la barra sea de ESTA ciudad y no de cualquiera.
//
// Decorativa para el lector de pantalla, nunca debajo de un texto, y se apaga
// con prefers-reduced-motion en layout.css. Siluetas en negro translúcido y
// luces en blanco sobre el heráldico: sin hex (DESIGN §8.10).

// Greca escalonada diaguita: un módulo de 24px repetido dos anchos de más,
// para que la traslación de -24px cierre el ciclo sin costura.
function greca(y: number, alto: number): string {
  let d = `M-24 ${y}`;
  for (let x = -24; x < 288; x += 24) {
    d += ` h6 v-${alto} h6 v${alto} h6 v-${alto} h6 v${alto}`;
  }
  return d;
}

function zigzag(y: number, alto: number): string {
  let d = `M-24 ${y}`;
  for (let x = -24; x < 288; x += 12) d += ` l6 -${alto} l6 ${alto}`;
  return d;
}

export function SiluetaSerena() {
  return (
    <svg className="silueta" viewBox="0 0 240 140" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
      {/* Cielo */}
      {[
        [22, 18, 3.1],
        [64, 10, 4.3],
        [118, 20, 5.3],
        [176, 12, 6.1],
        [212, 24, 3.7],
        [96, 34, 4.7],
      ].map(([cx, cy, dur], i) => (
        <circle
          key={i}
          className="silueta-estrella"
          cx={cx}
          cy={cy}
          r="1"
          style={{ animationDuration: `${dur}s`, animationDelay: `${-(i * 1.1)}s` }}
        />
      ))}

      {/* Haz del faro: barre el cielo hacia la ciudad */}
      <g className="silueta-giro">
        <polygon className="silueta-haz" points="217,43 0,4 0,48" />
      </g>

      {/* Cerros del valle, detrás de todo */}
      <path className="silueta-cerro" d="M0 100 C 30 82 60 86 90 92 C 120 98 150 80 185 88 C 210 94 225 90 240 96 V 124 H 0 Z" />
      <path className="silueta-cerro silueta-cerro--lejos" d="M0 92 C 40 74 70 80 110 84 C 150 88 190 70 240 84 V 124 H 0 Z" />

      {/* Ciudad: una sola silueta */}
      <g className="silueta-ciudad">
        {/* San Francisco: nave de piedra con su torre y campanario */}
        <rect x="6" y="92" width="34" height="32" />
        <polygon points="6,92 23,80 40,92" />
        <rect x="30" y="66" width="12" height="26" />
        <path d="M29 66 Q36 56 43 66 Z" />
        <rect x="35" y="50" width="2" height="8" />
        <rect x="32" y="53" width="8" height="2" />

        {/* La Recova: el mercado con su cúpula y su linterna */}
        <rect x="86" y="98" width="52" height="26" />
        <rect x="100" y="90" width="24" height="8" />
        <path d="M96 90 Q112 66 128 90 Z" />
        <rect x="109" y="64" width="6" height="8" />
        <path d="M108 64 Q112 58 116 64 Z" />

        {/* El Miliciano: la figura sobre su columna */}
        <rect x="148" y="108" width="14" height="16" />
        <rect x="152" y="80" width="6" height="28" />
        <rect x="150" y="78" width="10" height="3" />
        <circle cx="155" cy="66" r="3" />
        <polygon points="151,70 159,70 160,78 150,78" />
        <rect x="158" y="62" width="1.5" height="14" transform="rotate(20 159 69)" />

        {/* Faro Monumental: el fuerte y la torre */}
        <rect x="196" y="110" width="40" height="14" />
        {[198, 206, 214, 222, 230].map((x) => (
          <rect key={x} x={x} y="106" width="4" height="4" />
        ))}
        <rect x="211" y="52" width="12" height="58" />
        <rect x="208" y="48" width="18" height="4" />
        <path d="M212 38 Q217 32 222 38 Z" />
        <rect x="216.5" y="30" width="1" height="8" />
      </g>

      {/* Arcos y ventanas: se vacían con el fondo de la barra */}
      <g className="silueta-hueco">
        <rect x="21" y="110" width="5" height="12" rx="2.5" />
        <rect x="34" y="72" width="4" height="8" rx="2" />
        <rect x="92" y="108" width="6" height="14" rx="3" />
        <rect x="104" y="108" width="6" height="14" rx="3" />
        <rect x="116" y="108" width="6" height="14" rx="3" />
        <rect x="128" y="108" width="6" height="14" rx="3" />
        <rect x="213" y="110" width="8" height="12" rx="4" />
      </g>
      {/* Linterna del faro: vidrio y lámpara */}
      <rect className="silueta-vidrio" x="213" y="38" width="8" height="10" />
      <circle className="silueta-luz" cx="217" cy="43" r="2.2" />
      {/* Ventanas de la torre, encendidas a distinto ritmo */}
      {[
        [62, 4.1],
        [78, 5.3],
        [94, 3.7],
      ].map(([y, dur], i) => (
        <rect
          key={y}
          className="silueta-ventana"
          x="215"
          y={y}
          width="4"
          height="6"
          rx="2"
          style={{ animationDuration: `${dur}s`, animationDelay: `${-(i * 1.3)}s` }}
        />
      ))}

      {/* Papayo: tronco, corona de hojas que se mece y sus papayas */}
      <g className="silueta-vaiven">
        <g className="silueta-ciudad">
          <rect x="173" y="92" width="4" height="32" />
          {/* Hojas: radian desde la punta del tronco hacia arriba, como palma */}
          {[192, 222, 252, 282, 312, 344].map((a) => (
            <ellipse key={a} cx="187" cy="92" rx="12" ry="2.6" transform={`rotate(${a} 175 92)`} />
          ))}
        </g>
        <g className="silueta-fruta">
          <ellipse cx="171" cy="98" rx="2.6" ry="4" />
          <ellipse cx="177" cy="99" rx="2.6" ry="4" />
          <ellipse cx="174" cy="104" rx="2.6" ry="4" />
        </g>
      </g>

      {/* Jarro pato diaguita, en primer plano, con su greca */}
      <g className="silueta-ciudad">
        <ellipse cx="62" cy="113" rx="14" ry="9" />
        <path d="M74 110 C 80 104 84 102 86 100" strokeWidth="4" className="silueta-trazo" />
        <circle cx="87" cy="99" r="3.6" />
        <polygon points="90,98 96,99 90,101" />
        <path d="M52 108 C 44 104 44 98 52 100" strokeWidth="2.5" className="silueta-trazo" />
        <rect x="55" y="121" width="14" height="3" />
      </g>
      <path className="silueta-greca-jarro" d="M50 114 l4 -4 l4 4 l4 -4 l4 4 l4 -4 l4 4" />

      {/* Camanchaca: tres bancos de neblina a velocidades primas */}
      <g className="silueta-niebla silueta-niebla--1">
        <ellipse cx="60" cy="102" rx="70" ry="7" />
      </g>
      <g className="silueta-niebla silueta-niebla--2">
        <ellipse cx="170" cy="108" rx="80" ry="6" />
      </g>
      <g className="silueta-niebla silueta-niebla--3">
        <ellipse cx="110" cy="96" rx="55" ry="5" />
      </g>

      {/* Greca diaguita: recorre el borde inferior sin costura */}
      <rect className="silueta-suelo" x="0" y="124" width="240" height="16" />
      <g className="silueta-greca silueta-greca--1">
        <path className="silueta-greca-trazo" d={greca(136, 5)} />
      </g>
      <g className="silueta-greca silueta-greca--2">
        <path className="silueta-greca-trazo silueta-greca-trazo--fino" d={zigzag(129, 3)} />
      </g>
    </svg>
  );
}
