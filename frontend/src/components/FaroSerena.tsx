// El Faro Monumental de La Serena sobre la Avenida del Mar, en duotono sobre
// el rojo heráldico (DESIGN §10.4). Es la imagen que la ciudad reconoce al
// instante, y un faro orienta: lo mismo que hace el sistema con el trabajo de
// las delegaciones. Vectorial a propósito: pesa lo que pesa este archivo, no
// tiene licencia que pedir y no entra en la ruta crítica de la ficha.
//
// `activo`: el haz barre solo mientras el sistema autentica. El movimiento
// significa estado, no decora (DESIGN §3.6); con prefers-reduced-motion se
// apaga en login.css.
//
// Solo dos tintas: blanco a distintas opacidades y --marca-oscuro para el mar.
// Los colores viven en login.css (clases), no aquí (DESIGN §8.10).
export function FaroSerena({ activo }: { activo: boolean }) {
  return (
    <svg
      className={activo ? "faro faro--activo" : "faro"}
      viewBox="0 0 800 360"
      preserveAspectRatio="xMidYMax slice"
      role="img"
      aria-labelledby="faro-titulo"
    >
      <title id="faro-titulo">Faro Monumental de La Serena sobre la costa, de noche</title>

      {/* Astro sobre el mar */}
      <circle className="faro-astro" cx="640" cy="92" r="34" />

      {/* Haz del faro: sale de la linterna hacia el mar */}
      <polygon className="faro-haz" points="340,74 800,40 800,112" />
      <polygon className="faro-haz faro-haz--tenue" points="340,74 0,60 0,92" />

      {/* Mar y sus líneas de espuma */}
      <rect className="faro-mar" x="0" y="232" width="800" height="128" />
      <path
        className="faro-ola"
        d="M420 262 q20 -8 40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0"
      />
      <path
        className="faro-ola"
        d="M460 292 q20 -8 40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0"
      />
      <path className="faro-ola" d="M520 322 q20 -8 40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0" />

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
