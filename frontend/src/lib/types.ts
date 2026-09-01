// Tipos espejo del contrato de la API (docs/estado-proyecto.md)

// Los 6 actores del PDF §3. `verificador` y `consulta` existen desde el
// modelo v2 (segregación de funciones, RNF-005).
export type Rol = "admin" | "supervisor" | "gerente" | "usuario" | "verificador" | "consulta";

export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  rol: Rol;
  organizationId: string;
}

// Terminología configurable por tenant (HU-1.3)
export interface Terminologia {
  unidad?: string;
  unidades?: string;
  autoridad?: string;
  categoria?: string;
  categorias?: string;
}

export interface UnidadTerritorial {
  id: string;
  nombre: string;
  responsableId: string | null;
  responsable: { id: string; nombre: string; email: string } | null;
  // El libro/tubo es privado por delegación (regla del cliente): true si este
  // rol puede abrir el tubo de esta unidad. El semáforo consolidado es aparte
  // y lo ven todos.
  puedeVerLibro: boolean;
}

export interface CategoriaGestion {
  id: string;
  nombre: string;
  ordenPrioridad: number;
}

export interface Tarea {
  id: string;
  unidadTerritorialId: string;
  categoriaId: string;
  titulo: string;
  descripcion: string | null;
  estado: string;
  fechaCompromiso: string | null;
  responsableId: string | null;
  responsable: { id: string; nombre: string } | null;
  categoria: { id: string; nombre: string } | null;
}

export interface Conectado {
  userId: string;
  nombre: string;
  rol: Rol;
}

// ---------------------------------------------------------------------------
// Modelo v2 — espejo del contrato de docs/estado-proyecto.md §API del modelo v2
// ---------------------------------------------------------------------------

export type Semaforo = "verde" | "naranjo" | "rojo";

export interface Periodo {
  id: string;
  nombre: string;
  estado: "abierto" | "cerrado";
  fechaInicio: string; // ISO 8601, solo día
  fechaTermino: string;
  version: number;
  // Calculados por el servidor desde las fechas: el sistema nunca fija 90/91
  // días (§13.1 del PDF).
  diasTotales: number;
  diasTranscurridos: number;
  porcentajeTranscurrido: number;
}

export interface CumplimientoItem {
  itemId: string;
  itemNombre: string;
  tipo: "cantidad" | "porcentaje";
  direccion: "mayor_mejor" | "menor_mejor";
  meta: number;
  avance: number;
  cumplimiento: number;
  ponderador: number;
  ponderado: number;
}

export interface CumplimientoFuncionario {
  funcionarioId: string;
  nombre: string;
  cargo: string | null;
  unidadTerritorialId: string | null;
  items: CumplimientoItem[];
  cumplimientoTotal: number;
  ajustes: number;
  cumplimientoFinal: number;
  diasComputables: number;
  diasTranscurridosComputables: number;
  objetivoAlDia: number;
  avanceRelativo: number;
  semaforo: Semaforo;
  ultimoIngreso: string | null;
  diasSinIngreso: number | null;
  totalIngresos: number;
  promedioDiario: number;
}

/** Un parámetro vigente. `confirmado: false` = espera definición del docente. */
export interface ParametroVigente {
  valor: number;
  confirmado: boolean;
  descripcion: string | null;
}

export interface CumplimientoRespuesta {
  periodo: Omit<Periodo, "version" | "porcentajeTranscurrido">;
  parametros: Record<string, ParametroVigente>;
  resumen: {
    funcionarios: number;
    promedioCumplimiento: number;
    porSemaforo: Record<Semaforo, number>;
  };
  funcionarios: CumplimientoFuncionario[];
}

export type DecisionValidacion = "pendiente" | "aprobada" | "rechazada" | "correccion_solicitada";

export interface Validacion {
  id: string;
  decision: DecisionValidacion;
  observacion: string | null;
  decididaEn: string | null;
  verificadorId: string;
  createdAt: string;
}

export interface Evidencia {
  id: string;
  archivoNombre: string;
  mimeType: string;
  tamanoBytes: number;
  createdAt: string;
  subidaPorId: string;
  validaciones: Validacion[];
}

export interface Actividad {
  id: string;
  codigo: string;
  fecha: string;
  descripcion: string;
  accion: string | null;
  itemId: string | null;
  funcionarioId: string;
  unidadTerritorialId: string;
  contactoNombre: string | null;
  contactoFono: string | null;
  ingresoATubo: boolean;
  anulada: boolean;
  motivoAnulacion: string | null;
  version: number;
  item: { id: string; nombre: string; tipo: string; direccion: string } | null;
  funcionario: { id: string; nombre: string };
  unidad: { id: string; nombre: string };
  personaUsuaria: { id: string; rut: string | null; nombres: string; apellidoPaterno: string } | null;
  evidencias: Evidencia[];
  /** Solo en la respuesta del alta: ADR-008, la persona ya fue atendida en otra delegación */
  alertaTrazabilidad?: { mensaje: string; delegaciones: string[] } | null;
}

export interface ListaActividades {
  total: number;
  limite: number;
  desde: number;
  actividades: Actividad[];
}

/** Una evidencia tal como la lista la bandeja del verificador (GET /evidencias). */
export interface EvidenciaEnBandeja {
  id: string;
  archivoNombre: string;
  mimeType: string;
  tamanoBytes: number;
  createdAt: string;
  subidaPorId: string;
  subidaPor: { id: string; nombre: string };
  actividad: {
    id: string;
    codigo: string;
    fecha: string;
    descripcion: string;
    anulada: boolean;
    funcionarioId: string;
    unidadTerritorialId: string;
    periodoId: string;
    funcionario: { id: string; nombre: string };
    unidad: { id: string; nombre: string };
    item: { id: string; nombre: string } | null;
  };
  validaciones: (Validacion & { verificador: { id: string; nombre: string } })[];
}

export interface ListaEvidencias {
  total: number;
  limite: number;
  desde: number;
  estado: string;
  evidencias: EvidenciaEnBandeja[];
}

// --- Cargos, ítems y metas por funcionario (RF-003, RF-006, RF-007) ---------

export interface ItemMedicion {
  id: string;
  cargoId: string;
  nombre: string;
  tipo: "cantidad" | "porcentaje";
  direccion: "mayor_mejor" | "menor_mejor";
  alimentadoPorTubo: boolean;
  orden: number;
  activo: boolean;
  version: number;
}

export interface Cargo {
  id: string;
  nombre: string;
  area: string | null;
  activo: boolean;
  version: number;
  items: ItemMedicion[];
}

/** Una persona del directorio (`GET /usuarios`). */
export interface MiembroDirectorio {
  userId: string;
  nombre: string;
  email: string;
  rol: Rol;
  cargo: string | null;
  /** Vínculo real al cargo del modelo v2: dice qué ítems se le miden. */
  cargoId: string | null;
  unidad: { id: string; nombre: string } | null;
}

/** Meta y ponderador de un funcionario en un ítem y período (`/metas-item`). */
export interface MetaItem {
  id: string;
  periodoId: string;
  itemId: string;
  funcionarioId: string;
  /** El ponderador viaja como fracción 0..1; la pantalla muestra porcentaje. */
  metaValor: string | number;
  ponderador: string | number;
  version: number;
  item: Pick<ItemMedicion, "id" | "nombre" | "tipo" | "direccion" | "activo" | "cargoId">;
  funcionario: { id: string; nombre: string };
  periodo: { id: string; nombre: string; estado: "abierto" | "cerrado" };
}

export interface ResumenMetas {
  periodoId: string;
  funcionarioId: string;
  nombre: string;
  suma: number;
  sumaPonderadores: number;
  /** RN-001: los ponderadores de un funcionario suman 100% */
  cumpleRN001: boolean;
  faltante: number;
}

export interface ListaMetas {
  total: number;
  metas: MetaItem[];
  resumen: ResumenMetas[];
}

export interface CatalogoItem {
  id: string;
  catalogo: string;
  valor: string;
  area: string | null;
  orden: number;
  vigente: boolean;
}
