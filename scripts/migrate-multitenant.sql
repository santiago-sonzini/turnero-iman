-- ─────────────────────────────────────────────────────────────────────────────
-- Migración multi-tenant para una base EXISTENTE con datos (single-tenant).
-- Crea el tenant "principal", cuelga todas las filas existentes de él y aplica
-- los cambios de unicidad (slug/name/orderNumber pasan a ser únicos POR tenant).
--
-- ⚠️ CORRER SOLO UNA VEZ y con backup previo:
--    1. Backup:   pg_dump "$DATABASE_URL" > backup-pre-multitenant.sql
--    2. Ejecutar: npx prisma db execute --file scripts/migrate-multitenant.sql
--    3. Reconciliar el resto del schema: npx prisma db push
--    4. Regenerar el cliente: npx prisma generate
--
-- Es idempotente en su mayoría (IF NOT EXISTS / ON CONFLICT), pero igual:
-- backup primero. En una base VACÍA no hace falta este script: alcanza con
-- `npx prisma db push`.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1) Enums nuevos
DO $$ BEGIN
  CREATE TYPE "PlanTier" AS ENUM ('SIMPLE', 'COMPLETO', 'PERSONALIZADO');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "SubscriptionStatus" AS ENUM ('ONBOARDING', 'TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2) Tabla Tenant + FunnelEvent
CREATE TABLE IF NOT EXISTS "Tenant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "plan" "PlanTier",
    "planStatus" "SubscriptionStatus" NOT NULL DEFAULT 'ONBOARDING',
    "trialEndsAt" TIMESTAMP(3),
    "graceUntil" TIMESTAMP(3),
    "mpPreapprovalId" TEXT,
    "mpPayerEmail" TEXT,
    "mpLastPaymentAt" TIMESTAMP(3),
    "addons" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "onboardingStep" TEXT NOT NULL DEFAULT 'importar',
    "revealSnapshot" JSONB,
    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Tenant_slug_key" ON "Tenant"("slug");
CREATE UNIQUE INDEX IF NOT EXISTS "Tenant_mpPreapprovalId_key" ON "Tenant"("mpPreapprovalId");
CREATE INDEX IF NOT EXISTS "Tenant_planStatus_idx" ON "Tenant"("planStatus");

CREATE TABLE IF NOT EXISTS "FunnelEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT '',
    "event" TEXT NOT NULL,
    "props" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FunnelEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "FunnelEvent_event_createdAt_idx" ON "FunnelEvent"("event", "createdAt");
CREATE INDEX IF NOT EXISTS "FunnelEvent_tenantId_idx" ON "FunnelEvent"("tenantId");

-- 3) Tenant "principal": hereda el nombre del BusinessProfile existente.
--    Queda ACTIVE con plan COMPLETO (era el único negocio del deploy).
INSERT INTO "Tenant" ("id", "name", "slug", "plan", "planStatus", "onboardingStep", "updatedAt")
SELECT
  'tenant-principal',
  COALESCE((SELECT b."name" FROM "BusinessProfile" b LIMIT 1), 'Mi negocio'),
  'principal',
  'COMPLETO',
  'ACTIVE',
  'listo',
  CURRENT_TIMESTAMP
ON CONFLICT ("id") DO NOTHING;

-- 4) Columna tenantId + backfill en cada tabla de dominio.
--    El DEFAULT 'tenant-principal' cubre filas existentes y cualquier insert
--    en vuelo durante la migración; el default definitivo ('') lo repone
--    `prisma db push` en el paso 3 del instructivo.
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'User','Client','Payment','ClientDiscount','Category','Product','Offer',
    'Order','ReorderAlert','MessageTemplate','ContactLog','BusinessProfile',
    'PurchaseAnalytics'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS "tenantId" TEXT NOT NULL DEFAULT ''tenant-principal''', t);
    EXECUTE format('UPDATE %I SET "tenantId" = ''tenant-principal'' WHERE "tenantId" = ''''', t);
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON %I ("tenantId")', t || '_tenantId_idx', t);
    -- FK (si no existe ya)
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = t || '_tenantId_fkey'
    ) THEN
      EXECUTE format(
        'ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE',
        t, t || '_tenantId_fkey'
      );
    END IF;
  END LOOP;
END $$;

-- FunnelEvent FK (cascade: si se borra el tenant se van sus eventos)
DO $$ BEGIN
  ALTER TABLE "FunnelEvent" ADD CONSTRAINT "FunnelEvent_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 5) Unicidades: de globales a por-tenant.
DROP INDEX IF EXISTS "User_name_key";
DROP INDEX IF EXISTS "User_phone_key";
DROP INDEX IF EXISTS "Client_name_key";
DROP INDEX IF EXISTS "Client_phone_key";
DROP INDEX IF EXISTS "Category_slug_key";
DROP INDEX IF EXISTS "Product_slug_key";
DROP INDEX IF EXISTS "Order_orderNumber_key";

CREATE UNIQUE INDEX IF NOT EXISTS "Client_tenantId_name_key" ON "Client"("tenantId", "name");
CREATE UNIQUE INDEX IF NOT EXISTS "Client_tenantId_phone_key" ON "Client"("tenantId", "phone");
CREATE UNIQUE INDEX IF NOT EXISTS "Category_tenantId_slug_key" ON "Category"("tenantId", "slug");
CREATE UNIQUE INDEX IF NOT EXISTS "Product_tenantId_slug_key" ON "Product"("tenantId", "slug");
CREATE UNIQUE INDEX IF NOT EXISTS "Order_tenantId_orderNumber_key" ON "Order"("tenantId", "orderNumber");
CREATE UNIQUE INDEX IF NOT EXISTS "BusinessProfile_tenantId_key" ON "BusinessProfile"("tenantId");
