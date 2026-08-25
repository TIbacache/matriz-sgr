-- Vista materializada de cumplimiento ponderado (Documento Maestro §2).
-- Se refresca por cron (src/jobs/cumplimiento.ts) y a demanda vía POST /kpis/recalcular.
-- cumplimiento_categoria = avance/meta por categoría (tope 100%).
-- cumplimiento_total     = suma ponderada por unidad+trimestre (misma cifra
--                          repetida en cada fila de la unidad para leerla sin re-agregar).
-- Umbrales del semáforo: verde >= 80, amarillo 50-79, rojo < 50 (HU-4.2).

CREATE MATERIALIZED VIEW cumplimiento_ponderado_vista AS
SELECT
  m.organization_id,
  m.unidad_territorial_id,
  ut.nombre                                        AS unidad_nombre,
  m.categoria_id,
  cg.nombre                                        AS categoria_nombre,
  m.trimestre,
  ROUND(LEAST(m.avance / NULLIF(m.meta_trimestre, 0), 1) * 100, 1)::float8
                                                   AS cumplimiento_categoria,
  m.ponderador::float8                             AS ponderador,
  ROUND(SUM(LEAST(m.avance / NULLIF(m.meta_trimestre, 0), 1) * m.ponderador)
        OVER (PARTITION BY m.unidad_territorial_id, m.trimestre) * 100, 1)::float8
                                                   AS cumplimiento_total,
  CASE
    WHEN SUM(LEAST(m.avance / NULLIF(m.meta_trimestre, 0), 1) * m.ponderador)
         OVER (PARTITION BY m.unidad_territorial_id, m.trimestre) * 100 >= 80 THEN 'verde'
    WHEN SUM(LEAST(m.avance / NULLIF(m.meta_trimestre, 0), 1) * m.ponderador)
         OVER (PARTITION BY m.unidad_territorial_id, m.trimestre) * 100 >= 50 THEN 'amarillo'
    ELSE 'rojo'
  END                                              AS semaforo_color
FROM metas m
JOIN unidades_territoriales ut ON ut.id = m.unidad_territorial_id
JOIN categorias_gestion cg     ON cg.id = m.categoria_id;

-- Índice único requerido por REFRESH MATERIALIZED VIEW CONCURRENTLY.
CREATE UNIQUE INDEX cumplimiento_vista_pk
  ON cumplimiento_ponderado_vista (unidad_territorial_id, categoria_id, trimestre);

CREATE INDEX cumplimiento_vista_org
  ON cumplimiento_ponderado_vista (organization_id, trimestre);
