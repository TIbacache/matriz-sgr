// La Serena en la barra lateral: la "ciudad de los campanarios" y el faro al
// fondo, con la camanchaca —la neblina costera de la región— pasando lenta y
// el haz del faro barriendo de vez en cuando (DESIGN §10.4, régimen de
// ambiente §3.6.bis). Es lo que hace que la barra sea de ESTA municipalidad y
// no de cualquiera. Decorativa para el lector de pantalla, nunca debajo de un
// texto, y se apaga con prefers-reduced-motion en layout.css.
//
// Siluetas en negro translúcido sobre el heráldico (no hay hex: DESIGN §8.10).
export function SiluetaSerena() {
  return (
    <svg className="silueta" viewBox="0 0 240 120" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      {/* Estrellas discretas */}
      {[
        [22, 18, 3.1],
        [64, 10, 4.3],
        [118, 24, 5.3],
        [176, 12, 6.1],
        [212, 28, 3.7],
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

      {/* Haz del faro: barre el cielo cada 17 s */}
      <g className="silueta-giro">
        <polygon className="silueta-haz" points="214,44 0,10 0,52" />
      </g>

      {/* Campanarios y faro: una sola silueta */}
      <g className="silueta-ciudad">
        {/* Iglesia 1: nave + campanario con arco y cruz */}
        <rect x="10" y="78" width="46" height="42" />
        <rect x="18" y="52" width="16" height="30" />
        <rect x="22" y="40" width="8" height="14" />
        <rect x="25" y="32" width="2" height="9" />
        <rect x="22" y="35" width="8" height="2" />
        {/* Catedral: dos torres y frontón */}
        <rect x="70" y="70" width="60" height="50" />
        <polygon points="70,70 100,54 130,70" />
        <rect x="74" y="44" width="12" height="28" />
        <rect x="114" y="44" width="12" height="28" />
        <rect x="79" y="34" width="2" height="11" />
        <rect x="76" y="37" width="8" height="2" />
        <rect x="119" y="34" width="2" height="11" />
        <rect x="116" y="37" width="8" height="2" />
        {/* Iglesia 2: campanario alto con cúpula */}
        <rect x="146" y="82" width="40" height="38" />
        <rect x="158" y="46" width="14" height="38" />
        <path d="M156 48 Q165 34 174 48 Z" />
        <rect x="164" y="26" width="2" height="9" />
        <rect x="161" y="29" width="8" height="2" />
        {/* Faro Monumental, al fondo */}
        <rect x="200" y="96" width="34" height="24" />
        <polygon points="210,96 224,96 221,52 213,52" />
        <rect x="211" y="48" width="12" height="4" />
        <rect x="213" y="40" width="8" height="8" />
        <path d="M212 40 Q217 33 222 40 Z" />
      </g>
      {/* Arcos de los campanarios: se "vacían" con el color del fondo */}
      <g className="silueta-hueco">
        <rect x="24" y="43" width="4" height="8" rx="2" />
        <rect x="78" y="48" width="4" height="9" rx="2" />
        <rect x="118" y="48" width="4" height="9" rx="2" />
        <rect x="163" y="52" width="4" height="10" rx="2" />
      </g>
      <circle className="silueta-luz" cx="217" cy="44" r="2.2" />

      {/* Camanchaca: tres bancos de neblina a velocidades primas */}
      <g className="silueta-niebla silueta-niebla--1">
        <ellipse cx="60" cy="104" rx="70" ry="9" />
      </g>
      <g className="silueta-niebla silueta-niebla--2">
        <ellipse cx="170" cy="110" rx="80" ry="8" />
      </g>
      <g className="silueta-niebla silueta-niebla--3">
        <ellipse cx="110" cy="98" rx="55" ry="6" />
      </g>
    </svg>
  );
}
