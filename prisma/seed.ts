import { PrismaClient, AppointmentStatus, PlanTier, SubscriptionStatus } from "@prisma/client";

const db = new PrismaClient();
const tenantId = "demo-barberia-el-roble";
const at = (dayOffset: number, hour: number, minute = 0) => {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  d.setDate(d.getDate() + dayOffset);
  return d;
};

async function main() {
  await db.tenant.upsert({
    where: { id: tenantId },
    update: {},
    create: {
      id: tenantId,
      name: "Barbería El Roble",
      slug: "el-roble",
      plan: PlanTier.TURNOS_AUTO,
      planStatus: SubscriptionStatus.ACTIVE,
      onboardingStep: "listo",
      profile: { create: {
        name: "Barbería El Roble",
        description: "Cortes clásicos, barba y buena charla en Güemes.",
        address: "Belgrano 847, Córdoba",
        phone: "3515550194",
        instagram: "@barberiaelroble",
        accent: "#E94F37",
        bufferMinutes: 5,
      } },
    },
  });

  const services = await Promise.all([
    ["Corte clásico", "✂️", 40, 950000],
    ["Corte + barba", "🧔", 60, 1450000],
    ["Barba", "🪒", 30, 700000],
    ["Corte niño", "⚡", 30, 750000],
  ].map(async ([name, emoji, durationMinutes, priceCents], sortOrder) => db.service.upsert({
    where: { tenantId_name: { tenantId, name: String(name) } },
    update: {},
    create: { tenantId, name: String(name), emoji: String(emoji), durationMinutes: Number(durationMinutes), priceCents: Number(priceCents), sortOrder },
  })));

  for (const weekday of [1, 2, 3, 4, 5, 6]) {
    await db.workingHour.upsert({
      where: { tenantId_weekday_startMinutes: { tenantId, weekday, startMinutes: 600 } },
      update: {},
      create: { tenantId, weekday, startMinutes: 600, endMinutes: weekday === 6 ? 1080 : 1200 },
    });
  }

  const people = [
    ["Nico Fernández", "3516124421", 21], ["Martín López", "3517882910", 28],
    ["Facu Molina", "3514207712", 21], ["Tomás Pereyra", "3513991881", 30],
    ["Lucas Aguirre", "3515219300", 18], ["Joaquín Díaz", "3516670021", 25],
    ["Santi Romero", "3514891332", 21], ["Lean Gómez", "3517104500", 30],
  ];
  const clients = await Promise.all(people.map(([name, phone, expectedCycleDays]) => db.client.upsert({
    where: { tenantId_phone: { tenantId, phone: String(phone) } },
    update: {},
    create: { tenantId, name: String(name), phone: String(phone), expectedCycleDays: Number(expectedCycleDays), marketingConsent: true },
  })));

  const schedule = [
    [-42, 10, 0, 0, 0, AppointmentStatus.ASISTIO], [-31, 11, 0, 1, 1, AppointmentStatus.ASISTIO],
    [-25, 16, 0, 2, 0, AppointmentStatus.ASISTIO], [-19, 18, 0, 3, 2, AppointmentStatus.ASISTIO],
    [-15, 10, 0, 4, 0, AppointmentStatus.ASISTIO], [-8, 14, 0, 5, 1, AppointmentStatus.ASISTIO],
    [0, 10, 0, 6, 0, AppointmentStatus.CONFIRMADO], [0, 11, 30, 1, 1, AppointmentStatus.CONFIRMADO],
    [0, 15, 30, 5, 2, AppointmentStatus.CONFIRMADO], [0, 18, 30, 7, 0, AppointmentStatus.CONFIRMADO],
    [1, 10, 0, 2, 0, AppointmentStatus.CONFIRMADO], [1, 14, 0, 3, 1, AppointmentStatus.CONFIRMADO],
    [2, 11, 0, 4, 3, AppointmentStatus.CONFIRMADO], [2, 17, 0, 0, 0, AppointmentStatus.CONFIRMADO],
  ] as const;
  for (const [day, hour, minute, clientIndex, serviceIndex, status] of schedule) {
    const start = at(day, hour, minute);
    const service = services[serviceIndex];
    await db.appointment.upsert({
      where: { id: `demo-${day}-${hour}-${minute}-${clientIndex}` },
      update: {},
      create: {
        id: `demo-${day}-${hour}-${minute}-${clientIndex}`,
        tenantId, clientId: clients[clientIndex].id, serviceId: service.id,
        startsAt: start, endsAt: new Date(start.getTime() + service.durationMinutes * 60000), status,
      },
    });
  }
}

main().finally(() => db.$disconnect());
