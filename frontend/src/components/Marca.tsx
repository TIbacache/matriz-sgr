// Marca del producto: el trío del semáforo ● ▲ ■. No es decoración: son los
// tres símbolos de estado del sistema (accesibles sin color) usados como
// identidad. Mismo orden siempre: verde, amarillo, rojo.
//
// `mono`: sobre la barra heráldica y el panel del login el trío va en un solo
// tono (currentColor). Las formas siguen distinguiéndose y el color de estado
// no entra en una zona de identidad (ADR-011).
export function MarcaSemaforo({ mono = false }: { mono?: boolean }) {
  return (
    <span className={mono ? "marca-semaforo marca-semaforo--mono" : "marca-semaforo"} aria-hidden="true">
      <i className="ms-verde" />
      <i className="ms-amarillo" />
      <i className="ms-rojo" />
    </span>
  );
}
