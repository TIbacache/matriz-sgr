// Tipos espejo del contrato de la API (docs/estado-proyecto.md)

export type Rol = "admin" | "supervisor" | "gerente" | "usuario";

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
