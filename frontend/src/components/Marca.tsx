// Marca del producto: el trío del semáforo ● ▲ ■. No es decoración: son los
// tres símbolos de estado del sistema (accesibles sin color) usados como
// identidad. Mismo orden siempre: verde, amarillo, rojo.
export function MarcaSemaforo() {
  return (
    <span className="marca-semaforo" aria-hidden="true">
      <i className="ms-verde" />
      <i className="ms-amarillo" />
      <i className="ms-rojo" />
    </span>
  );
}
