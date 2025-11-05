-- AlterTable
ALTER TABLE "Campaign" ADD COLUMN     "reach" INTEGER;

-- CreateIndex
CREATE INDEX "Campaign_schoolId_idx" ON "Campaign"("schoolId");

-- CreateIndex
CREATE INDEX "Campaign_status_idx" ON "Campaign"("status");

-- CreateIndex
CREATE INDEX "Campaign_type_idx" ON "Campaign"("type");
