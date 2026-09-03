import { prisma } from "../lib/prisma.js";
import type { AuthPayload } from "../middleware/auth.js";
import { unidadesVisibles } from "./alcance.js";
import { CLAVES, obtenerParametro } from "./parametros.js";
import { nombreCompleto } from "../lib/persona.js";
import { formatearRut } from "../lib/rut.js";
import { aIso } from "../lib/fechas.js";

// Trazabilidad de la persona usuaria — ADR-008 · ADR-012 · CA-04 · RF-032 ·
// HU-03 · HU-29.
//
// Es el control que el cliente vino a buscar: el niño que pidió el mismo
// regalo de Navidad en cinco delegaciones y el sistema no lo detectaba. La
// unicidad del RUT a nivel de organización (no por delegación) hace que la
// duplicidad sea una propiedad del modelo; este servicio la vuelve visible.
//
// Dos cosas que este archivo hace cumplir y que NO son detalle:
//
// 1. **Mínimo privilegio (ADR-012, Leyes 19.628 / 21.719)**. El historial cruza
//    delegaciones a propósito, pero el libro de otra delegación sigue siendo
//    privado (regla 9). Por eso una atención de una delegación ajena viaja
//    REDUCIDA: fecha, delegación, tipo y estado — nunca la descripción, la
//    acción, el contacto ni quién la atendió. Con eso alcanza para detectar la
//    duplicidad y no alcanza para leer el libro de al lado.
// 2. **Ningún valor de negocio en el código**. La ventana de duplicidad sale
//    del parámetro `ventana_duplicidad_dias` (ADR-007). Prohibido fijarla.

/** Un hecho del historial: una atención registrada o un compromiso del tubo. */
export interface HechoHistorial {
  tipo: "actividad" | "compromiso";
  id: string;
  fecha: string | null;
  delegacion: { id: string; nombre: string };
  /** Clasificación con la que se compara la duplicidad: ítem o categoría. */
  clasificacion: { clave: string; nombre: string } | null;
  estado: string;
  /** true si este rol puede ver el detalle completo de este hecho (ADR-012). */
  detallado: boolean;
  codigo: string | null;
  titulo: string | null;
  descripcion: string | null;
  accion: string | null;
  funcionario: { id: string; nombre: string } | null;
  contactoNombre: string | null;
  contactoFono: string | null;
}

export interface CoincidenciaDuplicidad {
  clasificacion: string;
  delegaciones: string[];
  fechas: string[];
  diasEntre: number;
  /** Los hechos concretos que la componen: la pantalla marca ESOS, no todos
      los de la delegación. Marcar de más convierte el aviso en decorado. */
  hechos: string[];
}

export interface AvisoDuplicidad {
  nivel: "ambar";
  mensaje: string;
  ventanaDias: number;
  /** El parámetro todavía espera definición del docente (consulta nº 12). */
  ventanaConfirmada: boolean;
  coincidencias: CoincidenciaDuplicidad[];
}

export interface PersonaResumen {
  id: string;
  rut: string | null;
  rutFormateado: string;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string | null;
  nombreCompleto: string;
}

/** Serialización mínima: lo que basta para elegir a alguien en una lista. */
export function aPersonaResumen(p: {
  id: string;
  rut: string | null;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string | null;
}): PersonaResumen {
  return {
    id: p.id,
    rut: p.rut,
    rutFormateado: formatearRut(p.rut),
    nombres: p.nombres,
    apellidoPaterno: p.apellidoPaterno,
    apellidoMaterno: p.apellidoMaterno,
    nombreCompleto: nombreCompleto(p),
  };
}

/**
 * El historial completo de una persona, cruzando delegaciones.
 *
 * `visibles === null` significa "ve todas" (admin y supervisor). Para el resto,
 * lo que cae fuera de sus delegaciones llega reducido, no oculto: ocultarlo
 * destruiría justamente el control que ADR-008 vino a dar.
 */
export async function historialDePersona(
  organizationId: string,
  personaUsuariaId: string,
  visibles: string[] | null
): Promise<HechoHistorial[]> {
  const [actividades, tareas] = await Promise.all([
    prisma.actividad.findMany({
      where: { organizationId, personaUsuariaId, anulada: false },
      select: {
        id: true,
        codigo: true,
        fecha: true,
        descripcion: true,
        accion: true,
        contactoNombre: true,
        contactoFono: true,
        unidadTerritorialId: true,
        unidad: { select: { id: true, nombre: true } },
        item: { select: { id: true, nombre: true } },
        funcionario: { select: { id: true, nombre: true } },
        evidencias: {
          select: { validaciones: { select: { decision: true }, orderBy: { createdAt: "desc" }, take: 1 } },
        },
      },
      orderBy: { fecha: "desc" },
      take: 500,
    }),
    prisma.tarea.findMany({
      where: { organizationId, personaUsuariaId },
      select: {
        id: true,
        titulo: true,
        descripcion: true,
        estado: true,
        observaciones: true,
        fechaSolicitud: true,
        createdAt: true,
        unidadTerritorialId: true,
        unidad: { select: { id: true, nombre: true } },
        categoria: { select: { id: true, nombre: true } },
        responsable: { select: { id: true, nombre: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 500,
    }),
  ]);

  const puedeVer = (unidadId: string) => visibles === null || visibles.includes(unidadId);

  const deActividades: HechoHistorial[] = actividades.map((a) => {
    const detallado = puedeVer(a.unidadTerritorialId);
    // RN-009: el estado que importa es el de la validación, no el del registro.
    const decision = a.evidencias[0]?.validaciones[0]?.decision;
    const estado = decision ?? (a.evidencias.length > 0 ? "pendiente" : "sin_evidencia");
    return {
      tipo: "actividad",
      id: a.id,
      fecha: aIso(a.fecha),
      delegacion: a.unidad,
      clasificacion: a.item ? { clave: `item:${a.item.id}`, nombre: a.item.nombre } : null,
      estado,
      detallado,
      // El código de evidencia identifica el registro sin revelar su contenido:
      // es lo que permite pedirle a la otra delegación que revise ESE caso.
      codigo: a.codigo,
      titulo: null,
      descripcion: detallado ? a.descripcion : null,
      accion: detallado ? a.accion : null,
      funcionario: detallado ? a.funcionario : null,
      contactoNombre: detallado ? a.contactoNombre : null,
      contactoFono: detallado ? a.contactoFono : null,
    };
  });

  const deTareas: HechoHistorial[] = tareas.map((t) => {
    const detallado = puedeVer(t.unidadTerritorialId);
    return {
      tipo: "compromiso",
      id: t.id,
      fecha: aIso(t.fechaSolicitud ?? t.createdAt),
      delegacion: t.unidad,
      clasificacion: { clave: `categoria:${t.categoria.id}`, nombre: t.categoria.nombre },
      estado: t.estado,
      detallado,
      codigo: null,
      // El título del compromiso es su identificación en el tubo y se muestra
      // siempre: sin él, una fila de otra delegación no dice nada útil. El
      // detalle libre (descripción y observaciones) sí queda reservado.
      titulo: t.titulo,
      descripcion: detallado ? (t.descripcion ?? t.observaciones) : null,
      accion: null,
      funcionario: detallado ? t.responsable : null,
      contactoNombre: null,
      contactoFono: null,
    };
  });

  return [...deActividades, ...deTareas].sort((a, b) => (b.fecha ?? "").localeCompare(a.fecha ?? ""));
}

const DIA_MS = 86_400_000;

/**
 * El aviso ámbar de ADR-008: atenciones **del mismo tipo** en **delegaciones
 * distintas** dentro de la ventana configurable.
 *
 * Informa; no bloquea ni acusa (DESIGN §8.2). Que dos delegaciones atiendan a
 * la misma persona puede ser correcto —vive en una y trabaja en otra—: lo que
 * el sistema aporta es que nadie tenga que acordarse de revisarlo.
 */
export function detectarDuplicidad(
  hechos: HechoHistorial[],
  ventanaDias: number,
  ventanaConfirmada: boolean
): AvisoDuplicidad | null {
  const porClasificacion = new Map<string, { nombre: string; hechos: HechoHistorial[] }>();
  for (const h of hechos) {
    // Sin clasificación no hay "mismo tipo" que comparar: entra al historial,
    // no al aviso. Inventar una equivalencia sería acusar sin fundamento.
    if (!h.clasificacion || !h.fecha) continue;
    const grupo = porClasificacion.get(h.clasificacion.clave) ?? {
      nombre: h.clasificacion.nombre,
      hechos: [],
    };
    grupo.hechos.push(h);
    porClasificacion.set(h.clasificacion.clave, grupo);
  }

  const coincidencias: CoincidenciaDuplicidad[] = [];
  for (const grupo of porClasificacion.values()) {
    const ordenados = grupo.hechos
      .slice()
      .sort((a, b) => (a.fecha ?? "").localeCompare(b.fecha ?? ""));
    const delegaciones = new Set<string>();
    const fechas = new Set<string>();
    const implicados = new Set<string>();
    let maxDias = 0;
    for (let i = 0; i < ordenados.length; i++) {
      for (let j = i + 1; j < ordenados.length; j++) {
        const a = ordenados[i]!;
        const b = ordenados[j]!;
        if (a.delegacion.id === b.delegacion.id) continue;
        const dias = Math.round(
          Math.abs(Date.parse(`${b.fecha}T00:00:00Z`) - Date.parse(`${a.fecha}T00:00:00Z`)) / DIA_MS
        );
        if (dias > ventanaDias) continue;
        delegaciones.add(a.delegacion.nombre);
        delegaciones.add(b.delegacion.nombre);
        fechas.add(a.fecha!);
        fechas.add(b.fecha!);
        implicados.add(`${a.tipo}-${a.id}`);
        implicados.add(`${b.tipo}-${b.id}`);
        if (dias > maxDias) maxDias = dias;
      }
    }
    if (delegaciones.size >= 2) {
      coincidencias.push({
        clasificacion: grupo.nombre,
        delegaciones: [...delegaciones].sort(),
        fechas: [...fechas].sort(),
        diasEntre: maxDias,
        hechos: [...implicados],
      });
    }
  }

  if (coincidencias.length === 0) return null;

  // El mensaje nombra hasta tres casos: una frase con quince coincidencias no
  // se lee y el detalle completo ya viaja en `coincidencias` para la pantalla.
  const MUESTRA = 3;
  const detalle = coincidencias
    .slice(0, MUESTRA)
    .map((c) => `«${c.clasificacion}» en ${c.delegaciones.join(" y ")}`)
    .join("; ");
  const resto = coincidencias.length - MUESTRA;
  return {
    nivel: "ambar",
    mensaje:
      `Esta persona registra atenciones del mismo tipo en más de una delegación dentro de ` +
      `${ventanaDias} días: ${detalle}${resto > 0 ? ` y ${resto} caso${resto === 1 ? "" : "s"} más` : ""}. ` +
      `Revisar antes de entregar el beneficio.`,
    ventanaDias,
    ventanaConfirmada,
    coincidencias,
  };
}

/** Lee la ventana del parámetro (ADR-007). Nunca un número en el código. */
export async function ventanaDuplicidad(
  organizationId: string
): Promise<{ dias: number; confirmada: boolean }> {
  const dias = await obtenerParametro(organizationId, CLAVES.ventanaDuplicidadDias);
  const fila = await prisma.parametro.findFirst({
    where: { organizationId, periodoId: null, clave: CLAVES.ventanaDuplicidadDias },
    select: { confirmado: true },
  });
  return { dias, confirmada: fila?.confirmado ?? false };
}

/**
 * ADR-012: quién puede abrir la ficha del vecino.
 *
 * Rige lo restrictivo mientras el docente no responda la consulta nº 12. El
 * verificador está fuera por segregación de funciones (valida evidencias, no
 * necesita la identidad del vecino) y el rol de consulta porque el PDF §3 lo
 * define sobre "tableros e informes", que son agregados y no datos personales
 * identificados.
 */
export const ROLES_FICHA_VECINO = ["admin", "supervisor", "gerente", "usuario"] as const;

export function puedeVerFichaVecino(auth: AuthPayload): boolean {
  return (ROLES_FICHA_VECINO as readonly string[]).includes(auth.rol);
}

/** Las delegaciones que este rol ve con detalle completo. */
export async function alcanceDetallado(auth: AuthPayload): Promise<string[] | null> {
  return unidadesVisibles(auth);
}
