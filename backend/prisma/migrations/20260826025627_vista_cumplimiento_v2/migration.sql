-- Vista de cumplimiento v2: corrige el cálculo según las fórmulas que el
-- cliente dictó en la reunión de requerimientos (docs/anotaciones-clase.md §1).
--
-- Cambios respecto a v1:
--   1. Tope por ítem 150% (antes 100%). Existe para forzar cumplimiento
--      EQUILIBRADO entre metas: sobrecumplir una sola no debe compensar
--      abandonar el resto (reunión 01:24:26).
--   2. Objetivo al día: porcentaje que se debería llevar hoy para cerrar el
--      trimestre en 100% (reunión 00:35:17).
--   3. Semáforo comparado contra el objetivo al día, no contra el 100% crudo:
--      verde >= 100, naranjo 60-99, rojo < 60 (reunión 00:48:16).
--
-- PENDIENTE (requiere el modelo por persona): dias_efectivos debe descontar
-- licencia + vacaciones + compensatorios + emergencia de cada funcionario
-- (reunión 01:05:31). Hoy dias_efectivos = días calendario del trimestre.

DROP MATERIALIZED VIEW IF EXISTS cumplimiento_ponderado_vista;

CREATE MATERIALIZED VIEW cumplimiento_ponderado_vista AS
WITH periodo AS (
  -- Deriva las fechas del trimestre desde el string "2026-Q3"
  SELECT
    trimestre,
    make_date(LEFT(trimestre, 4)::int, (RIGHT(trimestre, 1)::int - 1) * 3 + 1, 1) AS inicio
  FROM (SELECT DISTINCT trimestre FROM metas) t
),
periodo_calc AS (
  SELECT
    trimestre,
    ((inicio + INTERVAL '3 months')::date - inicio) AS dias_efectivos,
    GREATEST(
      LEAST((CURRENT_DATE - inicio) + 1, (inicio + INTERVAL '3 months')::date - inicio),
      0
    ) AS dias_transcurridos
  FROM periodo
),
base AS (
  SELECT
    m.organization_id,
    m.unidad_territorial_id,
    ut.nombre AS unidad_nombre,
    m.categoria_id,
    cg.nombre AS categoria_nombre,
    m.trimestre,
    -- Tope 150% por ítem
    LEAST(m.avance / NULLIF(m.meta_trimestre, 0), 1.5) AS cumpl_item,
    m.ponderador
  FROM metas m
  JOIN unidades_territoriales ut ON ut.id = m.unidad_territorial_id
  JOIN categorias_gestion cg     ON cg.id = m.categoria_id
),
con_total AS (
  SELECT
    base.*,
    SUM(cumpl_item * ponderador)
      OVER (PARTITION BY unidad_territorial_id, trimestre) AS cumpl_total
  FROM base
),
con_periodo AS (
  SELECT
    ct.*,
    p.dias_efectivos,
    p.dias_transcurridos,
    (p.dias_transcurridos::numeric / NULLIF(p.dias_efectivos, 0)) * 100 AS objetivo_al_dia
  FROM con_total ct
  JOIN periodo_calc p ON p.trimestre = ct.trimestre
)
SELECT
  organization_id,
  unidad_territorial_id,
  unidad_nombre,
  categoria_id,
  categoria_nombre,
  trimestre,
  ROUND(cumpl_item * 100, 1)::float8  AS cumplimiento_categoria,
  ponderador::float8                  AS ponderador,
  ROUND(cumpl_total * 100, 1)::float8 AS cumplimiento_total,
  ROUND(objetivo_al_dia, 1)::float8   AS objetivo_al_dia,
  dias_efectivos::int                 AS dias_efectivos,
  dias_transcurridos::int             AS dias_transcurridos,
  -- Avance relativo al objetivo del día: el número que colorea el semáforo.
  -- Antes de que el trimestre empiece no hay nada exigible todavía → 100%.
  ROUND(
    CASE WHEN objetivo_al_dia IS NULL OR objetivo_al_dia = 0 THEN 100
         ELSE (cumpl_total * 100) / objetivo_al_dia * 100
    END, 1)::float8                   AS avance_relativo,
  CASE
    WHEN objetivo_al_dia IS NULL OR objetivo_al_dia = 0 THEN 'verde'
    WHEN (cumpl_total * 100) / objetivo_al_dia * 100 >= 100 THEN 'verde'
    WHEN (cumpl_total * 100) / objetivo_al_dia * 100 >= 60  THEN 'naranjo'
    ELSE 'rojo'
  END                                 AS semaforo_color
FROM con_periodo;

-- Índice único requerido por REFRESH MATERIALIZED VIEW CONCURRENTLY.
CREATE UNIQUE INDEX cumplimiento_vista_pk
  ON cumplimiento_ponderado_vista (unidad_territorial_id, categoria_id, trimestre);

CREATE INDEX cumplimiento_vista_org
  ON cumplimiento_ponderado_vista (organization_id, trimestre);
