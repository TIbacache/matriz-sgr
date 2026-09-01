-- CreateEnum
CREATE TYPE "EstadoPeriodo" AS ENUM ('abierto', 'cerrado');

-- CreateEnum
CREATE TYPE "TipoItem" AS ENUM ('cantidad', 'porcentaje');

-- CreateEnum
CREATE TYPE "DireccionItem" AS ENUM ('mayor_mejor', 'menor_mejor');

-- CreateEnum
CREATE TYPE "DecisionValidacion" AS ENUM ('pendiente', 'aprobada', 'rechazada', 'correccion_solicitada');

-- CreateEnum
CREATE TYPE "TipoAusencia" AS ENUM ('licencia', 'vacaciones', 'compensatorio', 'emergencia');

-- CreateEnum
CREATE TYPE "AccionAuditoria" AS ENUM ('crear', 'actualizar', 'eliminar', 'validar', 'cambiar_estado', 'cerrar_periodo', 'reabrir_periodo');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "Rol" ADD VALUE 'verificador';
ALTER TYPE "Rol" ADD VALUE 'consulta';

-- AlterTable
ALTER TABLE "organization_members" ADD COLUMN     "cargo_id" TEXT;

-- AlterTable
ALTER TABLE "tareas" ADD COLUMN     "area_apoyo" TEXT,
ADD COLUMN     "cerrada_fuera_plazo" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "computada_en_meta" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "fecha_cierre" DATE,
ADD COLUMN     "fecha_solicitud" DATE,
ADD COLUMN     "interes_externo" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "observaciones" TEXT,
ADD COLUMN     "persona_usuaria_id" TEXT,
ADD COLUMN     "solicitante" TEXT,
ADD COLUMN     "territorio" TEXT,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1,
ALTER COLUMN "estado" SET DEFAULT 'ingresado';

-- AlterTable
ALTER TABLE "unidades_territoriales" ADD COLUMN     "activo" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "activo" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "apellido_materno" TEXT,
ADD COLUMN     "apellido_paterno" TEXT,
ADD COLUMN     "nombres" TEXT,
ADD COLUMN     "rut" TEXT,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "periodos" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "fecha_inicio" DATE NOT NULL,
    "fecha_termino" DATE NOT NULL,
    "estado" "EstadoPeriodo" NOT NULL DEFAULT 'abierto',
    "cerrado_en" TIMESTAMP(3),
    "cerrado_por_id" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "periodos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parametros" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "periodo_id" TEXT,
    "clave" TEXT NOT NULL,
    "valor" DECIMAL(12,4) NOT NULL,
    "descripcion" TEXT,
    "confirmado" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "parametros_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cargos" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "area" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cargos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "items_medicion" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "cargo_id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo" "TipoItem" NOT NULL DEFAULT 'cantidad',
    "direccion" "DireccionItem" NOT NULL DEFAULT 'mayor_mejor',
    "alimentado_por_tubo" BOOLEAN NOT NULL DEFAULT false,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "items_medicion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "metas_item" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "periodo_id" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,
    "funcionario_id" TEXT NOT NULL,
    "meta_valor" DECIMAL(12,2) NOT NULL,
    "ponderador" DECIMAL(5,4) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "metas_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "personas_usuarias" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "rut" TEXT,
    "nombres" TEXT NOT NULL,
    "apellido_paterno" TEXT NOT NULL,
    "apellido_materno" TEXT,
    "telefono" TEXT,
    "direccion" TEXT,
    "sector" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "personas_usuarias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "actividades" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "periodo_id" TEXT NOT NULL,
    "unidad_territorial_id" TEXT NOT NULL,
    "funcionario_id" TEXT NOT NULL,
    "item_id" TEXT,
    "codigo" TEXT NOT NULL,
    "fecha" DATE NOT NULL,
    "descripcion" TEXT NOT NULL,
    "accion" TEXT,
    "persona_usuaria_id" TEXT,
    "contacto_nombre" TEXT,
    "contacto_fono" TEXT,
    "ingreso_a_tubo" BOOLEAN NOT NULL DEFAULT false,
    "tarea_id" TEXT,
    "anulada" BOOLEAN NOT NULL DEFAULT false,
    "motivo_anulacion" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "actividades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evidencias" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "actividad_id" TEXT NOT NULL,
    "archivo_nombre" TEXT NOT NULL,
    "archivo_ruta" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "tamano_bytes" INTEGER NOT NULL,
    "subida_por_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evidencias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "validaciones" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "evidencia_id" TEXT NOT NULL,
    "verificador_id" TEXT NOT NULL,
    "decision" "DecisionValidacion" NOT NULL DEFAULT 'pendiente',
    "observacion" TEXT,
    "decidida_en" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "validaciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "atenciones_sociales" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "actividad_id" TEXT NOT NULL,
    "tipo_atencion" TEXT NOT NULL,
    "sub_atencion" TEXT,
    "requiere_visita" BOOLEAN NOT NULL DEFAULT false,
    "primera_gestion" TEXT,
    "fecha_programada_visita" DATE,
    "observacion" TEXT,
    "segunda_gestion" TEXT,
    "fecha_visita" DATE,
    "fecha_entrega_informe" DATE,
    "tercera_gestion" TEXT,
    "fecha_entrega_beneficio" DATE,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "atenciones_sociales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ausencias" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "periodo_id" TEXT NOT NULL,
    "funcionario_id" TEXT NOT NULL,
    "tipo" "TipoAusencia" NOT NULL,
    "fecha_desde" DATE NOT NULL,
    "fecha_hasta" DATE NOT NULL,
    "dias" INTEGER NOT NULL,
    "observacion" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ausencias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ajustes" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "periodo_id" TEXT NOT NULL,
    "funcionario_id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "motivo" TEXT NOT NULL,
    "canal" TEXT,
    "persona_nombre" TEXT,
    "persona_contacto" TEXT,
    "sector" TEXT,
    "fecha" DATE NOT NULL,
    "registrado_por_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ajustes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalogo_items" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "catalogo" TEXT NOT NULL,
    "valor" TEXT NOT NULL,
    "area" TEXT,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "vigente" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "catalogo_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tarea_historial" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "tarea_id" TEXT NOT NULL,
    "estado_anterior" TEXT,
    "estado_nuevo" TEXT NOT NULL,
    "autor_id" TEXT NOT NULL,
    "observacion" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tarea_historial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comentarios" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "entidad" TEXT NOT NULL,
    "entidad_id" TEXT NOT NULL,
    "autor_id" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comentarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auditoria" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "usuario_id" TEXT,
    "accion" "AccionAuditoria" NOT NULL,
    "entidad" TEXT NOT NULL,
    "entidad_id" TEXT NOT NULL,
    "valor_anterior" JSONB,
    "valor_nuevo" JSONB,
    "ip" TEXT,
    "origen" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auditoria_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "periodos_organization_id_estado_idx" ON "periodos"("organization_id", "estado");

-- CreateIndex
CREATE UNIQUE INDEX "periodos_organization_id_nombre_key" ON "periodos"("organization_id", "nombre");

-- CreateIndex
CREATE INDEX "parametros_organization_id_clave_idx" ON "parametros"("organization_id", "clave");

-- CreateIndex
CREATE UNIQUE INDEX "parametros_organization_id_periodo_id_clave_key" ON "parametros"("organization_id", "periodo_id", "clave");

-- CreateIndex
CREATE INDEX "cargos_organization_id_activo_idx" ON "cargos"("organization_id", "activo");

-- CreateIndex
CREATE UNIQUE INDEX "cargos_organization_id_nombre_key" ON "cargos"("organization_id", "nombre");

-- CreateIndex
CREATE INDEX "items_medicion_organization_id_cargo_id_activo_idx" ON "items_medicion"("organization_id", "cargo_id", "activo");

-- CreateIndex
CREATE INDEX "metas_item_organization_id_periodo_id_funcionario_id_idx" ON "metas_item"("organization_id", "periodo_id", "funcionario_id");

-- CreateIndex
CREATE UNIQUE INDEX "metas_item_periodo_id_item_id_funcionario_id_key" ON "metas_item"("periodo_id", "item_id", "funcionario_id");

-- CreateIndex
CREATE INDEX "personas_usuarias_organization_id_apellido_paterno_idx" ON "personas_usuarias"("organization_id", "apellido_paterno");

-- CreateIndex
CREATE UNIQUE INDEX "personas_usuarias_organization_id_rut_key" ON "personas_usuarias"("organization_id", "rut");

-- CreateIndex
CREATE INDEX "actividades_organization_id_periodo_id_funcionario_id_idx" ON "actividades"("organization_id", "periodo_id", "funcionario_id");

-- CreateIndex
CREATE INDEX "actividades_organization_id_item_id_idx" ON "actividades"("organization_id", "item_id");

-- CreateIndex
CREATE INDEX "actividades_organization_id_fecha_idx" ON "actividades"("organization_id", "fecha");

-- CreateIndex
CREATE UNIQUE INDEX "actividades_organization_id_codigo_key" ON "actividades"("organization_id", "codigo");

-- CreateIndex
CREATE INDEX "evidencias_organization_id_actividad_id_idx" ON "evidencias"("organization_id", "actividad_id");

-- CreateIndex
CREATE INDEX "validaciones_organization_id_evidencia_id_idx" ON "validaciones"("organization_id", "evidencia_id");

-- CreateIndex
CREATE INDEX "validaciones_organization_id_decision_idx" ON "validaciones"("organization_id", "decision");

-- CreateIndex
CREATE UNIQUE INDEX "atenciones_sociales_actividad_id_key" ON "atenciones_sociales"("actividad_id");

-- CreateIndex
CREATE INDEX "atenciones_sociales_organization_id_idx" ON "atenciones_sociales"("organization_id");

-- CreateIndex
CREATE INDEX "ausencias_organization_id_periodo_id_funcionario_id_idx" ON "ausencias"("organization_id", "periodo_id", "funcionario_id");

-- CreateIndex
CREATE INDEX "ajustes_organization_id_periodo_id_funcionario_id_idx" ON "ajustes"("organization_id", "periodo_id", "funcionario_id");

-- CreateIndex
CREATE INDEX "catalogo_items_organization_id_catalogo_vigente_idx" ON "catalogo_items"("organization_id", "catalogo", "vigente");

-- CreateIndex
CREATE UNIQUE INDEX "catalogo_items_organization_id_catalogo_valor_key" ON "catalogo_items"("organization_id", "catalogo", "valor");

-- CreateIndex
CREATE INDEX "tarea_historial_organization_id_tarea_id_idx" ON "tarea_historial"("organization_id", "tarea_id");

-- CreateIndex
CREATE INDEX "comentarios_organization_id_entidad_entidad_id_idx" ON "comentarios"("organization_id", "entidad", "entidad_id");

-- CreateIndex
CREATE INDEX "auditoria_organization_id_entidad_entidad_id_idx" ON "auditoria"("organization_id", "entidad", "entidad_id");

-- CreateIndex
CREATE INDEX "auditoria_organization_id_created_at_idx" ON "auditoria"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX "tareas_organization_id_fecha_compromiso_idx" ON "tareas"("organization_id", "fecha_compromiso");

-- CreateIndex
CREATE UNIQUE INDEX "users_rut_key" ON "users"("rut");

-- AddForeignKey
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_cargo_id_fkey" FOREIGN KEY ("cargo_id") REFERENCES "cargos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tareas" ADD CONSTRAINT "tareas_persona_usuaria_id_fkey" FOREIGN KEY ("persona_usuaria_id") REFERENCES "personas_usuarias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "periodos" ADD CONSTRAINT "periodos_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parametros" ADD CONSTRAINT "parametros_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parametros" ADD CONSTRAINT "parametros_periodo_id_fkey" FOREIGN KEY ("periodo_id") REFERENCES "periodos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cargos" ADD CONSTRAINT "cargos_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "items_medicion" ADD CONSTRAINT "items_medicion_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "items_medicion" ADD CONSTRAINT "items_medicion_cargo_id_fkey" FOREIGN KEY ("cargo_id") REFERENCES "cargos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "metas_item" ADD CONSTRAINT "metas_item_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "metas_item" ADD CONSTRAINT "metas_item_periodo_id_fkey" FOREIGN KEY ("periodo_id") REFERENCES "periodos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "metas_item" ADD CONSTRAINT "metas_item_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items_medicion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "metas_item" ADD CONSTRAINT "metas_item_funcionario_id_fkey" FOREIGN KEY ("funcionario_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personas_usuarias" ADD CONSTRAINT "personas_usuarias_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "actividades" ADD CONSTRAINT "actividades_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "actividades" ADD CONSTRAINT "actividades_periodo_id_fkey" FOREIGN KEY ("periodo_id") REFERENCES "periodos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "actividades" ADD CONSTRAINT "actividades_unidad_territorial_id_fkey" FOREIGN KEY ("unidad_territorial_id") REFERENCES "unidades_territoriales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "actividades" ADD CONSTRAINT "actividades_funcionario_id_fkey" FOREIGN KEY ("funcionario_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "actividades" ADD CONSTRAINT "actividades_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items_medicion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "actividades" ADD CONSTRAINT "actividades_persona_usuaria_id_fkey" FOREIGN KEY ("persona_usuaria_id") REFERENCES "personas_usuarias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "actividades" ADD CONSTRAINT "actividades_tarea_id_fkey" FOREIGN KEY ("tarea_id") REFERENCES "tareas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidencias" ADD CONSTRAINT "evidencias_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidencias" ADD CONSTRAINT "evidencias_actividad_id_fkey" FOREIGN KEY ("actividad_id") REFERENCES "actividades"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidencias" ADD CONSTRAINT "evidencias_subida_por_id_fkey" FOREIGN KEY ("subida_por_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "validaciones" ADD CONSTRAINT "validaciones_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "validaciones" ADD CONSTRAINT "validaciones_evidencia_id_fkey" FOREIGN KEY ("evidencia_id") REFERENCES "evidencias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "validaciones" ADD CONSTRAINT "validaciones_verificador_id_fkey" FOREIGN KEY ("verificador_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "atenciones_sociales" ADD CONSTRAINT "atenciones_sociales_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "atenciones_sociales" ADD CONSTRAINT "atenciones_sociales_actividad_id_fkey" FOREIGN KEY ("actividad_id") REFERENCES "actividades"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ausencias" ADD CONSTRAINT "ausencias_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ausencias" ADD CONSTRAINT "ausencias_periodo_id_fkey" FOREIGN KEY ("periodo_id") REFERENCES "periodos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ausencias" ADD CONSTRAINT "ausencias_funcionario_id_fkey" FOREIGN KEY ("funcionario_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ajustes" ADD CONSTRAINT "ajustes_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ajustes" ADD CONSTRAINT "ajustes_periodo_id_fkey" FOREIGN KEY ("periodo_id") REFERENCES "periodos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ajustes" ADD CONSTRAINT "ajustes_funcionario_id_fkey" FOREIGN KEY ("funcionario_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ajustes" ADD CONSTRAINT "ajustes_registrado_por_id_fkey" FOREIGN KEY ("registrado_por_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalogo_items" ADD CONSTRAINT "catalogo_items_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tarea_historial" ADD CONSTRAINT "tarea_historial_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tarea_historial" ADD CONSTRAINT "tarea_historial_tarea_id_fkey" FOREIGN KEY ("tarea_id") REFERENCES "tareas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tarea_historial" ADD CONSTRAINT "tarea_historial_autor_id_fkey" FOREIGN KEY ("autor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comentarios" ADD CONSTRAINT "comentarios_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comentarios" ADD CONSTRAINT "comentarios_autor_id_fkey" FOREIGN KEY ("autor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auditoria" ADD CONSTRAINT "auditoria_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- ============================================================================
-- Reglas que Prisma no puede expresar en el esquema.
-- ============================================================================

-- RNF-008 / ADR-006: la auditoria es SOLO-INSERCION. Una bitacora que la
-- propia aplicacion puede modificar no es una bitacora. Se revoca a nivel de
-- base, no solo en el codigo, para que ni un bug ni un abuso puedan alterarla.
CREATE OR REPLACE FUNCTION auditoria_es_inmutable() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'La auditoria es de solo insercion (RNF-008): no se permite % ', TG_OP;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auditoria_sin_update
  BEFORE UPDATE ON auditoria
  FOR EACH ROW EXECUTE FUNCTION auditoria_es_inmutable();

CREATE TRIGGER auditoria_sin_delete
  BEFORE DELETE ON auditoria
  FOR EACH ROW EXECUTE FUNCTION auditoria_es_inmutable();

-- RF-011 / ADR-004: el codigo de la actividad es INMUTABLE una vez creado.
CREATE OR REPLACE FUNCTION actividad_codigo_inmutable() RETURNS trigger AS $$
BEGIN
  IF NEW.codigo IS DISTINCT FROM OLD.codigo THEN
    RAISE EXCEPTION 'El codigo de evidencia es inmutable (RF-011): % -> %', OLD.codigo, NEW.codigo;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER actividad_codigo_no_cambia
  BEFORE UPDATE ON actividades
  FOR EACH ROW EXECUTE FUNCTION actividad_codigo_inmutable();

-- ADR-001: el RUT guardado debe estar en formato canonico (sin puntos, con
-- guion, DV en mayuscula). La validacion de modulo 11 vive en la aplicacion
-- (lib/rut.ts); aqui se garantiza al menos la forma.
ALTER TABLE users
  ADD CONSTRAINT users_rut_formato CHECK (rut IS NULL OR rut ~ '^[0-9]{7,8}-[0-9K]$');
ALTER TABLE personas_usuarias
  ADD CONSTRAINT personas_rut_formato CHECK (rut IS NULL OR rut ~ '^[0-9]{7,8}-[0-9K]$');

-- ADR-003: indice de expresion para buscar por nombre completo sin guardar
-- una columna duplicada. La regla de concatenacion vive en lib/persona.ts.
CREATE INDEX personas_usuarias_nombre_completo
  ON personas_usuarias ((nombres || ' ' || apellido_paterno || ' ' || COALESCE(apellido_materno, '')));

-- RN-013: un periodo cerrado no admite fecha de termino anterior al inicio.
ALTER TABLE periodos
  ADD CONSTRAINT periodo_fechas_coherentes CHECK (fecha_termino >= fecha_inicio);

-- RN-002: la meta de un item cuantitativo debe ser mayor que cero.
ALTER TABLE metas_item
  ADD CONSTRAINT meta_valor_positivo CHECK (meta_valor > 0);
ALTER TABLE metas_item
  ADD CONSTRAINT ponderador_en_rango CHECK (ponderador >= 0 AND ponderador <= 1);
