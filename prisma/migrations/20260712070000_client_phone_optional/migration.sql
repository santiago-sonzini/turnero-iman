-- Teléfono del cliente opcional (alta manual de walk-in sin WhatsApp).
-- Postgres permite múltiples NULL en el índice único (tenantId, phone).
ALTER TABLE "Client" ALTER COLUMN "phone" DROP NOT NULL;
