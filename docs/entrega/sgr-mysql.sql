-- =============================================================================
--  SGR — Sistema de Gestión de Resultados
--  Script de creación de la base de datos en MySQL
--
--  Origami SpA · Proyecto integrador INACAP
--  Entrega del 15 de septiembre de 2026 — criterio 7
--
--  22 tablas · 52 claves foráneas · 8 enumerados
--
--  Este script es la traducción a MySQL del esquema que el sistema ejecuta
--  sobre PostgreSQL 16 (backend/prisma/schema.prisma y sus migraciones). La
--  equivalencia de tipos está declarada en docs/entrega/der.md §12.
--
--  Requiere MySQL 8.0.16+ o MariaDB 10.2.3+: antes de esas versiones las
--  restricciones CHECK se analizan y se ignoran EN SILENCIO, y aquí sostienen
--  reglas de negocio (formato del RUT, fechas del período, rango del
--  ponderador). Probado en MySQL 8.0.46 y en MariaDB 10.4 y 11.4 —la que
--  trae XAMPP—: corre igual en las tres, sin cambiarle una línea.
--
--  Se ejecuta de principio a fin, en este orden. Las tablas están ordenadas
--  por dependencia de clave foránea, así que no hace falta desactivar la
--  verificación de integridad en ningún momento.
--
--  ⚠ Todos los datos de prueba son FICTICIOS. Ninguna persona, RUT, teléfono
--    o dirección de este archivo corresponde a alguien real.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 0. La base
-- -----------------------------------------------------------------------------
DROP DATABASE IF EXISTS sgr;

CREATE DATABASE sgr
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE sgr;

-- Todas las tablas son InnoDB: es el único motor de MySQL con claves foráneas
-- y transacciones, y este modelo depende de las dos.
SET default_storage_engine = INNODB;


-- =============================================================================
-- 1. PLATAFORMA E IDENTIDAD
-- =============================================================================

-- La organización es el tenant. Todas las tablas de negocio cuelgan de acá.
CREATE TABLE organizations (
  id                          CHAR(36)     NOT NULL,
  nombre                      VARCHAR(160) NOT NULL,
  tipo                        ENUM('municipio', 'empresa') NOT NULL,
  -- Terminología configurable por tenant: {"unidad": "sucursal", ...}
  configuracion_terminologia  JSON         NOT NULL DEFAULT (JSON_OBJECT()),
  created_at                  DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT organizations_pkey PRIMARY KEY (id)
) COMMENT = 'Tenant. Municipio o empresa que usa el sistema';

-- Usuario GLOBAL: es la única tabla sin organization_id. Un mismo correo puede
-- pertenecer a varias organizaciones con roles distintos, y el rol vive en
-- organization_members. `email` y `rut` son únicos GLOBALES: son la identidad
-- de la persona, que no cambia al entrar a otro municipio.
CREATE TABLE users (
  id                CHAR(36)     NOT NULL,
  email             VARCHAR(180) NOT NULL,
  password_hash     VARCHAR(255) NOT NULL,
  -- Nombre completo heredado del modelo v1. Los campos separados de abajo son
  -- la fuente correcta (ADR-003) y `nombre` se deriva de ellos.
  nombre            VARCHAR(200) NOT NULL,
  nombres           VARCHAR(100)     NULL,
  apellido_paterno  VARCHAR(100)     NULL,
  apellido_materno  VARCHAR(100)     NULL,
  -- ADR-001: canónico "17721947-9". El CHECK garantiza la FORMA; el módulo 11
  -- lo valida la aplicación, porque un CHECK no puede calcular un dígito.
  rut               VARCHAR(12)      NULL,
  activo            TINYINT(1)   NOT NULL DEFAULT 1,
  -- ADR-005: bloqueo optimista. Conflicto de versión → 409, nunca sobrescritura.
  version           INT          NOT NULL DEFAULT 1,
  created_at        DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT users_pkey        PRIMARY KEY (id),
  CONSTRAINT users_email_key   UNIQUE (email),
  CONSTRAINT users_rut_key     UNIQUE (rut),
  CONSTRAINT users_rut_formato CHECK (rut IS NULL OR rut REGEXP '^[0-9]{7,8}-[0-9K]$')
) COMMENT = 'Persona que entra al sistema. Global: no lleva organization_id';


-- =============================================================================
-- 2. ORGANIZACIÓN TERRITORIAL Y CARGOS
-- =============================================================================

-- RF-001: la delegación no se borra, se desactiva, para no perder su historia.
CREATE TABLE unidades_territoriales (
  id               CHAR(36)     NOT NULL,
  organization_id  CHAR(36)     NOT NULL,
  nombre           VARCHAR(160) NOT NULL,
  responsable_id   CHAR(36)         NULL,
  activo           TINYINT(1)   NOT NULL DEFAULT 1,
  version          INT          NOT NULL DEFAULT 1,
  CONSTRAINT unidades_territoriales_pkey PRIMARY KEY (id),
  CONSTRAINT unidades_territoriales_organization_id_fkey
    FOREIGN KEY (organization_id) REFERENCES organizations (id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  -- SET NULL: si se da de baja a la jefatura, la delegación sigue existiendo.
  CONSTRAINT unidades_territoriales_responsable_id_fkey
    FOREIGN KEY (responsable_id) REFERENCES users (id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  INDEX unidades_territoriales_organization_id_idx (organization_id)
) COMMENT = 'Delegación municipal';

-- RF-003: el cargo es la abstracción central. Define qué se le mide a quien
-- lo ocupa, y es lo que hace al sistema aplicable a otra organización.
CREATE TABLE cargos (
  id               CHAR(36)     NOT NULL,
  organization_id  CHAR(36)     NOT NULL,
  nombre           VARCHAR(160) NOT NULL,
  area             VARCHAR(60)      NULL,
  activo           TINYINT(1)   NOT NULL DEFAULT 1,
  version          INT          NOT NULL DEFAULT 1,
  created_at       DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at       DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
                                ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT cargos_pkey PRIMARY KEY (id),
  CONSTRAINT cargos_organization_id_nombre_key UNIQUE (organization_id, nombre),
  CONSTRAINT cargos_organization_id_fkey
    FOREIGN KEY (organization_id) REFERENCES organizations (id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  INDEX cargos_organization_id_activo_idx (organization_id, activo)
) COMMENT = 'Cargo del organigrama. Define los items que se le miden';

-- TABLA ASOCIATIVA: resuelve el N:M entre users y organizations, y lleva
-- atributos propios (el rol, la delegación y el cargo).
-- `unidad_territorial_id` nulo significa NIVEL CENTRAL: ve todas las
-- delegaciones. Es un valor con significado, no un dato faltante.
CREATE TABLE organization_members (
  id                     CHAR(36) NOT NULL,
  organization_id        CHAR(36) NOT NULL,
  user_id                CHAR(36) NOT NULL,
  rol                    ENUM('admin', 'supervisor', 'gerente',
                              'usuario', 'verificador', 'consulta') NOT NULL,
  unidad_territorial_id  CHAR(36)     NULL,
  -- Cargo textual del organigrama, del modelo v1. Se conserva como respaldo
  -- legible de `cargo_id`.
  cargo                  VARCHAR(120) NULL,
  cargo_id               CHAR(36)     NULL,
  CONSTRAINT organization_members_pkey PRIMARY KEY (id),
  CONSTRAINT organization_members_organization_id_user_id_key
    UNIQUE (organization_id, user_id),
  CONSTRAINT organization_members_organization_id_fkey
    FOREIGN KEY (organization_id) REFERENCES organizations (id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT organization_members_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT organization_members_unidad_territorial_id_fkey
    FOREIGN KEY (unidad_territorial_id) REFERENCES unidades_territoriales (id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT organization_members_cargo_id_fkey
    FOREIGN KEY (cargo_id) REFERENCES cargos (id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  INDEX organization_members_organization_id_unidad_territorial_id_idx
    (organization_id, unidad_territorial_id)
) COMMENT = 'Membresia: que rol tiene una persona en una organizacion';


-- =============================================================================
-- 3. AGENDA COLECTIVA (EL TUBO DE TRABAJO) Y LAS PERSONAS ATENDIDAS
-- =============================================================================

CREATE TABLE categorias_gestion (
  id               CHAR(36)     NOT NULL,
  organization_id  CHAR(36)     NOT NULL,
  nombre           VARCHAR(160) NOT NULL,
  orden_prioridad  INT          NOT NULL,
  version          INT          NOT NULL DEFAULT 1,
  CONSTRAINT categorias_gestion_pkey PRIMARY KEY (id),
  CONSTRAINT categorias_gestion_organization_id_fkey
    FOREIGN KEY (organization_id) REFERENCES organizations (id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  INDEX categorias_gestion_organization_id_idx (organization_id)
) COMMENT = 'Categoria de gestion del tubo de trabajo';

-- ADR-008: el vecino atendido. El RUT es único POR ORGANIZACIÓN y no por
-- delegación: es lo que permite detectar que la misma persona pidió lo mismo
-- en varias delegaciones. Con una ficha por delegación el cruce sería
-- imposible por construcción.
CREATE TABLE personas_usuarias (
  id                CHAR(36)     NOT NULL,
  organization_id   CHAR(36)     NOT NULL,
  -- Nulo si aún no se conoce: se atiende igual y el RUT se completa después.
  rut               VARCHAR(12)      NULL,
  nombres           VARCHAR(100) NOT NULL,
  apellido_paterno  VARCHAR(100) NOT NULL,
  apellido_materno  VARCHAR(100)     NULL,
  telefono          VARCHAR(20)      NULL,
  direccion         VARCHAR(255)     NULL,
  sector            VARCHAR(120)     NULL,
  version           INT          NOT NULL DEFAULT 1,
  created_at        DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at        DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
                                 ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT personas_usuarias_pkey PRIMARY KEY (id),
  CONSTRAINT personas_usuarias_organization_id_rut_key
    UNIQUE (organization_id, rut),
  CONSTRAINT personas_usuarias_organization_id_fkey
    FOREIGN KEY (organization_id) REFERENCES organizations (id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT personas_rut_formato
    CHECK (rut IS NULL OR rut REGEXP '^[0-9]{7,8}-[0-9K]$'),
  INDEX personas_usuarias_organization_id_apellido_paterno_idx
    (organization_id, apellido_paterno)
) COMMENT = 'Vecino atendido. RUT unico por organizacion (ADR-008)';

-- RF-016 a RF-021: el compromiso del tubo.
-- `estado` es VARCHAR y no ENUM a propósito: las columnas del kanban son
-- configurables por organización, y un enumerado obligaría a migrar la base
-- para agregar una columna.
CREATE TABLE tareas (
  id                     CHAR(36)     NOT NULL,
  organization_id        CHAR(36)     NOT NULL,
  unidad_territorial_id  CHAR(36)     NOT NULL,
  categoria_id           CHAR(36)     NOT NULL,
  titulo                 VARCHAR(200) NOT NULL,
  descripcion            TEXT             NULL,
  estado                 VARCHAR(40)  NOT NULL DEFAULT 'ingresado',
  fecha_compromiso       DATE             NULL,
  responsable_id         CHAR(36)         NULL,
  created_at             DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at             DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
                                      ON UPDATE CURRENT_TIMESTAMP(3),
  -- RF-017: origen de la solicitud. Externa = la pidió un vecino.
  interes_externo        TINYINT(1)   NOT NULL DEFAULT 1,
  fecha_solicitud        DATE             NULL,
  solicitante            VARCHAR(200)     NULL,
  persona_usuaria_id     CHAR(36)         NULL,
  territorio             VARCHAR(120)     NULL,
  area_apoyo             VARCHAR(120)     NULL,
  observaciones          TEXT             NULL,
  -- RF-019: se marca al cerrar fuera de la fecha comprometida.
  cerrada_fuera_plazo    TINYINT(1)   NOT NULL DEFAULT 0,
  fecha_cierre           DATE             NULL,
  -- RF-020: el cierre alimenta el indicador UNA sola vez.
  computada_en_meta      TINYINT(1)   NOT NULL DEFAULT 0,
  version                INT          NOT NULL DEFAULT 1,
  CONSTRAINT tareas_pkey PRIMARY KEY (id),
  CONSTRAINT tareas_organization_id_fkey
    FOREIGN KEY (organization_id) REFERENCES organizations (id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT tareas_unidad_territorial_id_fkey
    FOREIGN KEY (unidad_territorial_id) REFERENCES unidades_territoriales (id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  -- RESTRICT: no se borra una categoría que todavía clasifica compromisos.
  CONSTRAINT tareas_categoria_id_fkey
    FOREIGN KEY (categoria_id) REFERENCES categorias_gestion (id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT tareas_responsable_id_fkey
    FOREIGN KEY (responsable_id) REFERENCES users (id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT tareas_persona_usuaria_id_fkey
    FOREIGN KEY (persona_usuaria_id) REFERENCES personas_usuarias (id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  INDEX tareas_organization_id_unidad_territorial_id_estado_idx
    (organization_id, unidad_territorial_id, estado),
  INDEX tareas_organization_id_fecha_compromiso_idx
    (organization_id, fecha_compromiso)
) COMMENT = 'Compromiso del tubo de trabajo (agenda colectiva)';


-- =============================================================================
-- 4. CONFIGURACIÓN DE LA MEDICIÓN
-- =============================================================================

-- RF-005: el período se CONFIGURA con fechas y el sistema calcula sus días.
-- Está prohibido fijar 90 o 91 días en el código.
CREATE TABLE periodos (
  id               CHAR(36)     NOT NULL,
  organization_id  CHAR(36)     NOT NULL,
  nombre           VARCHAR(120) NOT NULL,
  fecha_inicio     DATE         NOT NULL,
  fecha_termino    DATE         NOT NULL,
  estado           ENUM('abierto', 'cerrado') NOT NULL DEFAULT 'abierto',
  cerrado_en       DATETIME(3)      NULL,
  -- ⚠ Sin clave foránea a `users`, igual que en el sistema real. Es el desvío
  --   D-d declarado en docs/siguiente-sesion.md §4.bis y en der.md §14. El
  --   script refleja el modelo que hay, no el que debería haber.
  cerrado_por_id   CHAR(36)         NULL,
  version          INT          NOT NULL DEFAULT 1,
  created_at       DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at       DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
                                ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT periodos_pkey PRIMARY KEY (id),
  CONSTRAINT periodos_organization_id_nombre_key UNIQUE (organization_id, nombre),
  CONSTRAINT periodos_organization_id_fkey
    FOREIGN KEY (organization_id) REFERENCES organizations (id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  -- RN-013: un período no puede terminar antes de empezar.
  CONSTRAINT periodo_fechas_coherentes CHECK (fecha_termino >= fecha_inicio),
  INDEX periodos_organization_id_estado_idx (organization_id, estado)
) COMMENT = 'Periodo de medicion. Sus dias se calculan, no se fijan';

-- RF-038 · RNF-015 · ADR-007: TODO valor de negocio configurable vive acá, con
-- vigencia por período. El tope de cumplimiento, los umbrales del semáforo, la
-- ventana de duplicidad y el tamaño máximo de evidencia salen de esta tabla.
-- `periodo_id` nulo = valor por defecto de la organización.
CREATE TABLE parametros (
  id               CHAR(36)      NOT NULL,
  organization_id  CHAR(36)      NOT NULL,
  periodo_id       CHAR(36)          NULL,
  clave            VARCHAR(80)   NOT NULL,
  valor            DECIMAL(12,4) NOT NULL,
  descripcion      VARCHAR(255)      NULL,
  -- Marca los valores que aún esperan confirmación oficial del docente.
  confirmado       TINYINT(1)    NOT NULL DEFAULT 0,
  version          INT           NOT NULL DEFAULT 1,
  created_at       DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at       DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
                                 ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT parametros_pkey PRIMARY KEY (id),
  -- ⚠ MySQL y PostgreSQL tratan los NULL como distintos entre sí, así que la
  --   unicidad de la fila por defecto (periodo_id NULL) NO la garantiza este
  --   índice: la exige la aplicación. Es el mismo comportamiento en los dos
  --   motores, de modo que la traducción no introduce una diferencia.
  CONSTRAINT parametros_organization_id_periodo_id_clave_key
    UNIQUE (organization_id, periodo_id, clave),
  CONSTRAINT parametros_organization_id_fkey
    FOREIGN KEY (organization_id) REFERENCES organizations (id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT parametros_periodo_id_fkey
    FOREIGN KEY (periodo_id) REFERENCES periodos (id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  INDEX parametros_organization_id_clave_idx (organization_id, clave)
) COMMENT = 'Valores de negocio configurables, con vigencia por periodo';

-- RF-003 · RN-002 · ADR-009: lo que efectivamente se mide.
-- `direccion` merece atención: "pendientes en tubo MENOR a 10%" es un ítem
-- inverso, donde superar la meta es malo. Sin esa columna el sistema premiaría
-- tener más pendientes.
CREATE TABLE items_medicion (
  id                   CHAR(36)     NOT NULL,
  organization_id      CHAR(36)     NOT NULL,
  cargo_id             CHAR(36)     NOT NULL,
  nombre               VARCHAR(200) NOT NULL,
  tipo                 ENUM('cantidad', 'porcentaje')       NOT NULL DEFAULT 'cantidad',
  direccion            ENUM('mayor_mejor', 'menor_mejor')   NOT NULL DEFAULT 'mayor_mejor',
  -- RF-020: los compromisos cerrados del tubo alimentan este ítem.
  alimentado_por_tubo  TINYINT(1)   NOT NULL DEFAULT 0,
  orden                INT          NOT NULL DEFAULT 0,
  activo               TINYINT(1)   NOT NULL DEFAULT 1,
  version              INT          NOT NULL DEFAULT 1,
  created_at           DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at           DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
                                    ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT items_medicion_pkey PRIMARY KEY (id),
  CONSTRAINT items_medicion_organization_id_fkey
    FOREIGN KEY (organization_id) REFERENCES organizations (id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  -- CASCADE: un ítem de medición no existe fuera de su cargo. Es composición.
  CONSTRAINT items_medicion_cargo_id_fkey
    FOREIGN KEY (cargo_id) REFERENCES cargos (id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  INDEX items_medicion_organization_id_cargo_id_activo_idx
    (organization_id, cargo_id, activo)
) COMMENT = 'Item medible de un cargo';

-- TABLA ASOCIATIVA TERNARIA: resuelve el N:M entre funcionario e ítem,
-- calificado por período, y lleva la meta y el ponderador.
-- RN-001: los ponderadores de un funcionario en un período deben sumar
-- exactamente 1,0000. Esa suma cruza filas, y ningún CHECK puede expresarla —
-- un CHECK solo ve la fila que se escribe. El CHECK cubre el rango 0..1; el
-- 100 % exacto lo exige la aplicación al guardar el conjunto.
CREATE TABLE metas_item (
  id               CHAR(36)      NOT NULL,
  organization_id  CHAR(36)      NOT NULL,
  periodo_id       CHAR(36)      NOT NULL,
  item_id          CHAR(36)      NOT NULL,
  funcionario_id   CHAR(36)      NOT NULL,
  meta_valor       DECIMAL(12,2) NOT NULL,
  ponderador       DECIMAL(5,4)  NOT NULL,
  version          INT           NOT NULL DEFAULT 1,
  created_at       DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at       DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
                                 ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT metas_item_pkey PRIMARY KEY (id),
  CONSTRAINT metas_item_periodo_id_item_id_funcionario_id_key
    UNIQUE (periodo_id, item_id, funcionario_id),
  CONSTRAINT metas_item_organization_id_fkey
    FOREIGN KEY (organization_id) REFERENCES organizations (id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT metas_item_periodo_id_fkey
    FOREIGN KEY (periodo_id) REFERENCES periodos (id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT metas_item_item_id_fkey
    FOREIGN KEY (item_id) REFERENCES items_medicion (id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT metas_item_funcionario_id_fkey
    FOREIGN KEY (funcionario_id) REFERENCES users (id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT meta_valor_positivo  CHECK (meta_valor > 0),
  CONSTRAINT ponderador_en_rango  CHECK (ponderador >= 0 AND ponderador <= 1),
  INDEX metas_item_organization_id_periodo_id_funcionario_id_idx
    (organization_id, periodo_id, funcionario_id)
) COMMENT = 'Meta y ponderador por funcionario, item y periodo (RF-007)';


-- =============================================================================
-- 5. REGISTRO PERSONAL, EVIDENCIA Y VALIDACIÓN
-- =============================================================================

-- RF-009: el registro diario del funcionario.
-- RF-011: `codigo` es único e INMUTABLE. El UNIQUE impide repetirlo; lo que
-- impide CAMBIARLO es el disparador del bloque 8.
-- ADR-006: no se edita ni se borra, se ANULA con motivo.
CREATE TABLE actividades (
  id                     CHAR(36)     NOT NULL,
  organization_id        CHAR(36)     NOT NULL,
  periodo_id             CHAR(36)     NOT NULL,
  unidad_territorial_id  CHAR(36)     NOT NULL,
  funcionario_id         CHAR(36)     NOT NULL,
  item_id                CHAR(36)         NULL,
  codigo                 VARCHAR(40)  NOT NULL,
  fecha                  DATE         NOT NULL,
  descripcion            TEXT         NOT NULL,
  accion                 TEXT             NULL,
  persona_usuaria_id     CHAR(36)         NULL,
  contacto_nombre        VARCHAR(160)     NULL,
  contacto_fono          VARCHAR(20)      NULL,
  ingreso_a_tubo         TINYINT(1)   NOT NULL DEFAULT 0,
  tarea_id               CHAR(36)         NULL,
  anulada                TINYINT(1)   NOT NULL DEFAULT 0,
  motivo_anulacion       VARCHAR(255)     NULL,
  version                INT          NOT NULL DEFAULT 1,
  created_at             DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at             DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
                                      ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT actividades_pkey PRIMARY KEY (id),
  CONSTRAINT actividades_organization_id_codigo_key UNIQUE (organization_id, codigo),
  CONSTRAINT actividades_organization_id_fkey
    FOREIGN KEY (organization_id) REFERENCES organizations (id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  -- RESTRICT: borrar un período con actividades registradas debe FALLAR, no
  -- arrastrarlas. Un período cerrado no se toca (RN-013).
  CONSTRAINT actividades_periodo_id_fkey
    FOREIGN KEY (periodo_id) REFERENCES periodos (id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT actividades_unidad_territorial_id_fkey
    FOREIGN KEY (unidad_territorial_id) REFERENCES unidades_territoriales (id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT actividades_funcionario_id_fkey
    FOREIGN KEY (funcionario_id) REFERENCES users (id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT actividades_item_id_fkey
    FOREIGN KEY (item_id) REFERENCES items_medicion (id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT actividades_persona_usuaria_id_fkey
    FOREIGN KEY (persona_usuaria_id) REFERENCES personas_usuarias (id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT actividades_tarea_id_fkey
    FOREIGN KEY (tarea_id) REFERENCES tareas (id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  INDEX actividades_organization_id_periodo_id_funcionario_id_idx
    (organization_id, periodo_id, funcionario_id),
  INDEX actividades_organization_id_item_id_idx   (organization_id, item_id),
  INDEX actividades_organization_id_fecha_idx     (organization_id, fecha)
) COMMENT = 'Registro diario del funcionario. codigo unico e inmutable';

-- RF-012 · RNF-017: la foto que respalda la actividad.
-- `subida_por_id` es RESTRICT, y no es decoración: es lo que impide borrar a
-- quien subió una evidencia y perder con ello la trazabilidad de quién
-- respondió por un dato. Un CASCADE acá borraría la prueba.
CREATE TABLE evidencias (
  id               CHAR(36)     NOT NULL,
  organization_id  CHAR(36)     NOT NULL,
  actividad_id     CHAR(36)     NOT NULL,
  archivo_nombre   VARCHAR(255) NOT NULL,
  archivo_ruta     VARCHAR(500) NOT NULL,
  mime_type        VARCHAR(120) NOT NULL,
  tamano_bytes     INT          NOT NULL,
  subida_por_id    CHAR(36)     NOT NULL,
  created_at       DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT evidencias_pkey PRIMARY KEY (id),
  CONSTRAINT evidencias_organization_id_fkey
    FOREIGN KEY (organization_id) REFERENCES organizations (id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  -- CASCADE: una evidencia no existe sin su actividad. Es composición.
  CONSTRAINT evidencias_actividad_id_fkey
    FOREIGN KEY (actividad_id) REFERENCES actividades (id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT evidencias_subida_por_id_fkey
    FOREIGN KEY (subida_por_id) REFERENCES users (id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  INDEX evidencias_organization_id_actividad_id_idx (organization_id, actividad_id)
) COMMENT = 'Archivo que respalda una actividad';

-- TABLA ASOCIATIVA: evidencias ↔ verificadores, con la decisión.
-- RF-013 · RN-009: SOLO `aprobada` otorga el punto que suma al avance.
-- No colapsa a 1:1 con la evidencia a propósito: una evidencia puede recibir
-- "correccion_solicitada" y después "aprobada". Guardar solo la última
-- decisión borraría el recorrido.
CREATE TABLE validaciones (
  id               CHAR(36)    NOT NULL,
  organization_id  CHAR(36)    NOT NULL,
  evidencia_id     CHAR(36)    NOT NULL,
  verificador_id   CHAR(36)    NOT NULL,
  decision         ENUM('pendiente', 'aprobada',
                        'rechazada', 'correccion_solicitada')
                               NOT NULL DEFAULT 'pendiente',
  observacion      TEXT            NULL,
  decidida_en      DATETIME(3)     NULL,
  created_at       DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT validaciones_pkey PRIMARY KEY (id),
  CONSTRAINT validaciones_organization_id_fkey
    FOREIGN KEY (organization_id) REFERENCES organizations (id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT validaciones_evidencia_id_fkey
    FOREIGN KEY (evidencia_id) REFERENCES evidencias (id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT validaciones_verificador_id_fkey
    FOREIGN KEY (verificador_id) REFERENCES users (id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  INDEX validaciones_organization_id_evidencia_id_idx (organization_id, evidencia_id),
  INDEX validaciones_organization_id_decision_idx     (organization_id, decision)
) COMMENT = 'Decision del verificador. Solo aprobada suma (RN-009)';

-- RF-015 · CA-04 · ADR-013: la atención social y sus tres gestiones.
-- ES LA ÚNICA RELACIÓN 1:1 DEL MODELO, y lo que la hace 1:1 es que
-- `actividad_id` sea UNIQUE, no la clave foránea.
-- Las tres gestiones viven en columnas y no en filas porque así están en la
-- planilla real que el cliente usa hoy: las tres fechas en la misma línea.
CREATE TABLE atenciones_sociales (
  id                      CHAR(36)     NOT NULL,
  organization_id         CHAR(36)     NOT NULL,
  actividad_id            CHAR(36)     NOT NULL,
  tipo_atencion           VARCHAR(120) NOT NULL,
  sub_atencion            VARCHAR(120)     NULL,
  requiere_visita         TINYINT(1)   NOT NULL DEFAULT 0,
  primera_gestion         VARCHAR(120)     NULL,
  fecha_programada_visita DATE             NULL,
  observacion             TEXT             NULL,
  segunda_gestion         VARCHAR(120)     NULL,
  fecha_visita            DATE             NULL,
  fecha_entrega_informe   DATE             NULL,
  tercera_gestion         VARCHAR(120)     NULL,
  fecha_entrega_beneficio DATE             NULL,
  version                 INT          NOT NULL DEFAULT 1,
  created_at              DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at              DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
                                       ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT atenciones_sociales_pkey PRIMARY KEY (id),
  CONSTRAINT atenciones_sociales_actividad_id_key UNIQUE (actividad_id),
  CONSTRAINT atenciones_sociales_organization_id_fkey
    FOREIGN KEY (organization_id) REFERENCES organizations (id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT atenciones_sociales_actividad_id_fkey
    FOREIGN KEY (actividad_id) REFERENCES actividades (id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  INDEX atenciones_sociales_organization_id_idx (organization_id)
) COMMENT = 'Caso social con sus tres gestiones. 1:1 con la actividad';


-- =============================================================================
-- 6. AUSENCIAS, AJUSTES Y CATÁLOGOS
-- =============================================================================

-- Días no trabajados que se descuentan del objetivo al día del funcionario.
CREATE TABLE ausencias (
  id               CHAR(36)    NOT NULL,
  organization_id  CHAR(36)    NOT NULL,
  periodo_id       CHAR(36)    NOT NULL,
  funcionario_id   CHAR(36)    NOT NULL,
  tipo             ENUM('licencia', 'vacaciones',
                        'compensatorio', 'emergencia') NOT NULL,
  fecha_desde      DATE        NOT NULL,
  fecha_hasta      DATE        NOT NULL,
  dias             INT         NOT NULL,
  observacion      TEXT            NULL,
  version          INT         NOT NULL DEFAULT 1,
  created_at       DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at       DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
                               ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT ausencias_pkey PRIMARY KEY (id),
  CONSTRAINT ausencias_organization_id_fkey
    FOREIGN KEY (organization_id) REFERENCES organizations (id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT ausencias_periodo_id_fkey
    FOREIGN KEY (periodo_id) REFERENCES periodos (id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT ausencias_funcionario_id_fkey
    FOREIGN KEY (funcionario_id) REFERENCES users (id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  INDEX ausencias_organization_id_periodo_id_funcionario_id_idx
    (organization_id, periodo_id, funcionario_id)
) COMMENT = 'Dias que se descuentan del objetivo al dia';

-- RF-025 · RN-011: felicitaciones y reclamos.
-- ⚠ TABLA SIN COMPORTAMIENTO: existe en el modelo, pero RF-025 no está
--   implementado. Va igual, con la misma marca de pendiente que en el DER.
--   Los VALORES del ajuste saldrán de `parametros`, nunca del código.
CREATE TABLE ajustes (
  id                CHAR(36)     NOT NULL,
  organization_id   CHAR(36)     NOT NULL,
  periodo_id        CHAR(36)     NOT NULL,
  funcionario_id    CHAR(36)     NOT NULL,
  tipo              VARCHAR(20)  NOT NULL,
  motivo            TEXT         NOT NULL,
  canal             VARCHAR(60)      NULL,
  persona_nombre    VARCHAR(160)     NULL,
  persona_contacto  VARCHAR(160)     NULL,
  sector            VARCHAR(120)     NULL,
  fecha             DATE         NOT NULL,
  registrado_por_id CHAR(36)     NOT NULL,
  version           INT          NOT NULL DEFAULT 1,
  created_at        DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at        DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
                                 ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT ajustes_pkey PRIMARY KEY (id),
  CONSTRAINT ajustes_organization_id_fkey
    FOREIGN KEY (organization_id) REFERENCES organizations (id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT ajustes_periodo_id_fkey
    FOREIGN KEY (periodo_id) REFERENCES periodos (id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT ajustes_funcionario_id_fkey
    FOREIGN KEY (funcionario_id) REFERENCES users (id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  -- RESTRICT: quien registró un ajuste no se puede borrar. Es el caso análogo
  -- a `periodos.cerrado_por_id`, que sí debería tener esta misma FK.
  CONSTRAINT ajustes_registrado_por_id_fkey
    FOREIGN KEY (registrado_por_id) REFERENCES users (id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  INDEX ajustes_organization_id_periodo_id_funcionario_id_idx
    (organization_id, periodo_id, funcionario_id)
) COMMENT = 'Felicitacion o reclamo. RF-025 sin implementar';

-- RF-004: catálogos configurables (tipos de atención, sub-atenciones, las tres
-- gestiones, territorios). Se desactivan con `vigente = 0` y NUNCA se borran:
-- una fila borrada dejaría sin nombre a los registros históricos que la usaron.
CREATE TABLE catalogo_items (
  id               CHAR(36)     NOT NULL,
  organization_id  CHAR(36)     NOT NULL,
  catalogo         VARCHAR(60)  NOT NULL,
  valor            VARCHAR(160) NOT NULL,
  area             VARCHAR(60)      NULL,
  orden            INT          NOT NULL DEFAULT 0,
  vigente          TINYINT(1)   NOT NULL DEFAULT 1,
  version          INT          NOT NULL DEFAULT 1,
  created_at       DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at       DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
                                ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT catalogo_items_pkey PRIMARY KEY (id),
  CONSTRAINT catalogo_items_organization_id_catalogo_valor_key
    UNIQUE (organization_id, catalogo, valor),
  CONSTRAINT catalogo_items_organization_id_fkey
    FOREIGN KEY (organization_id) REFERENCES organizations (id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  INDEX catalogo_items_organization_id_catalogo_vigente_idx
    (organization_id, catalogo, vigente)
) COMMENT = 'Catalogos configurables. Ningun valor de negocio en el codigo';


-- =============================================================================
-- 7. HISTORIAL, COMENTARIOS Y BITÁCORA
-- =============================================================================

-- RF-018: historial de transiciones del tubo.
-- ⚠ TABLA SIN ESCRITURA: existe y el seed la llena, pero la aplicación nunca
--   escribe en ella. Es el desvío declarado de RF-018.
CREATE TABLE tarea_historial (
  id               CHAR(36)    NOT NULL,
  organization_id  CHAR(36)    NOT NULL,
  tarea_id         CHAR(36)    NOT NULL,
  estado_anterior  VARCHAR(40)     NULL,
  estado_nuevo     VARCHAR(40) NOT NULL,
  autor_id         CHAR(36)    NOT NULL,
  observacion      TEXT            NULL,
  created_at       DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT tarea_historial_pkey PRIMARY KEY (id),
  CONSTRAINT tarea_historial_organization_id_fkey
    FOREIGN KEY (organization_id) REFERENCES organizations (id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT tarea_historial_tarea_id_fkey
    FOREIGN KEY (tarea_id) REFERENCES tareas (id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT tarea_historial_autor_id_fkey
    FOREIGN KEY (autor_id) REFERENCES users (id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  INDEX tarea_historial_organization_id_tarea_id_idx (organization_id, tarea_id)
) COMMENT = 'Historial de transiciones del tubo. Sin escritura (RF-018)';

-- RF-035: observaciones asociadas a un registro. Petición literal del cliente:
-- "no me manden WhatsApp, colóquenme un comentario en la celda".
-- ⚠ `entidad_id` NO PUEDE SER CLAVE FORÁNEA: el vínculo es polimórfico y
--   apunta a `tareas`, `actividades` o `metas_item` según `entidad`. Ninguna
--   base relacional declara una FK hacia varias tablas, así que la integridad
--   la sostiene la aplicación. Se deja así y se explica, en vez de simularla.
-- ⚠ TABLA SIN COMPORTAMIENTO: RF-035 no está implementado.
CREATE TABLE comentarios (
  id               CHAR(36)    NOT NULL,
  organization_id  CHAR(36)    NOT NULL,
  entidad          VARCHAR(40) NOT NULL,
  entidad_id       CHAR(36)    NOT NULL,
  autor_id         CHAR(36)    NOT NULL,
  texto            TEXT        NOT NULL,
  created_at       DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT comentarios_pkey PRIMARY KEY (id),
  CONSTRAINT comentarios_organization_id_fkey
    FOREIGN KEY (organization_id) REFERENCES organizations (id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT comentarios_autor_id_fkey
    FOREIGN KEY (autor_id) REFERENCES users (id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  INDEX comentarios_organization_id_entidad_entidad_id_idx
    (organization_id, entidad, entidad_id)
) COMMENT = 'Comentario con vinculo polimorfico. RF-035 sin implementar';

-- RNF-008 · RF-036 · ADR-006: bitácora de SOLO INSERCIÓN.
-- ⚠ `usuario_id` NO TIENE CLAVE FORÁNEA, y es deliberado: la bitácora debe
--   sobrevivir al borrado del usuario. Un CASCADE borraría la prueba junto con
--   el responsable, y un RESTRICT impediría dar de baja a nadie.
-- Registra también la acción `consultar`, porque las Leyes 19.628 / 21.719 y
-- la Ley 21.663 exigen trazabilidad del ACCESO a datos personales, no solo de
-- su modificación (ADR-012).
CREATE TABLE auditoria (
  id               CHAR(36)    NOT NULL,
  organization_id  CHAR(36)    NOT NULL,
  usuario_id       CHAR(36)        NULL,
  accion           ENUM('crear', 'actualizar', 'eliminar', 'validar',
                        'cambiar_estado', 'cerrar_periodo',
                        'reabrir_periodo', 'consultar') NOT NULL,
  entidad          VARCHAR(60) NOT NULL,
  entidad_id       CHAR(36)    NOT NULL,
  valor_anterior   JSON            NULL,
  valor_nuevo      JSON            NULL,
  ip               VARCHAR(45)     NULL,
  origen           VARCHAR(160)    NULL,
  created_at       DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT auditoria_pkey PRIMARY KEY (id),
  CONSTRAINT auditoria_organization_id_fkey
    FOREIGN KEY (organization_id) REFERENCES organizations (id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  INDEX auditoria_organization_id_entidad_entidad_id_idx
    (organization_id, entidad, entidad_id),
  INDEX auditoria_organization_id_created_at_idx (organization_id, created_at)
) COMMENT = 'Bitacora de solo insercion (RNF-008)';


-- =============================================================================
-- 8. DISPARADORES
--
-- Dos invariantes que NO se pueden confiar a la aplicación. Una regla que solo
-- vive en el código se salta con un script; estas viven en la base.
-- `SIGNAL SQLSTATE '45000'` es el equivalente MySQL del `RAISE EXCEPTION` de
-- PostgreSQL: aborta la sentencia con un error definido por el usuario.
-- =============================================================================

DELIMITER $$

-- RNF-008 · ADR-006: la bitácora es de SOLO INSERCIÓN. Una bitácora que la
-- propia aplicación puede modificar no es una bitácora. En PostgreSQL esto se
-- resuelve con dos disparadores equivalentes sobre la misma tabla.
CREATE TRIGGER auditoria_sin_update
BEFORE UPDATE ON auditoria
FOR EACH ROW
BEGIN
  SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'La auditoria es de solo insercion (RNF-008): no se permite UPDATE';
END$$

CREATE TRIGGER auditoria_sin_delete
BEFORE DELETE ON auditoria
FOR EACH ROW
BEGIN
  SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'La auditoria es de solo insercion (RNF-008): no se permite DELETE';
END$$

-- RF-011 · ADR-004: el código de evidencia es INMUTABLE una vez creado.
-- El UNIQUE de la tabla impide REPETIRLO; no impide CAMBIARLO, que es lo que
-- la norma exige. Por eso hace falta el disparador además del índice.
CREATE TRIGGER actividad_codigo_no_cambia
BEFORE UPDATE ON actividades
FOR EACH ROW
BEGIN
  IF NOT (NEW.codigo <=> OLD.codigo) THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'El codigo de evidencia es inmutable (RF-011)';
  END IF;
END$$

DELIMITER ;


-- =============================================================================
-- 9. DATOS DE PRUEBA — TODOS FICTICIOS
--
-- Una organización con tres delegaciones, seis personas (una por rol), un
-- período abierto con sus parámetros, dos cargos con sus ítems, metas que
-- suman 100 %, un vecino, un compromiso del tubo y una actividad con su
-- evidencia aprobada y su caso social.
--
-- Es el mínimo que recorre las 22 tablas y las 52 claves foráneas: si el
-- script tuviera un error de integridad referencial, este bloque falla.
--
-- Los identificadores son UUID con forma legible (…-0001, …-0002) para que se
-- puedan seguir a ojo. En el sistema real los genera la aplicación.
-- =============================================================================

-- 9.1 La organización y las personas ------------------------------------------
INSERT INTO organizations (id, nombre, tipo, configuracion_terminologia) VALUES
  ('a0000000-0000-4000-8000-000000000001', 'Municipalidad de Ejemplo', 'municipio',
   JSON_OBJECT('unidad', 'delegacion', 'autoridad', 'alcaldia'));

-- Contraseña de ejemplo, sin valor real: el hash no corresponde a ninguna clave
-- en uso. Los RUT son ficticios y su dígito verificador es válido (modulo 11).
INSERT INTO users (id, email, password_hash, nombre, nombres, apellido_paterno, apellido_materno, rut) VALUES
  ('b0000000-0000-4000-8000-000000000001', 'admin@ejemplo.demo',        '$2b$10$hashDeEjemploNoEsUnaClaveReal000000000000000000', 'Ana Lagos Pinto',       'Ana',      'Lagos',   'Pinto',    '15987456-7'),
  ('b0000000-0000-4000-8000-000000000002', 'coordinador@ejemplo.demo',  '$2b$10$hashDeEjemploNoEsUnaClaveReal000000000000000000', 'Bruno Reyes Soto',      'Bruno',    'Reyes',   'Soto',     '13579246-2'),
  ('b0000000-0000-4000-8000-000000000003', 'delegado@ejemplo.demo',     '$2b$10$hashDeEjemploNoEsUnaClaveReal000000000000000000', 'Carla Muñoz Vera',      'Carla',    'Muñoz',   'Vera',     '18456123-9'),
  ('b0000000-0000-4000-8000-000000000004', 'funcionario@ejemplo.demo',  '$2b$10$hashDeEjemploNoEsUnaClaveReal000000000000000000', 'Diego Salas Rojas',     'Diego',    'Salas',   'Rojas',    '16234789-6'),
  ('b0000000-0000-4000-8000-000000000005', 'verificador@ejemplo.demo',  '$2b$10$hashDeEjemploNoEsUnaClaveReal000000000000000000', 'Elena Fuentes Díaz',    'Elena',    'Fuentes', 'Díaz',     '14785236-3'),
  ('b0000000-0000-4000-8000-000000000006', 'consulta@ejemplo.demo',     '$2b$10$hashDeEjemploNoEsUnaClaveReal000000000000000000', 'Felipe Ortega Bravo',   'Felipe',   'Ortega',  'Bravo',    '19632587-5');

-- 9.2 Delegaciones y cargos ---------------------------------------------------
INSERT INTO unidades_territoriales (id, organization_id, nombre, responsable_id) VALUES
  ('c0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Delegación Centro',    'b0000000-0000-4000-8000-000000000003'),
  ('c0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 'Delegación Norte',     NULL),
  -- Delegación sin nadie con metas: se informa como SIN MEDICIÓN, no como 0 %.
  ('c0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001', 'Delegación La Pampa',  NULL);

INSERT INTO cargos (id, organization_id, nombre, area) VALUES
  ('d0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Gestor Social 1',  'SOCIAL'),
  ('d0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 'Territorial 1',    'T OO CC');

-- El rol vive acá, no en `users`. unidad_territorial_id NULL = nivel central.
INSERT INTO organization_members (id, organization_id, user_id, rol, unidad_territorial_id, cargo, cargo_id) VALUES
  ('e0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'admin',       NULL,                                   'Administradora del sistema', NULL),
  ('e0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000002', 'supervisor',  NULL,                                   'Coordinador',                NULL),
  ('e0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000003', 'gerente',     'c0000000-0000-4000-8000-000000000001', 'Delegada',                   NULL),
  ('e0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000004', 'usuario',     'c0000000-0000-4000-8000-000000000001', 'Gestor Social 1',            'd0000000-0000-4000-8000-000000000001'),
  ('e0000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000005', 'verificador', NULL,                                   'Verificadora',               NULL),
  ('e0000000-0000-4000-8000-000000000006', 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000006', 'consulta',    NULL,                                   'Consulta',                   NULL);

-- 9.3 Período y parámetros ----------------------------------------------------
INSERT INTO periodos (id, organization_id, nombre, fecha_inicio, fecha_termino, estado) VALUES
  ('f0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001',
   '3er trimestre 2026', '2026-07-01', '2026-09-30', 'abierto');

-- Ningún valor de negocio vive en el código: tope, umbrales y ventanas salen
-- de acá. `confirmado = 0` marca lo que aún espera definición oficial.
INSERT INTO parametros (id, organization_id, periodo_id, clave, valor, descripcion, confirmado) VALUES
  ('f1000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', NULL, 'tope_cumplimiento_item',  150.0000, 'Tope de cumplimiento por item, en porcentaje', 1),
  ('f1000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', NULL, 'semaforo_verde',          100.0000, 'Verde: alcanza el objetivo al dia',            1),
  ('f1000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001', NULL, 'semaforo_naranjo',         60.0000, 'Naranjo: sobre el 60 % del objetivo al dia',    1),
  ('f1000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000001', NULL, 'umbral_minimo_colectivo',  60.0000, 'Minimo esperado de la delegacion',              0),
  ('f1000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-000000000001', 'ventana_duplicidad_dias', 90.0000, 'Ventana para avisar posible atencion duplicada', 0);

-- 9.4 Ítems medibles y metas --------------------------------------------------
INSERT INTO items_medicion (id, organization_id, cargo_id, nombre, tipo, direccion, alimentado_por_tubo, orden) VALUES
  ('a1000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 'Atención de usuario, teléfono y presencial', 'cantidad',   'mayor_mejor', 0, 1),
  ('a1000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 'Visitas domiciliarias realizadas',           'cantidad',   'mayor_mejor', 0, 2),
  -- Ítem INVERSO: superar la meta es malo. Sin `direccion` el sistema
  -- premiaría tener más pendientes.
  ('a1000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000002', 'Pendientes en el tubo',                      'porcentaje', 'menor_mejor', 1, 1);

-- RN-001: los ponderadores de un funcionario en un período suman 1,0000.
INSERT INTO metas_item (id, organization_id, periodo_id, item_id, funcionario_id, meta_valor, ponderador) VALUES
  ('a2000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000004', 240.00, 0.7000),
  ('a2000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000004',  30.00, 0.3000);

-- 9.5 Catálogos ---------------------------------------------------------------
INSERT INTO catalogo_items (id, organization_id, catalogo, valor, area, orden) VALUES
  ('a3000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'tipo_atencion', 'Ayuda social',            'SOCIAL',  1),
  ('a3000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 'sub_atencion',  'Set de aseo',             'SOCIAL',  1),
  ('a3000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001', 'gestion_1',     'Ingreso de solicitud',     NULL,     1),
  ('a3000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000001', 'gestion_2',     'Visita domiciliaria',      NULL,     2),
  ('a3000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000001', 'gestion_3',     'Entrega del beneficio',    NULL,     3),
  ('a3000000-0000-4000-8000-000000000006', 'a0000000-0000-4000-8000-000000000001', 'territorio',    'Sector Poniente',          NULL,     1);

-- 9.6 El vecino y el compromiso del tubo --------------------------------------
INSERT INTO personas_usuarias (id, organization_id, rut, nombres, apellido_paterno, apellido_materno, telefono, direccion, sector) VALUES
  ('a4000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', '20145877-3',
   'Gabriela', 'Torres', 'Núñez', '+56912345678', 'Pasaje Ejemplo 123', 'Sector Poniente');

INSERT INTO categorias_gestion (id, organization_id, nombre, orden_prioridad) VALUES
  ('a5000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Asistencia social', 1),
  ('a5000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 'Obras y espacios públicos', 2);

INSERT INTO tareas (id, organization_id, unidad_territorial_id, categoria_id, titulo, descripcion,
                    estado, fecha_compromiso, responsable_id, interes_externo, fecha_solicitud,
                    solicitante, persona_usuaria_id, territorio, area_apoyo) VALUES
  ('a6000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001',
   'c0000000-0000-4000-8000-000000000001', 'a5000000-0000-4000-8000-000000000001',
   'Solicitud de set de aseo', 'La vecina solicita ayuda social por situación transitoria.',
   'en_proceso', '2026-09-20', 'b0000000-0000-4000-8000-000000000004', 1, '2026-09-01',
   'Gabriela Torres Núñez', 'a4000000-0000-4000-8000-000000000001', 'Sector Poniente', 'SOCIAL');

-- La tabla existe y se puede poblar, pero la aplicación nunca escribe acá:
-- es el desvío declarado de RF-018.
INSERT INTO tarea_historial (id, organization_id, tarea_id, estado_anterior, estado_nuevo, autor_id, observacion) VALUES
  ('a7000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'a6000000-0000-4000-8000-000000000001', NULL,          'ingresado',  'b0000000-0000-4000-8000-000000000004', 'Alta del compromiso'),
  ('a7000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 'a6000000-0000-4000-8000-000000000001', 'ingresado',   'en_proceso', 'b0000000-0000-4000-8000-000000000004', 'Se agenda la visita');

-- 9.7 La actividad, su evidencia y su validación ------------------------------
-- El código sigue el formato AREA-AAAAMMDD-NNNN (RF-011, ADR-004).
INSERT INTO actividades (id, organization_id, periodo_id, unidad_territorial_id, funcionario_id,
                         item_id, codigo, fecha, descripcion, accion, persona_usuaria_id,
                         contacto_nombre, contacto_fono, ingreso_a_tubo, tarea_id) VALUES
  ('a8000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001',
   'f0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001',
   'b0000000-0000-4000-8000-000000000004', 'a1000000-0000-4000-8000-000000000001',
   'SOC-20260901-0001', '2026-09-01',
   'Atención presencial: solicitud de ayuda social.',
   'Se registra la solicitud y se deriva al tubo de trabajo.',
   'a4000000-0000-4000-8000-000000000001', 'Gabriela Torres Núñez', '+56912345678', 1,
   'a6000000-0000-4000-8000-000000000001');

INSERT INTO evidencias (id, organization_id, actividad_id, archivo_nombre, archivo_ruta, mime_type, tamano_bytes, subida_por_id) VALUES
  ('a9000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001',
   'a8000000-0000-4000-8000-000000000001', 'SOC-20260901-0001-01.jpg',
   'evidencias/2026/09/SOC-20260901-0001-01.jpg', 'image/jpeg', 184320,
   'b0000000-0000-4000-8000-000000000004');

-- RNF-005: nadie valida lo propio. Quien decide (Elena) no es quien subió
-- la evidencia (Diego). RN-009: solo `aprobada` suma al avance.
INSERT INTO validaciones (id, organization_id, evidencia_id, verificador_id, decision, observacion, decidida_en) VALUES
  ('aa000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001',
   'a9000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000005',
   'aprobada', 'Respaldo legible y coherente con la descripción.', '2026-09-02 10:15:00.000');

-- 9.8 El caso social y sus tres gestiones -------------------------------------
INSERT INTO atenciones_sociales (id, organization_id, actividad_id, tipo_atencion, sub_atencion,
                                 requiere_visita, primera_gestion, fecha_programada_visita,
                                 segunda_gestion, fecha_visita, fecha_entrega_informe,
                                 tercera_gestion, fecha_entrega_beneficio, observacion) VALUES
  ('ab000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001',
   'a8000000-0000-4000-8000-000000000001', 'Ayuda social', 'Set de aseo', 1,
   'Ingreso de solicitud',  '2026-09-05',
   'Visita domiciliaria',   '2026-09-05', '2026-09-08',
   NULL, NULL,
   'Caso en la segunda gestión: falta la entrega del beneficio.');

-- 9.9 Ausencia y ajuste -------------------------------------------------------
INSERT INTO ausencias (id, organization_id, periodo_id, funcionario_id, tipo, fecha_desde, fecha_hasta, dias, observacion) VALUES
  ('ac000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001',
   'f0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000004',
   'licencia', '2026-08-10', '2026-08-14', 5, 'Licencia médica. Descuenta del objetivo al día.');

INSERT INTO ajustes (id, organization_id, periodo_id, funcionario_id, tipo, motivo, canal,
                     persona_nombre, sector, fecha, registrado_por_id) VALUES
  ('ad000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001',
   'f0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000004',
   'felicitacion', 'Felicitación por la gestión del caso social.', 'correo',
   'Gabriela Torres Núñez', 'Sector Poniente', '2026-09-09',
   'b0000000-0000-4000-8000-000000000002');

-- 9.10 Comentario y bitácora --------------------------------------------------
-- `entidad` + `entidad_id` es el vínculo polimórfico: acá apunta a una tarea.
INSERT INTO comentarios (id, organization_id, entidad, entidad_id, autor_id, texto) VALUES
  ('ae000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001',
   'tarea', 'a6000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000003',
   '¿Se alcanza a entregar antes del cierre del período?');

-- La acción `consultar` no registra un cambio: registra un ACCESO a datos
-- personales identificados (ADR-012, Leyes 19.628 / 21.719 y Ley 21.663).
INSERT INTO auditoria (id, organization_id, usuario_id, accion, entidad, entidad_id, valor_anterior, valor_nuevo, ip, origen) VALUES
  ('af000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001',
   'b0000000-0000-4000-8000-000000000004', 'crear', 'actividades',
   'a8000000-0000-4000-8000-000000000001', NULL,
   JSON_OBJECT('codigo', 'SOC-20260901-0001'), '192.0.2.10', 'POST /actividades'),
  ('af000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001',
   'b0000000-0000-4000-8000-000000000005', 'validar', 'validaciones',
   'aa000000-0000-4000-8000-000000000001',
   JSON_OBJECT('decision', 'pendiente'), JSON_OBJECT('decision', 'aprobada'),
   '192.0.2.11', 'POST /evidencias/:id/validacion'),
  ('af000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001',
   'b0000000-0000-4000-8000-000000000003', 'consultar', 'personas_usuarias',
   'a4000000-0000-4000-8000-000000000001', NULL, NULL,
   '192.0.2.12', 'GET /vecinos/:id');


-- =============================================================================
-- 10. COMPROBACIÓN
--
-- Tres consultas que dejan a la vista que el modelo quedó bien armado. No
-- forman parte del esquema: se pueden borrar sin consecuencias.
-- =============================================================================

-- 10.1 Las 22 tablas creadas, con sus filas de prueba.
SELECT TABLE_NAME AS tabla, TABLE_ROWS AS filas_aprox
  FROM information_schema.TABLES
 WHERE TABLE_SCHEMA = 'sgr' AND TABLE_TYPE = 'BASE TABLE'
 ORDER BY TABLE_NAME;

-- 10.2 Las 52 claves foráneas, con su comportamiento de borrado.
SELECT rc.TABLE_NAME       AS tabla,
       kcu.COLUMN_NAME     AS columna,
       rc.REFERENCED_TABLE_NAME AS referencia,
       rc.DELETE_RULE      AS al_borrar
  FROM information_schema.REFERENTIAL_CONSTRAINTS rc
  JOIN information_schema.KEY_COLUMN_USAGE kcu
    ON kcu.CONSTRAINT_SCHEMA = rc.CONSTRAINT_SCHEMA
   AND kcu.CONSTRAINT_NAME   = rc.CONSTRAINT_NAME
 WHERE rc.CONSTRAINT_SCHEMA = 'sgr'
 ORDER BY rc.TABLE_NAME, kcu.COLUMN_NAME;

-- 10.3 El avance del funcionario: solo la evidencia APROBADA suma (RN-009).
SELECT u.nombre                                   AS funcionario,
       i.nombre                                   AS item,
       m.meta_valor                               AS meta,
       m.ponderador                               AS ponderador,
       COUNT(DISTINCT CASE WHEN v.decision = 'aprobada'
                           THEN a.id END)         AS avance_validado
  FROM metas_item   m
  JOIN users        u ON u.id = m.funcionario_id
  JOIN items_medicion i ON i.id = m.item_id
  LEFT JOIN actividades a
    ON a.item_id = m.item_id
   AND a.funcionario_id = m.funcionario_id
   AND a.periodo_id = m.periodo_id
   AND a.anulada = 0
  LEFT JOIN evidencias  e ON e.actividad_id = a.id
  LEFT JOIN validaciones v ON v.evidencia_id = e.id
 GROUP BY u.nombre, i.nombre, m.meta_valor, m.ponderador
 ORDER BY u.nombre, i.nombre;
