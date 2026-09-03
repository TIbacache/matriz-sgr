import { prisma } from "../lib/prisma.js";

// Parámetros de negocio — ADR-007 · RF-038 · RNF-015.
//
// NINGÚN valor de negocio se escribe en el código. El PDF es explícito: el
// período no se codifica en 90/91 días, el tope de 150% "debe ser
// configurable", el umbral de 80% "configurable por período" y los ajustes por
// felicitación/reclamo "no se codifican con valores fijos hasta que exista una
// regla parametrizada y aprobada" (RN-011, §13.1).
//
// Resolución: primero el valor específico del período; si no existe, el valor
// por defecto de la organización. Así cambiar un parámetro no altera los
// resultados de períodos ya cerrados (RF-038).

export const CLAVES = {
  topeCumplimientoItem: "tope_cumplimiento_item",
  umbralMinimoColectivo: "umbral_minimo_colectivo",
  semaforoVerde: "semaforo_verde",
  semaforoNaranjo: "semaforo_naranjo",
  ajusteFelicitacion: "ajuste_felicitacion",
  topeFelicitaciones: "tope_felicitaciones",
  ajusteReclamo: "ajuste_reclamo",
  diasSinIngresoAlerta: "dias_sin_ingreso_alerta",
  evidenciaTamanoMaxMb: "evidencia_tamano_max_mb",
  ventanaDuplicidadDias: "ventana_duplicidad_dias",
} as const;

export type ClaveParametro = (typeof CLAVES)[keyof typeof CLAVES];

/**
 * Valores iniciales. `confirmado: false` marca los que aún esperan definición
 * oficial del docente (ver requerimientos-oficiales.md §10) — la UI los muestra
 * con advertencia en vez de presentarlos como definitivos.
 */
export const VALORES_INICIALES: {
  clave: ClaveParametro;
  valor: number;
  descripcion: string;
  confirmado: boolean;
}[] = [
  {
    clave: CLAVES.topeCumplimientoItem,
    valor: 1.5,
    descripcion: "Tope de cumplimiento por ítem (150%). RN-005: máximo observado, por confirmar.",
    confirmado: false,
  },
  {
    clave: CLAVES.umbralMinimoColectivo,
    valor: 0.8,
    descripcion: "Umbral mínimo esperado (80%). RN-006, configurable por período.",
    confirmado: true,
  },
  {
    clave: CLAVES.semaforoVerde,
    valor: 1.0,
    descripcion: "Verde cuando el avance alcanza el 100% del objetivo al día. RN-008.",
    confirmado: true,
  },
  {
    clave: CLAVES.semaforoNaranjo,
    valor: 0.6,
    descripcion: "Naranjo desde el 60% del objetivo al día; bajo eso, rojo. RN-008.",
    confirmado: true,
  },
  {
    clave: CLAVES.ajusteFelicitacion,
    valor: 0.1,
    descripcion:
      "Felicitación +10%. ⚠ Sin confirmar: la planilla dice +10%, el audio '+10 máx 1 mensual'. RN-011.",
    confirmado: false,
  },
  {
    clave: CLAVES.topeFelicitaciones,
    valor: 3,
    descripcion: "Máximo de felicitaciones computables por período (planilla: MAX 3). Sin confirmar.",
    confirmado: false,
  },
  {
    clave: CLAVES.ajusteReclamo,
    valor: -0.2,
    descripcion:
      "Reclamo −20%. ⚠ Sin confirmar: el PDF menciona −20% y −30%, la planilla −20%. RN-011.",
    confirmado: false,
  },
  {
    clave: CLAVES.diasSinIngresoAlerta,
    valor: 7,
    descripcion: "Días sin registrar actividad que gatillan alerta. RF-030, RF-037.",
    confirmado: false,
  },
  {
    clave: CLAVES.evidenciaTamanoMaxMb,
    valor: 10,
    descripcion:
      "Tamaño máximo de una evidencia, en MB. RNF-017 exige definirlo y deja el valor a " +
      "criterio del equipo: es configuración operativa del administrador, no una regla " +
      "pendiente del docente. Los formatos aceptados viven en el catálogo formato_evidencia.",
    confirmado: true,
  },
  {
    clave: CLAVES.ventanaDuplicidadDias,
    valor: 30,
    descripcion:
      "Días dentro de los cuales dos atenciones del mismo tipo en delegaciones distintas " +
      "levantan el aviso de posible duplicidad (ADR-008, CA-04). ⚠ Sin confirmar: ninguna " +
      "fuente fija la ventana. 30 días es el ciclo de gestión municipal más corto y evita " +
      "que el aviso mezcle temporadas distintas. Consulta abierta nº 12.",
    confirmado: false,
  },
];

/**
 * Lee un parámetro: primero el del período, luego el de la organización.
 * Lanza si no existe — un parámetro faltante es un error de configuración,
 * no algo que deba resolverse con un valor mágico escondido en el código.
 */
export async function obtenerParametro(
  organizationId: string,
  clave: ClaveParametro,
  periodoId?: string | null
): Promise<number> {
  const candidatos = await prisma.parametro.findMany({
    where: {
      organizationId,
      clave,
      OR: [{ periodoId: periodoId ?? null }, { periodoId: null }],
    },
  });
  // El específico del período gana sobre el general
  const elegido =
    candidatos.find((p) => p.periodoId === periodoId && periodoId != null) ??
    candidatos.find((p) => p.periodoId === null);

  if (!elegido) {
    throw new Error(
      `Parámetro '${clave}' no configurado para la organización ${organizationId}. ` +
        `Ejecutar la siembra de parámetros (ADR-007).`
    );
  }
  return elegido.valor.toNumber();
}

/** Todos los parámetros vigentes, para el panel de configuración y el cálculo. */
export async function obtenerParametros(
  organizationId: string,
  periodoId?: string | null
): Promise<Record<string, { valor: number; confirmado: boolean; descripcion: string | null }>> {
  const filas = await prisma.parametro.findMany({
    where: { organizationId, OR: [{ periodoId: periodoId ?? null }, { periodoId: null }] },
    orderBy: { periodoId: "asc" }, // null primero: el del período lo sobrescribe
  });
  const salida: Record<string, { valor: number; confirmado: boolean; descripcion: string | null }> = {};
  for (const f of filas) {
    salida[f.clave] = {
      valor: f.valor.toNumber(),
      confirmado: f.confirmado,
      descripcion: f.descripcion,
    };
  }
  return salida;
}

/**
 * Siembra los valores iniciales de una organización (idempotente).
 * Se usa findFirst + create en vez de upsert porque `periodoId` es nullable y
 * Prisma no admite null dentro de una clave única compuesta.
 */
export async function sembrarParametros(organizationId: string): Promise<void> {
  for (const p of VALORES_INICIALES) {
    const existente = await prisma.parametro.findFirst({
      where: { organizationId, periodoId: null, clave: p.clave },
      select: { id: true },
    });
    if (existente) {
      await prisma.parametro.update({
        where: { id: existente.id },
        data: { descripcion: p.descripcion },
      });
    } else {
      await prisma.parametro.create({
        data: {
          organizationId,
          periodoId: null,
          clave: p.clave,
          valor: p.valor,
          descripcion: p.descripcion,
          confirmado: p.confirmado,
        },
      });
    }
  }
}
