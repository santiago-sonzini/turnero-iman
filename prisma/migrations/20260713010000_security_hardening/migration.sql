-- Tokens de acceso por turno (hash + vencimiento), estado efímero del checkout
-- de suscripciones, leases del worker, rate limiting e idempotencia de webhooks.
ALTER TABLE "Tenant"
  ADD COLUMN "mpCheckoutTokenHash" TEXT,
  ADD COLUMN "mpCheckoutExpiresAt" TIMESTAMP(3);

ALTER TABLE "Appointment"
  ADD COLUMN "publicTokenHash" TEXT,
  ADD COLUMN "publicTokenExpiresAt" TIMESTAMP(3);
CREATE UNIQUE INDEX "Appointment_publicTokenHash_key" ON "Appointment"("publicTokenHash");

ALTER TABLE "MessageJob" ADD COLUMN "processingStartedAt" TIMESTAMP(3);

CREATE TABLE "RateLimitBucket" (
  "key" TEXT NOT NULL,
  "count" INTEGER NOT NULL DEFAULT 0,
  "resetAt" TIMESTAMP(3) NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RateLimitBucket_pkey" PRIMARY KEY ("key")
);
CREATE INDEX "RateLimitBucket_resetAt_idx" ON "RateLimitBucket"("resetAt");

CREATE TABLE "WebhookEvent" (
  "id" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "dataId" TEXT NOT NULL,
  "processedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "WebhookEvent_processedAt_createdAt_idx" ON "WebhookEvent"("processedAt", "createdAt");

-- Invalida los tokens históricos por cliente: permitían tomar control de todas
-- sus reservas con solo conocer el teléfono. La columna se conserva durante
-- el rollout para que la versión anterior no falle antes del deploy nuevo.
UPDATE "Client" SET "accessToken" = NULL WHERE "accessToken" IS NOT NULL;

-- Integridad multi-tenant en la propia base: una relación no puede apuntar a
-- una fila de otro negocio aunque un caller futuro olvide el scope de Prisma.
CREATE UNIQUE INDEX "Staff_tenantId_id_key" ON "Staff"("tenantId", "id");
CREATE UNIQUE INDEX "Service_tenantId_id_key" ON "Service"("tenantId", "id");
CREATE UNIQUE INDEX "Client_tenantId_id_key" ON "Client"("tenantId", "id");
CREATE UNIQUE INDEX "Promotion_tenantId_id_key" ON "Promotion"("tenantId", "id");

ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_tenant_service_fkey"
  FOREIGN KEY ("tenantId", "serviceId") REFERENCES "Service"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_tenant_client_fkey"
  FOREIGN KEY ("tenantId", "clientId") REFERENCES "Client"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_tenant_staff_fkey"
  FOREIGN KEY ("tenantId", "staffId") REFERENCES "Staff"("tenantId", "id") ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_tenant_promotion_fkey"
  FOREIGN KEY ("tenantId", "promotionId") REFERENCES "Promotion"("tenantId", "id") ON DELETE NO ACTION ON UPDATE CASCADE;

ALTER TABLE "StaffService" ADD COLUMN "tenantId" TEXT;
UPDATE "StaffService" ss SET "tenantId" = s."tenantId" FROM "Staff" s WHERE s."id" = ss."staffId";
ALTER TABLE "StaffService" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "StaffService" ADD CONSTRAINT "StaffService_tenant_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StaffService" ADD CONSTRAINT "StaffService_tenant_staff_fkey"
  FOREIGN KEY ("tenantId", "staffId") REFERENCES "Staff"("tenantId", "id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StaffService" ADD CONSTRAINT "StaffService_tenant_service_fkey"
  FOREIGN KEY ("tenantId", "serviceId") REFERENCES "Service"("tenantId", "id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "StaffService_tenantId_idx" ON "StaffService"("tenantId");
