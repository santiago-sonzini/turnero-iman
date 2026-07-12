-- Multi-staff (profesionales) + tema visual del negocio (plan Turnos Auto).

-- Tema visual de la página pública.
ALTER TABLE "BusinessProfile" ADD COLUMN "theme" TEXT NOT NULL DEFAULT 'clasico';

-- Profesionales del negocio.
CREATE TABLE "Staff" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "emoji" TEXT NOT NULL DEFAULT '💈',
  "active" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Staff_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Staff_tenantId_active_idx" ON "Staff"("tenantId", "active");
ALTER TABLE "Staff" ADD CONSTRAINT "Staff_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Turno asignado a un profesional (opcional).
ALTER TABLE "Appointment" ADD COLUMN "staffId" TEXT;
CREATE INDEX "Appointment_staffId_startsAt_idx" ON "Appointment"("staffId", "startsAt");
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_staffId_fkey"
  FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Solapamiento POR profesional: el mismo profesional (o el negocio si no hay
-- staff, coalesciendo a '') no puede tener dos turnos activos pisados; dos
-- profesionales distintos sí pueden atender a la misma hora.
ALTER TABLE "Appointment" DROP CONSTRAINT "appointment_no_overlap";
ALTER TABLE "Appointment" ADD CONSTRAINT "appointment_no_overlap"
EXCLUDE USING gist (
  "tenantId" WITH =,
  (COALESCE("staffId", '')) WITH =,
  tstzrange("startsAt", "endsAt", '[)') WITH &&
) WHERE ("status" <> 'CANCELADO');
