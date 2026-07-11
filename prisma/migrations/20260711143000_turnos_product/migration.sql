-- Destructive product migration approved on 11/07/2026.
-- Tenant, users, subscriptions and customer contact data are preserved.
DROP TABLE IF EXISTS "PaymentAllocation" CASCADE;
DROP TABLE IF EXISTS "ProductInOrder" CASCADE;
DROP TABLE IF EXISTS "PurchaseAnalytics" CASCADE;
DROP TABLE IF EXISTS "ReorderAlert" CASCADE;
DROP TABLE IF EXISTS "ContactLog" CASCADE;
DROP TABLE IF EXISTS "MessageTemplate" CASCADE;
DROP TABLE IF EXISTS "ClientDiscount" CASCADE;
DROP TABLE IF EXISTS "Payment" CASCADE;
DROP TABLE IF EXISTS "Order" CASCADE;
DROP TABLE IF EXISTS "Offer" CASCADE;
DROP TABLE IF EXISTS "Product" CASCADE;
DROP TABLE IF EXISTS "Category" CASCADE;
DROP TYPE IF EXISTS "OfferScope" CASCADE;
DROP TYPE IF EXISTS "DiscountType" CASCADE;
DROP TYPE IF EXISTS "OrderStatus" CASCADE;
DROP TYPE IF EXISTS "PaymentStatus" CASCADE;

ALTER TYPE "PlanTier" RENAME TO "PlanTier_old";
CREATE TYPE "PlanTier" AS ENUM ('TURNOS', 'TURNOS_AUTO');
ALTER TABLE "Tenant" ALTER COLUMN "plan" TYPE "PlanTier"
USING CASE
  WHEN "plan" IS NULL THEN NULL
  WHEN "plan"::text = 'SIMPLE' THEN 'TURNOS'::"PlanTier"
  ELSE 'TURNOS_AUTO'::"PlanTier"
END;
DROP TYPE "PlanTier_old";

ALTER TYPE "Role" RENAME TO "Role_old";
CREATE TYPE "Role" AS ENUM ('ADMIN');
ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "role" TYPE "Role"
USING 'ADMIN'::"Role";
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'ADMIN';
DROP TYPE "Role_old";

ALTER TABLE "Tenant"
  ADD COLUMN "whatsappRiskAcceptedAt" TIMESTAMP(3),
  ADD COLUMN "whatsappRiskAcceptedBy" TEXT;

ALTER TABLE "User"
  DROP COLUMN IF EXISTS "adress",
  DROP COLUMN IF EXISTS "clientId";

DROP INDEX IF EXISTS "Client_tenantId_name_key";
UPDATE "Client" SET "phone" = 'legacy-' || "id" WHERE "phone" IS NULL OR btrim("phone") = '';
ALTER TABLE "Client"
  ALTER COLUMN "phone" SET NOT NULL,
  DROP COLUMN IF EXISTS "adress",
  DROP COLUMN IF EXISTS "discount",
  DROP COLUMN IF EXISTS "accessToken",
  ADD COLUMN "expectedCycleDays" INTEGER,
  ADD COLUMN "marketingConsent" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "BusinessProfile"
  DROP COLUMN IF EXISTS "logoUrl",
  DROP COLUMN IF EXISTS "whatsappServerUrl",
  DROP COLUMN IF EXISTS "supplierUrl",
  DROP COLUMN IF EXISTS "shareStock",
  DROP COLUMN IF EXISTS "exposePricelist",
  DROP COLUMN IF EXISTS "partnerToken",
  ADD COLUMN IF NOT EXISTS "description" TEXT,
  ADD COLUMN IF NOT EXISTS "address" TEXT,
  ADD COLUMN IF NOT EXISTS "instagram" TEXT,
  ADD COLUMN IF NOT EXISTS "timezone" TEXT NOT NULL DEFAULT 'America/Argentina/Buenos_Aires',
  ADD COLUMN IF NOT EXISTS "accent" TEXT NOT NULL DEFAULT '#E94F37',
  ADD COLUMN IF NOT EXISTS "bookingLeadMinutes" INTEGER NOT NULL DEFAULT 60,
  ADD COLUMN IF NOT EXISTS "bookingHorizonDays" INTEGER NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS "slotStepMinutes" INTEGER NOT NULL DEFAULT 15,
  ADD COLUMN IF NOT EXISTS "bufferMinutes" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "depositsEnabled" BOOLEAN NOT NULL DEFAULT false;
CREATE UNIQUE INDEX IF NOT EXISTS "BusinessProfile_tenantId_key" ON "BusinessProfile"("tenantId");

CREATE TYPE "AppointmentStatus" AS ENUM ('CONFIRMADO', 'ASISTIO', 'NO_VINO', 'CANCELADO');
CREATE TYPE "BookingChannel" AS ENUM ('OWNER', 'PUBLIC', 'PROMO');
CREATE TYPE "PromotionKind" AS ENUM ('ADD_ON', 'DESCUENTO', 'PRECIO_FIJO');
CREATE TYPE "MessageKind" AS ENUM ('CONFIRMACION', 'RECORDATORIO', 'CICLO', 'HUECO');
CREATE TYPE "MessageStatus" AS ENUM ('PENDING', 'PROCESSING', 'SENT', 'FAILED', 'FALLBACK');
CREATE TYPE "WhatsappHealth" AS ENUM ('DISCONNECTED', 'QR_PENDING', 'CONNECTED', 'DEGRADED', 'BANNED');

CREATE TABLE "Service" (
  "id" TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "emoji" TEXT NOT NULL DEFAULT '✂️',
  "durationMinutes" INTEGER NOT NULL,
  "priceCents" INTEGER NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX "Service_tenantId_name_key" ON "Service"("tenantId", "name");
CREATE INDEX "Service_tenantId_active_idx" ON "Service"("tenantId", "active");

CREATE TABLE "WorkingHour" (
  "id" TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE,
  "weekday" INTEGER NOT NULL,
  "startMinutes" INTEGER NOT NULL,
  "endMinutes" INTEGER NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true
);
CREATE UNIQUE INDEX "WorkingHour_tenantId_weekday_startMinutes_key" ON "WorkingHour"("tenantId", "weekday", "startMinutes");
CREATE INDEX "WorkingHour_tenantId_weekday_idx" ON "WorkingHour"("tenantId", "weekday");

CREATE TABLE "Promotion" (
  "id" TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE,
  "serviceId" TEXT REFERENCES "Service"("id") ON DELETE SET NULL,
  "name" TEXT NOT NULL,
  "kind" "PromotionKind" NOT NULL DEFAULT 'ADD_ON',
  "valueCents" INTEGER,
  "addOnLabel" TEXT,
  "message" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "Promotion_token_key" ON "Promotion"("token");
CREATE INDEX "Promotion_tenantId_active_expiresAt_idx" ON "Promotion"("tenantId", "active", "expiresAt");

CREATE TABLE "Appointment" (
  "id" TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE,
  "serviceId" TEXT NOT NULL REFERENCES "Service"("id"),
  "clientId" TEXT NOT NULL REFERENCES "Client"("id"),
  "startsAt" TIMESTAMPTZ(3) NOT NULL,
  "endsAt" TIMESTAMPTZ(3) NOT NULL,
  "status" "AppointmentStatus" NOT NULL DEFAULT 'CONFIRMADO',
  "channel" "BookingChannel" NOT NULL DEFAULT 'OWNER',
  "notes" TEXT,
  "depositRequired" BOOLEAN NOT NULL DEFAULT false,
  "depositAmountCents" INTEGER,
  "depositStatus" TEXT,
  "promotionId" TEXT REFERENCES "Promotion"("id") ON DELETE SET NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "Appointment_tenantId_startsAt_idx" ON "Appointment"("tenantId", "startsAt");
CREATE INDEX "Appointment_tenantId_clientId_status_idx" ON "Appointment"("tenantId", "clientId", "status");

-- PostgreSQL is the final authority: active appointments for a tenant cannot overlap.
CREATE EXTENSION IF NOT EXISTS btree_gist;
ALTER TABLE "Appointment" ADD CONSTRAINT "appointment_no_overlap"
EXCLUDE USING gist (
  "tenantId" WITH =,
  tstzrange("startsAt", "endsAt", '[)') WITH &&
) WHERE ("status" <> 'CANCELADO');

CREATE TABLE "MessageJob" (
  "id" TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE,
  "kind" "MessageKind" NOT NULL,
  "status" "MessageStatus" NOT NULL DEFAULT 'PENDING',
  "phone" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "scheduledAt" TIMESTAMP(3) NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "nextAttemptAt" TIMESTAMP(3),
  "lastError" TEXT,
  "sentAt" TIMESTAMP(3),
  "idempotencyKey" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "MessageJob_idempotencyKey_key" ON "MessageJob"("idempotencyKey");
CREATE INDEX "MessageJob_status_scheduledAt_idx" ON "MessageJob"("status", "scheduledAt");
CREATE INDEX "MessageJob_tenantId_createdAt_idx" ON "MessageJob"("tenantId", "createdAt");

CREATE TABLE "WhatsappSession" (
  "id" TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE,
  "health" "WhatsappHealth" NOT NULL DEFAULT 'DISCONNECTED',
  "phone" TEXT,
  "qrCode" TEXT,
  "lastSeenAt" TIMESTAMP(3),
  "lastError" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX "WhatsappSession_tenantId_key" ON "WhatsappSession"("tenantId");
