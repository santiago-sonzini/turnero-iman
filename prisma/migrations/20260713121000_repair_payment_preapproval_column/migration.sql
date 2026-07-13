-- La migración security_hardening figura aplicada en algunos entornos donde
-- esta columna no llegó a materializarse. IF NOT EXISTS repara el drift sin
-- tocar las foreign keys compuestas de seguridad que la base ya conserva.
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "mpLastPaymentPreapprovalId" TEXT;
