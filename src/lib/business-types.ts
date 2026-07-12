// Rubros de negocio y sus servicios sugeridos. Manejan el onboarding: al
// elegir el tipo, el paso de servicios llega pre-cargado con esta plantilla
// (el dueño ajusta precios y destilda lo que no ofrece). Los precios están en
// centavos de ARS como referencia; siempre son editables.
export type ServiceTemplate = {
  name: string;
  emoji: string;
  durationMinutes: number;
  priceCents: number;
};

export type BusinessType = {
  id: string;
  label: string;
  emoji: string;
  services: ServiceTemplate[];
};

export const BUSINESS_TYPES: BusinessType[] = [
  {
    id: "barberia",
    label: "Barbería",
    emoji: "💈",
    services: [
      { name: "Corte clásico", emoji: "✂️", durationMinutes: 40, priceCents: 900000 },
      { name: "Corte + barba", emoji: "🧔", durationMinutes: 60, priceCents: 1400000 },
      { name: "Perfilado de barba", emoji: "🪒", durationMinutes: 30, priceCents: 700000 },
      { name: "Corte niño", emoji: "🧒", durationMinutes: 30, priceCents: 700000 },
    ],
  },
  {
    id: "peluqueria",
    label: "Peluquería",
    emoji: "💇",
    services: [
      { name: "Corte de dama", emoji: "💇", durationMinutes: 45, priceCents: 1200000 },
      { name: "Color", emoji: "🎨", durationMinutes: 90, priceCents: 2500000 },
      { name: "Brushing", emoji: "💨", durationMinutes: 40, priceCents: 900000 },
      { name: "Peinado", emoji: "✨", durationMinutes: 45, priceCents: 1500000 },
    ],
  },
  {
    id: "unas",
    label: "Uñas",
    emoji: "💅",
    services: [
      { name: "Esmaltado semipermanente", emoji: "💅", durationMinutes: 60, priceCents: 1000000 },
      { name: "Kapping", emoji: "💎", durationMinutes: 75, priceCents: 1400000 },
      { name: "Uñas esculpidas", emoji: "🌸", durationMinutes: 90, priceCents: 1800000 },
      { name: "Manos + pies", emoji: "🦶", durationMinutes: 90, priceCents: 1600000 },
    ],
  },
  {
    id: "estetica",
    label: "Estética",
    emoji: "✨",
    services: [
      { name: "Limpieza facial", emoji: "🧖", durationMinutes: 60, priceCents: 1500000 },
      { name: "Depilación", emoji: "🪮", durationMinutes: 45, priceCents: 1000000 },
      { name: "Lifting de pestañas", emoji: "👁️", durationMinutes: 60, priceCents: 1300000 },
      { name: "Perfilado de cejas", emoji: "🪶", durationMinutes: 30, priceCents: 600000 },
    ],
  },
  {
    id: "spa",
    label: "Spa / Masajes",
    emoji: "💆",
    services: [
      { name: "Masaje descontracturante", emoji: "💆", durationMinutes: 60, priceCents: 1800000 },
      { name: "Masaje relax", emoji: "🌿", durationMinutes: 60, priceCents: 1600000 },
      { name: "Drenaje linfático", emoji: "💧", durationMinutes: 60, priceCents: 1700000 },
    ],
  },
  {
    id: "tatuajes",
    label: "Tatuajes",
    emoji: "🎨",
    services: [
      { name: "Tattoo chico", emoji: "🖊️", durationMinutes: 60, priceCents: 2500000 },
      { name: "Sesión por hora", emoji: "⏱️", durationMinutes: 60, priceCents: 3500000 },
      { name: "Retoque", emoji: "🩹", durationMinutes: 45, priceCents: 1500000 },
    ],
  },
  {
    id: "salud",
    label: "Salud / Consultorio",
    emoji: "🩺",
    services: [
      { name: "Primera consulta", emoji: "🩺", durationMinutes: 45, priceCents: 2000000 },
      { name: "Consulta de control", emoji: "📋", durationMinutes: 30, priceCents: 1500000 },
      { name: "Sesión", emoji: "🫶", durationMinutes: 60, priceCents: 2500000 },
    ],
  },
  {
    id: "otro",
    label: "Otro",
    emoji: "🧲",
    services: [
      { name: "Servicio principal", emoji: "⭐", durationMinutes: 40, priceCents: 1000000 },
    ],
  },
];

export function businessTypeById(id?: string | null): BusinessType {
  return BUSINESS_TYPES.find((t) => t.id === id) ?? BUSINESS_TYPES[0]!;
}
