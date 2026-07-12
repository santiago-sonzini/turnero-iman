-- Aviso por email al dueño cuando entra una reserva (opt-in).
ALTER TABLE "BusinessProfile" ADD COLUMN "notifyOnBooking" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "BusinessProfile" ADD COLUMN "notifyEmail" TEXT;
