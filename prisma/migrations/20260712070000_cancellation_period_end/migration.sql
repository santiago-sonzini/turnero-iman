-- La baja se registra localmente antes de llamar a Mercado Pago. El acceso se
-- conserva hasta el cierre del ciclo ya abonado y una falla remota queda
-- visible para que el dueño verifique la cancelación en MP.
ALTER TABLE "Tenant"
  ADD COLUMN "cancellationEffectiveAt" TIMESTAMP(3),
  ADD COLUMN "mpCancellationPending" BOOLEAN NOT NULL DEFAULT false;
