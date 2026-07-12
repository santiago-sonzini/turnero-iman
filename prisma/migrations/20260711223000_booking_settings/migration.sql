-- Ajustes de reservas del negocio y token del cliente recurrente.

-- BusinessProfile: rubro, mostrar precios, vacaciones y ventana de cancelación.
ALTER TABLE "BusinessProfile" ADD COLUMN "businessType" TEXT;
ALTER TABLE "BusinessProfile" ADD COLUMN "showPrices" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "BusinessProfile" ADD COLUMN "vacations" JSONB;
ALTER TABLE "BusinessProfile" ADD COLUMN "cancelWindowHours" INTEGER NOT NULL DEFAULT 48;

-- Client: token para que el cliente vea sus turnos al volver (sin login).
ALTER TABLE "Client" ADD COLUMN "accessToken" TEXT;
CREATE UNIQUE INDEX "Client_accessToken_key" ON "Client"("accessToken");
