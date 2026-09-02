import type { CumplimientoFuncionario, CumplimientoRespuesta } from "../../lib/types";
import { ChipSemaforo } from "../ChipSemaforo";
import { fechaCl } from "../../lib/ficha";
import { useContador } from "../../lib/useContador";

interface Props {
  ficha: CumplimientoFuncionario;
  periodo: CumplimientoRespuesta["periodo"];
  delegacion: string | null;
  aviso: string | null;
}

// Bloque 1 de la ficha personal (DESIGN §8.2): identidad + UNA cifra hero.
// La cifra hero es el cumplimiento del período; el semáforo NO se calcula
// sobre ella sino sobre el avance relativo al objetivo del día (RN-008), y por
// eso ambos aparecen juntos: la cifra sola engaña si no se compara con lo que
// se debería llevar hoy.
export function CabeceraFicha({ ficha, periodo, delegacion, aviso }: Props) {
  const num = (n: number) => n.toFixed(1).replace(".", ",");
  // La cifra hero llega contando (DESIGN §3.6); el resto de las métricas se
  // escriben directo para no convertir la cabecera en un tablero de slots.
  const refCifra = useContador(ficha.cumplimientoFinal);

  return (
    <section className="card ficha-cabecera entrada" aria-label="Resumen del período">
      <div className="ficha-identidad">
        <h3 className="ficha-nombre">{ficha.nombre}</h3>
        <p className="ficha-meta">
          {ficha.cargo ?? "Sin cargo asignado"}
          {delegacion ? ` · ${delegacion}` : ""}
        </p>
        <p className="ficha-periodo">
          {periodo.nombre} · {fechaCl(periodo.fechaInicio)} a {fechaCl(periodo.fechaTermino)} ·{" "}
          <span className="tnum">
            día {periodo.diasTranscurridos} de {periodo.diasTotales}
          </span>
        </p>
      </div>

      <div className="ficha-hero">
        <span className="ficha-hero-etiqueta">Cumplimiento del período</span>
        <strong className="ficha-hero-cifra">
          <span ref={refCifra}>{num(ficha.cumplimientoFinal)}</span>%
        </strong>
        {/* El chip hero late solo en rojo: es el único estado crítico real de
            la pantalla (DESIGN §3.6.1), y late aquí, no en cada fila. */}
        <ChipSemaforo
          semaforo={ficha.semaforo}
          pulsa={ficha.semaforo === "rojo"}
          ayuda={`Avance relativo al objetivo del día: ${num(ficha.avanceRelativo)}%`}
        />
      </div>

      <dl className="ficha-metricas">
        <div>
          <dt>Objetivo al día</dt>
          <dd className="tnum">{num(ficha.objetivoAlDia)}%</dd>
          <span className="ficha-metrica-pie">
            {ficha.diasTranscurridosComputables} de {ficha.diasComputables} días computables
          </span>
        </div>
        <div>
          <dt>Avance relativo</dt>
          <dd className="tnum">{num(ficha.avanceRelativo)}%</dd>
          <span className="ficha-metrica-pie">Es lo que decide el color</span>
        </div>
        <div>
          <dt>Registros validados</dt>
          <dd className="tnum">{ficha.totalIngresos}</dd>
          <span className="ficha-metrica-pie">
            {ficha.diasSinIngreso === null
              ? "Sin registros validados aún"
              : `Último hace ${ficha.diasSinIngreso} día${ficha.diasSinIngreso === 1 ? "" : "s"} · ${num(ficha.promedioDiario)} al día`}
          </span>
        </div>
        {ficha.ajustes !== 0 && (
          <div>
            <dt>Ajustes</dt>
            <dd className="tnum">
              {ficha.ajustes > 0 ? "+" : ""}
              {num(ficha.ajustes)}%
            </dd>
            <span className="ficha-metrica-pie">Felicitaciones y reclamos</span>
          </div>
        )}
      </dl>

      {aviso && (
        <p className="ficha-aviso" role="note">
          {aviso}
        </p>
      )}
    </section>
  );
}
