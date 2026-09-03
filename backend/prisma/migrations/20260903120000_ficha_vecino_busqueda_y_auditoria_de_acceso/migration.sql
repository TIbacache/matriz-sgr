-- Bloque B3 — Ficha del vecino (ADR-008, ADR-012, RF-032, CA-04).
--
-- Dos cosas, ninguna de negocio:
--   1. La bitácora necesita registrar el ACCESO a datos personales, no solo su
--      modificación (Leyes 19.628 / 21.719 y Ley 21.663 de ciberseguridad).
--   2. La búsqueda por nombre debe poder usar un índice. ADR-003 ya dejó un
--      índice de expresión sobre el nombre completo, pero es sensible a
--      mayúsculas y no sirve para un LIKE de prefijo en minúsculas, que es
--      como busca una persona. Se agrega el par que sí lo resuelve.

-- 1. Nueva acción de auditoría: consulta de una persona identificada.
ALTER TYPE "AccionAuditoria" ADD VALUE IF NOT EXISTS 'consultar';

-- 2. Índice de búsqueda por nombre, en minúsculas y con text_pattern_ops para
--    que `lower(expresión) LIKE 'ros%'` lo use (ADR-003, nota del Bloque B3).
CREATE INDEX IF NOT EXISTS personas_usuarias_nombre_busqueda
  ON personas_usuarias (
    lower(nombres || ' ' || apellido_paterno || ' ' || COALESCE(apellido_materno, ''))
    text_pattern_ops
  );
