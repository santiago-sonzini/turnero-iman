-- DropForeignKey
ALTER TABLE "Appointment" DROP CONSTRAINT "Appointment_tenant_client_fkey";

-- DropForeignKey
ALTER TABLE "Appointment" DROP CONSTRAINT "Appointment_tenant_promotion_fkey";

-- DropForeignKey
ALTER TABLE "Appointment" DROP CONSTRAINT "Appointment_tenant_service_fkey";

-- DropForeignKey
ALTER TABLE "Appointment" DROP CONSTRAINT "Appointment_tenant_staff_fkey";

-- DropForeignKey
ALTER TABLE "StaffService" DROP CONSTRAINT "StaffService_tenant_service_fkey";

-- DropForeignKey
ALTER TABLE "StaffService" DROP CONSTRAINT "StaffService_tenant_staff_fkey";

-- RenameForeignKey
ALTER TABLE "StaffService" RENAME CONSTRAINT "StaffService_tenant_fkey" TO "StaffService_tenantId_fkey";
