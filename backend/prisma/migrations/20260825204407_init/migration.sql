-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('admin', 'supervisor', 'gerente', 'usuario');

-- CreateEnum
CREATE TYPE "TipoOrganizacion" AS ENUM ('municipio', 'empresa');

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo" "TipoOrganizacion" NOT NULL,
    "configuracion_terminologia" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_members" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "rol" "Rol" NOT NULL,

    CONSTRAINT "organization_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "unidades_territoriales" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "responsable_id" TEXT,

    CONSTRAINT "unidades_territoriales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categorias_gestion" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "orden_prioridad" INTEGER NOT NULL,

    CONSTRAINT "categorias_gestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tareas" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "unidad_territorial_id" TEXT NOT NULL,
    "categoria_id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'pendiente',
    "fecha_compromiso" DATE,
    "responsable_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tareas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "metas" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "unidad_territorial_id" TEXT NOT NULL,
    "categoria_id" TEXT NOT NULL,
    "trimestre" TEXT NOT NULL,
    "meta_trimestre" DECIMAL(12,2) NOT NULL,
    "avance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "ponderador" DECIMAL(5,4) NOT NULL,

    CONSTRAINT "metas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "organization_members_organization_id_user_id_key" ON "organization_members"("organization_id", "user_id");

-- CreateIndex
CREATE INDEX "unidades_territoriales_organization_id_idx" ON "unidades_territoriales"("organization_id");

-- CreateIndex
CREATE INDEX "categorias_gestion_organization_id_idx" ON "categorias_gestion"("organization_id");

-- CreateIndex
CREATE INDEX "tareas_organization_id_unidad_territorial_id_estado_idx" ON "tareas"("organization_id", "unidad_territorial_id", "estado");

-- CreateIndex
CREATE INDEX "metas_organization_id_trimestre_idx" ON "metas"("organization_id", "trimestre");

-- CreateIndex
CREATE UNIQUE INDEX "metas_unidad_territorial_id_categoria_id_trimestre_key" ON "metas"("unidad_territorial_id", "categoria_id", "trimestre");

-- AddForeignKey
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unidades_territoriales" ADD CONSTRAINT "unidades_territoriales_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unidades_territoriales" ADD CONSTRAINT "unidades_territoriales_responsable_id_fkey" FOREIGN KEY ("responsable_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categorias_gestion" ADD CONSTRAINT "categorias_gestion_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tareas" ADD CONSTRAINT "tareas_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tareas" ADD CONSTRAINT "tareas_unidad_territorial_id_fkey" FOREIGN KEY ("unidad_territorial_id") REFERENCES "unidades_territoriales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tareas" ADD CONSTRAINT "tareas_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "categorias_gestion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tareas" ADD CONSTRAINT "tareas_responsable_id_fkey" FOREIGN KEY ("responsable_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "metas" ADD CONSTRAINT "metas_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "metas" ADD CONSTRAINT "metas_unidad_territorial_id_fkey" FOREIGN KEY ("unidad_territorial_id") REFERENCES "unidades_territoriales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "metas" ADD CONSTRAINT "metas_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "categorias_gestion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
