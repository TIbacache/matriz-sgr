-- Bloque A3 · CA-08 · CA-09 · ADR-005
--
-- `categorias_gestion` era la ultima entidad editable del sistema sin columna
-- de version: sus PATCH sobrescribian en silencio. Con esta columna las tres
-- rutas heredadas (/tareas, /unidades, /categorias) pueden aplicar el mismo
-- bloqueo optimista que el modelo v2 y responder 409 en vez de pisar el dato.
--
-- `unidades_territoriales` y `tareas` ya la tenian desde el modelo v2; lo que
-- les faltaba era usarla, y eso vive en las rutas.

ALTER TABLE "categorias_gestion" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;
