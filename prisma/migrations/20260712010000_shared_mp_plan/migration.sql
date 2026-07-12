-- Plan de suscripción de Mercado Pago COMPARTIDO por tier (una plantilla por
-- plan, no una por cliente). Cada tenant suscribe sobre el plan de su tier.
CREATE TABLE "MpPlan" (
    "mpPlanId" TEXT NOT NULL,
    "tier" "PlanTier" NOT NULL,
    "amountArs" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MpPlan_pkey" PRIMARY KEY ("mpPlanId")
);
CREATE UNIQUE INDEX "MpPlan_tier_key" ON "MpPlan"("tier");
