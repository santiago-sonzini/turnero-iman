// Rubro DIETÉTICA: almacén natural / suelto. Recompra quincenal típica.
import type { RubroDef } from "../types";

const dietetica: RubroDef = {
  id: "dietetica",

  categorias: [
    { name: "Cereales y legumbres", slug: "cereales" },
    { name: "Frutos secos", slug: "frutos-secos" },
    { name: "Harinas y repostería", slug: "harinas" },
    { name: "Suplementos", slug: "suplementos" },
  ],

  productos: [
    ["Avena arrollada 1 kg", 2800, "cereales"],
    ["Granola con miel 500 g", 4200, "cereales"],
    ["Quinoa 500 g", 5600, "cereales"],
    ["Lentejas 1 kg", 2900, "cereales"],
    ["Garbanzos 1 kg", 3100, "cereales"],
    ["Arroz yamaní 1 kg", 3300, "cereales"],
    ["Mix frutos secos 500 g", 8900, "frutos-secos"],
    ["Almendras 250 g", 6800, "frutos-secos"],
    ["Nueces peladas 250 g", 5900, "frutos-secos"],
    ["Semillas de chía 250 g", 2400, "frutos-secos"],
    ["Pasas de uva 500 g", 3400, "frutos-secos"],
    ["Harina integral 1 kg", 1900, "harinas"],
    ["Harina de almendras 500 g", 9800, "harinas"],
    ["Cacao amargo 250 g", 4100, "harinas"],
    ["Stevia en polvo 200 g", 5200, "harinas"],
    ["Miel pura 500 g", 6300, "harinas"],
    ["Proteína vegetal 500 g", 18500, "suplementos"],
    ["Levadura nutricional 150 g", 7400, "suplementos"],
    ["Espirulina 100 comp.", 9200, "suplementos"],
    ["Colágeno hidrolizado 300 g", 15800, "suplementos"],
  ],

  negocio: {
    comercio: { name: "Dietética Naturalia", address: "Av. Cabildo 2210, CABA" },
    distribuidora: { name: "Distribuidora Natural del Sur", address: "Camino Gral. Belgrano 5300, Quilmes" },
  },

  clientesB2B: [
    { name: "Dietética La Semilla", phone: "5491155503001", cicloDias: 10, ticket: 95000, objetivo: "activo", categorias: ["cereales", "frutos-secos"] },
    { name: "Almacén Natural Vida Sana", phone: "5491155503002", email: "vidasana@gmail.com", cicloDias: 7, ticket: 130000, objetivo: "activo" },
    { name: "Herboristería El Jardín", phone: "5491155503003", cicloDias: 14, ticket: 60000, objetivo: "activo", categorias: ["suplementos"] },
    { name: "Dietética Sol y Trigo", phone: "5491155503004", cicloDias: 10, ticket: 88000, objetivo: "activo", categorias: ["harinas", "cereales"] },
    { name: "Mercado Verde", phone: "5491155503005", cicloDias: 5, ticket: 170000, objetivo: "activo" },
    { name: "Tienda Integral Namasté", phone: "5491155503006", cicloDias: 12, ticket: 72000, objetivo: "activo", categorias: ["frutos-secos"] },
    { name: "Dietética Los Girasoles", phone: "5491155503007", cicloDias: 9, ticket: 105000, objetivo: "riesgo" },
    { name: "Casa Naturista Aloe", phone: "5491155503008", email: "aloe@yahoo.com.ar", cicloDias: 12, ticket: 81000, objetivo: "riesgo", categorias: ["suplementos", "harinas"] },
    { name: "Dietética Manantial", phone: null, cicloDias: 10, ticket: 56000, objetivo: "riesgo", notas: "Sin teléfono cargado — pedirlo la próxima" },
    { name: "Almacén Orgánico Raíces", phone: "5491155503010", cicloDias: 14, ticket: 92000, objetivo: "dormido" },
    { name: "Dietética Brotes", phone: "5491155503011", cicloDias: 8, ticket: 47000, objetivo: "dormido", categorias: ["cereales"] },
    { name: "Vida Natural Store", phone: "5491155503012", cicloDias: 10, ticket: 78000, objetivo: "dormido" },
    { name: "Dietética El Molino", phone: "5491155503013", cicloDias: 9, ticket: 115000, objetivo: "perdido" },
    { name: "Naturista San Telmo", phone: "5491155503014", cicloDias: 12, ticket: 52000, objetivo: "perdido", categorias: ["frutos-secos"] },
    { name: "Dietética Nueva Era", phone: null, cicloDias: 14, ticket: 44000, objetivo: "perdido", notas: "Cambió de dueño, reconfirmar contacto" },
    { name: "Granel Urbano", phone: "5491155503016", cicloDias: 0, ticket: 38000, objetivo: "sin-compras", notas: "Cliente nuevo, una sola compra" },
    { name: "La Semilla Dietetica", phone: null, cicloDias: 0, ticket: 0, objetivo: "sin-compras", notas: "¿Duplicado de Dietética La Semilla?" },
  ],

  ticketPersona: 9500,
  cicloFactor: 1.5,

  plantillasExtra: [
    {
      name: "Reposición saludable",
      situation: "Recordar reposición de básicos de dietética",
      text: "Hola {nombre}! De {negocio} 🌱 Ya deben estar por terminarse tus básicos (avena, frutos secos, semillas). ¿Te armo el pedido de siempre y lo pasás a buscar?",
      isDefault: true,
    },
    {
      name: "Novedades sin TACC",
      situation: "Avisar novedades para celíacos",
      text: "Hola {nombre}! Llegaron productos sin TACC nuevos a {negocio}: {producto}. Si querés te reservo antes de que vuelen 😉",
      isDefault: true,
    },
  ],

  ofertas: [
    {
      name: "Semana de los frutos secos",
      description: "10% en toda la categoría frutos secos",
      discountValue: 10,
      scope: "CATEGORY",
      categorySlug: "frutos-secos",
      dias: 7,
    },
  ],

  supplierSlugs: [
    "demo-cereales-1",
    "demo-frutos-secos-7",
    "demo-harinas-12",
    "demo-suplementos-17",
    "demo-suplementos-20",
  ],
};

export default dietetica;
