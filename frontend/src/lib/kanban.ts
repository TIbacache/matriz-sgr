import type { Rol, Tarea, UnidadTerritorial, Usuario } from "./types";

// Columnas del tubo. Hoy fijas; serán configurables por tenant (P2, HU pendiente).
export const COLUMNAS: { estado: string; titulo: string }[] = [
  { estado: "pendiente", titulo: "Pendiente" },
  { estado: "en_proceso", titulo: "En proceso" },
  { estado: "realizado", titulo: "Realizado" },
];

// Colores de identidad por categoría (franja izquierda de la tarjeta, DESIGN §5).
// Tonos apagados que no compiten con el semáforo. Se asignan por ordenPrioridad.
const COLORES_CATEGORIA = ["#153b50", "#5b7a1f", "#8f4a2b", "#3b6b8f", "#6b4a2b", "#1f7a3d"];

export function colorCategoria(indice: number): string {
  return COLORES_CATEGORIA[indice % COLORES_CATEGORIA.length]!;
}

// Espejo del alcance del backend (tareas.routes.ts::puedeEditar). El backend
// es la autoridad; esto solo decide qué tarjetas se pueden arrastrar en la UI.
export function puedeMoverTarea(
  usuario: Usuario,
  tarea: Tarea,
  unidad: UnidadTerritorial | undefined
): boolean {
  const rol: Rol = usuario.rol;
  if (rol === "admin" || rol === "supervisor") return true;
  if (rol === "gerente") return unidad?.responsableId === usuario.id;
  return tarea.responsableId === usuario.id;
}

export function fechaVencida(fechaCompromiso: string | null): boolean {
  if (!fechaCompromiso) return false;
  return new Date(fechaCompromiso).getTime() < new Date().setHours(0, 0, 0, 0);
}

export function formatearFecha(fechaCompromiso: string | null): string {
  if (!fechaCompromiso) return "";
  return new Date(fechaCompromiso).toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "short",
  });
}

export function iniciales(nombre: string): string {
  return nombre
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0] ?? "")
    .join("")
    .toUpperCase();
}
