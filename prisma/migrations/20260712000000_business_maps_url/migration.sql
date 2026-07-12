-- Link de Google Maps del negocio (opcional): alternativa a la dirección
-- escrita para el botón "Cómo llegar" de la página pública de reservas.
ALTER TABLE "BusinessProfile" ADD COLUMN "mapsUrl" TEXT;
