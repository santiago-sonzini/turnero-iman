/*
  Warnings:

  - You are about to drop the column `cuit` on the `BusinessProfile` table. All the data in the column will be lost.
  - You are about to drop the column `margins` on the `BusinessProfile` table. All the data in the column will be lost.
  - You are about to drop the column `sharePricelistEnabled` on the `BusinessProfile` table. All the data in the column will be lost.
  - You are about to drop the column `shareStockEnabled` on the `BusinessProfile` table. All the data in the column will be lost.
  - You are about to drop the column `supplierToken` on the `BusinessProfile` table. All the data in the column will be lost.
  - You are about to drop the column `themeAccent` on the `BusinessProfile` table. All the data in the column will be lost.
  - You are about to drop the `_ClientToClientDiscount` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_OfferToProduct` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_OrderToPayment` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Appointment" DROP CONSTRAINT "Appointment_clientId_fkey";

-- DropForeignKey
ALTER TABLE "Appointment" DROP CONSTRAINT "Appointment_promotionId_fkey";

-- DropForeignKey
ALTER TABLE "Appointment" DROP CONSTRAINT "Appointment_serviceId_fkey";

-- DropForeignKey
ALTER TABLE "Appointment" DROP CONSTRAINT "Appointment_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "BusinessProfile" DROP CONSTRAINT "BusinessProfile_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "Client" DROP CONSTRAINT "Client_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "MessageJob" DROP CONSTRAINT "MessageJob_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "Promotion" DROP CONSTRAINT "Promotion_serviceId_fkey";

-- DropForeignKey
ALTER TABLE "Promotion" DROP CONSTRAINT "Promotion_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "Service" DROP CONSTRAINT "Service_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "WhatsappSession" DROP CONSTRAINT "WhatsappSession_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "WorkingHour" DROP CONSTRAINT "WorkingHour_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "_ClientToClientDiscount" DROP CONSTRAINT "_ClientToClientDiscount_A_fkey";

-- DropIndex
DROP INDEX "Client_phone_idx";

-- DropIndex
DROP INDEX "Client_tenantId_idx";

-- AlterTable
ALTER TABLE "BusinessProfile" DROP COLUMN "cuit",
DROP COLUMN "margins",
DROP COLUMN "sharePricelistEnabled",
DROP COLUMN "shareStockEnabled",
DROP COLUMN "supplierToken",
DROP COLUMN "themeAccent",
ALTER COLUMN "tenantId" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Client" ALTER COLUMN "tenantId" DROP DEFAULT;

-- AlterTable
ALTER TABLE "FunnelEvent" ALTER COLUMN "tenantId" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Tenant" ALTER COLUMN "onboardingStep" SET DEFAULT 'negocio';

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "tenantId" DROP DEFAULT;

-- DropTable
DROP TABLE "_ClientToClientDiscount";

-- DropTable
DROP TABLE "_OfferToProduct";

-- DropTable
DROP TABLE "_OrderToPayment";

-- CreateIndex
CREATE INDEX "Client_tenantId_name_idx" ON "Client"("tenantId", "name");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessProfile" ADD CONSTRAINT "BusinessProfile_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Service" ADD CONSTRAINT "Service_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkingHour" ADD CONSTRAINT "WorkingHour_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_promotionId_fkey" FOREIGN KEY ("promotionId") REFERENCES "Promotion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Promotion" ADD CONSTRAINT "Promotion_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Promotion" ADD CONSTRAINT "Promotion_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageJob" ADD CONSTRAINT "MessageJob_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsappSession" ADD CONSTRAINT "WhatsappSession_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
