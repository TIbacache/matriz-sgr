-- AlterTable
ALTER TABLE "organization_members" ADD COLUMN     "cargo" TEXT,
ADD COLUMN     "unidad_territorial_id" TEXT;

-- CreateIndex
CREATE INDEX "organization_members_organization_id_unidad_territorial_id_idx" ON "organization_members"("organization_id", "unidad_territorial_id");

-- AddForeignKey
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_unidad_territorial_id_fkey" FOREIGN KEY ("unidad_territorial_id") REFERENCES "unidades_territoriales"("id") ON DELETE SET NULL ON UPDATE CASCADE;
