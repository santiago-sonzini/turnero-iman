-- MP: mapear el negocio a su preapproval_plan (flujo de suscripciones).
ALTER TABLE "Tenant" ADD COLUMN "mpPreapprovalPlanId" TEXT;
CREATE UNIQUE INDEX "Tenant_mpPreapprovalPlanId_key" ON "Tenant"("mpPreapprovalPlanId");
