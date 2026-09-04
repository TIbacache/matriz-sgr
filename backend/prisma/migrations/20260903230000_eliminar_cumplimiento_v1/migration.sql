-- Bloque C — se elimina el cálculo de cumplimiento v1.
--
-- Qué se va y por qué:
--
--   1. `cumplimiento_ponderado_vista`: vista materializada que calculaba el
--      cumplimiento POR DELEGACIÓN, con el tope (150%) y los umbrales del
--      semáforo (100/60) escritos dentro del SQL. La especificación mide a la
--      PERSONA (cargo → ítems → metas) y exige que esos valores sean
--      configurables (RF-024, RF-027, RNF-015, ADR-007). Su reemplazo es
--      `services/cumplimiento.ts` + `consolidarPeriodo()`, que leen los
--      parámetros de la tabla `parametro`.
--
--   2. Tabla `metas` (modelo v1: unidad × categoría × trimestre): era la única
--      fuente de la vista. Quedó sin dueño al llegar `metas_item` (RF-007):
--      ningún seed la puebla y ningún proceso actualiza su columna `avance`,
--      así que el tablero mostraba cifras que ya no se podían reproducir.
--
-- Se conservan `unidades_territoriales` y `categorias_gestion`: sostienen el
-- tubo de trabajo (RF-001, EP-04), que es un requisito vigente.
--
-- ⚠ Irreversible: los datos de la v1 no se migran a `metas_item` porque no son
-- equivalentes (una mide delegaciones, la otra personas). La reconstrucción de
-- las metas por funcionario se hace con el seed o con la pantalla `/metas`.

DROP MATERIALIZED VIEW IF EXISTS cumplimiento_ponderado_vista;

DROP TABLE IF EXISTS "metas";
