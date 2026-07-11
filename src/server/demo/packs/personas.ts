// Pool compartido de consumidores finales para las variantes COMERCIO de
// todos los rubros. Mismo mix de objetivos que la demo original de El Faro
// (9 activos / 6 en riesgo / 5 dormidos / 5 perdidos / 3 casos borde) para que
// el semáforo siempre muestre una foto realista. El ticket se escala por rubro
// (ticketPersona × factor) y el sesgo de categorías se asigna al armar el pack.
import type { Objetivo, PerfilCliente } from "./types";

interface Persona {
  name: string;
  phone: string | null;
  email?: string;
  cicloDias: number;
  /** Multiplica el ticketPersona del rubro. */
  factor: number;
  objetivo: Objetivo;
  /** Índices de categorías preferidas (se mapean a las del rubro). */
  catPref?: number[];
  notas?: string;
}

const PERSONAS: Persona[] = [
  // ── Activos ──
  { name: "María López", phone: "5491155502001", email: "maria.lopez@gmail.com", cicloDias: 7, factor: 1.0, objetivo: "activo", catPref: [0] },
  { name: "Jorge Fernández", phone: "5491155502002", cicloDias: 10, factor: 1.4, objetivo: "activo" },
  { name: "Camila Torres", phone: "5491155502003", cicloDias: 5, factor: 0.8, objetivo: "activo", catPref: [1] },
  { name: "Rubén Sosa", phone: "5491155502004", cicloDias: 14, factor: 1.2, objetivo: "activo", catPref: [0, 2] },
  { name: "Patricia Giménez", phone: "5491155502005", email: "patogimenez@hotmail.com", cicloDias: 7, factor: 1.1, objetivo: "activo" },
  { name: "Lucas Medina", phone: "5491155502006", cicloDias: 9, factor: 0.9, objetivo: "activo", catPref: [2] },
  { name: "Silvia Cabrera", phone: "5491155502007", cicloDias: 12, factor: 1.3, objetivo: "activo", catPref: [1, 3] },
  { name: "Diego Paredes", phone: "5491155502008", cicloDias: 6, factor: 0.7, objetivo: "activo" },
  { name: "Norma Aguirre", phone: "5491155502009", cicloDias: 15, factor: 1.5, objetivo: "activo", catPref: [3] },

  // ── En riesgo ──
  { name: "Federico Ramos", phone: "5491155502010", cicloDias: 7, factor: 1.1, objetivo: "riesgo" },
  { name: "Analía Vega", phone: "5491155502011", email: "anivega@yahoo.com.ar", cicloDias: 10, factor: 0.9, objetivo: "riesgo", catPref: [0] },
  { name: "Marcos Herrera", phone: "5491155502012", cicloDias: 14, factor: 1.2, objetivo: "riesgo", catPref: [2] },
  { name: "Verónica Salas", phone: "5491155502013", cicloDias: 15, factor: 0.8, objetivo: "riesgo" },
  { name: "Gustavo Ponce", phone: "5491155502014", cicloDias: 8, factor: 1.6, objetivo: "riesgo", catPref: [1] },
  { name: "Elena Márquez", phone: null, cicloDias: 10, factor: 0.9, objetivo: "riesgo", notas: "Sin teléfono cargado — pedirlo la próxima" },

  // ── Dormidos ──
  { name: "Oscar Benítez", phone: "5491155502016", cicloDias: 10, factor: 1.0, objetivo: "dormido" },
  { name: "Carla Ríos", phone: "5491155502017", cicloDias: 7, factor: 0.7, objetivo: "dormido", catPref: [3] },
  { name: "Héctor Molina", phone: "5491155502018", cicloDias: 14, factor: 0.9, objetivo: "dormido", catPref: [0, 1] },
  { name: "Sandra Ojeda", phone: "5491155502019", cicloDias: 12, factor: 1.2, objetivo: "dormido", catPref: [2] },
  { name: "Pablo Quiroga", phone: "5491155502020", cicloDias: 9, factor: 1.4, objetivo: "dormido" },

  // ── Perdidos ──
  { name: "Graciela Núñez", phone: "5491155502021", cicloDias: 7, factor: 1.5, objetivo: "perdido" },
  { name: "Martín Ledesma", phone: "5491155502022", cicloDias: 10, factor: 0.7, objetivo: "perdido", catPref: [1] },
  { name: "Rosa Palacios", phone: "5491155502023", cicloDias: 14, factor: 1.0, objetivo: "perdido" },
  { name: "Iván Correa", phone: null, cicloDias: 12, factor: 0.8, objetivo: "perdido", notas: "Se mudó de barrio, conseguir teléfono nuevo" },
  { name: "Liliana Duarte", phone: "5491155502025", cicloDias: 15, factor: 0.9, objetivo: "perdido", catPref: [0] },

  // ── Casos borde ──
  { name: "Tomás Ibáñez", phone: "5491155502026", cicloDias: 0, factor: 0.6, objetivo: "sin-compras", notas: "Cliente nuevo, una sola compra" },
  { name: "Maria Lopez", phone: null, cicloDias: 0, factor: 0, objetivo: "sin-compras", notas: "¿Duplicado de María López?" },
  { name: "Fernandez Jorge", phone: "5491155502028", cicloDias: 0, factor: 0, objetivo: "sin-compras" },
];

/**
 * Convierte el pool de personas en PerfilCliente para un rubro concreto:
 * escala el ticket y mapea las preferencias a los slugs de categoría del pack.
 */
export function personasParaRubro(
  ticketPersona: number,
  categoriaSlugs: string[],
  cicloFactor = 1,
): PerfilCliente[] {
  return PERSONAS.map((p) => ({
    name: p.name,
    phone: p.phone,
    email: p.email,
    cicloDias: Math.round(p.cicloDias * cicloFactor),
    ticket: Math.round((ticketPersona * p.factor) / 100) * 100,
    objetivo: p.objetivo,
    categorias: p.catPref
      ?.map((i) => categoriaSlugs[i % categoriaSlugs.length]!)
      .filter(Boolean),
    notas: p.notas,
  }));
}
