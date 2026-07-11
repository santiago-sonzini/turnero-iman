// Rubro PETSHOP: alimento y accesorios para mascotas. Ciclos de recompra muy
// marcados (la bolsa de alimento dura ~30 días) — ideal para el semáforo.
import type { RubroDef } from "../types";

const petshop: RubroDef = {
  id: "petshop",

  categorias: [
    { name: "Perros", slug: "perros" },
    { name: "Gatos", slug: "gatos" },
    { name: "Accesorios", slug: "accesorios" },
    { name: "Higiene", slug: "higiene" },
  ],

  productos: [
    ["Alimento perro adulto 15 kg", 52000, "perros"],
    ["Alimento perro adulto 3 kg", 14500, "perros"],
    ["Alimento cachorro 3 kg", 16800, "perros"],
    ["Snacks dentales perro x7", 4900, "perros"],
    ["Hueso de carnaza grande", 3800, "perros"],
    ["Alimento gato adulto 7,5 kg", 38000, "gatos"],
    ["Alimento gato adulto 1,5 kg", 9800, "gatos"],
    ["Alimento gato castrado 1,5 kg", 11200, "gatos"],
    ["Snacks gato x3", 3600, "gatos"],
    ["Piedras sanitarias 4 kg", 5400, "gatos"],
    ["Arena aglomerante 8 kg", 12800, "gatos"],
    ["Correa de paseo reforzada", 9500, "accesorios"],
    ["Collar con dije", 5200, "accesorios"],
    ["Comedero doble acero", 8900, "accesorios"],
    ["Cucha mediana", 42000, "accesorios"],
    ["Rascador para gatos", 28000, "accesorios"],
    ["Juguete pelota resistente", 4300, "accesorios"],
    ["Shampoo para perros 500 ml", 5600, "higiene"],
    ["Pipeta antipulgas perro", 8700, "higiene"],
    ["Toallitas húmedas mascota x50", 3900, "higiene"],
  ],

  negocio: {
    comercio: { name: "Pet Shop Huellitas", address: "Av. Gaona 3220, Ramos Mejía" },
    distribuidora: { name: "Distribuidora Mascotera Sur", address: "Av. Calchaquí 3900, Quilmes" },
  },

  clientesB2B: [
    { name: "Veterinaria San Roque", phone: "5491155506001", cicloDias: 10, ticket: 240000, objetivo: "activo", categorias: ["perros", "higiene"] },
    { name: "Pet Shop Colitas", phone: "5491155506002", email: "colitas@gmail.com", cicloDias: 7, ticket: 310000, objetivo: "activo" },
    { name: "Forrajería El Galpón", phone: "5491155506003", cicloDias: 7, ticket: 380000, objetivo: "activo", categorias: ["perros", "gatos"] },
    { name: "Veterinaria Patitas Felices", phone: "5491155506004", cicloDias: 14, ticket: 150000, objetivo: "activo", categorias: ["higiene"] },
    { name: "Pet House Morón", phone: "5491155506005", cicloDias: 10, ticket: 205000, objetivo: "activo" },
    { name: "Mundo Animal Haedo", phone: "5491155506006", cicloDias: 12, ticket: 175000, objetivo: "activo", categorias: ["accesorios", "perros"] },
    { name: "Forrajería Don Bigote", phone: "5491155506007", cicloDias: 10, ticket: 260000, objetivo: "riesgo" },
    { name: "Veterinaria del Parque", phone: "5491155506008", email: "vetparque@yahoo.com.ar", cicloDias: 14, ticket: 130000, objetivo: "riesgo", categorias: ["gatos", "higiene"] },
    { name: "Pet Shop Kira", phone: null, cicloDias: 10, ticket: 98000, objetivo: "riesgo", notas: "Sin teléfono cargado — pedirlo la próxima" },
    { name: "Forrajería La Tranquera", phone: "5491155506010", cicloDias: 9, ticket: 290000, objetivo: "dormido" },
    { name: "Veterinaria Zoonosis Oeste", phone: "5491155506011", cicloDias: 14, ticket: 120000, objetivo: "dormido", categorias: ["higiene"] },
    { name: "Pet Shop Firulais", phone: "5491155506012", cicloDias: 10, ticket: 160000, objetivo: "dormido", categorias: ["perros", "accesorios"] },
    { name: "Mundo Mascota Liniers", phone: "5491155506013", cicloDias: 8, ticket: 220000, objetivo: "perdido" },
    { name: "Veterinaria San Cayetano", phone: "5491155506014", cicloDias: 14, ticket: 105000, objetivo: "perdido", categorias: ["gatos"] },
    { name: "Forrajería El Rodeo", phone: null, cicloDias: 12, ticket: 140000, objetivo: "perdido", notas: "Se mudó de local, conseguir teléfono nuevo" },
    { name: "Pet Shop Manchas", phone: "5491155506016", cicloDias: 0, ticket: 90000, objetivo: "sin-compras", notas: "Cliente nuevo, una sola compra" },
    { name: "Colitas Pet Shop", phone: null, cicloDias: 0, ticket: 0, objetivo: "sin-compras", notas: "¿Duplicado de Pet Shop Colitas?" },
  ],

  ticketPersona: 22000,
  cicloFactor: 3,
  packMultiplo: 4,

  plantillasExtra: [
    {
      name: "Recordatorio de alimento",
      situation: "La bolsa de alimento se está terminando",
      text: "Hola {nombre}! De {negocio} 🐶 Por las fechas, el alimento debe estar terminándose. ¿Te reservo la bolsa de siempre así no se queda sin comer?",
      isDefault: true,
    },
    {
      name: "Pipeta mensual",
      situation: "Recordatorio de antipulgas mensual",
      text: "Hola {nombre}! Ya pasó un mes de la última pipeta 🐾 Tenemos {producto} a {precio}. ¿Te la aparto? {negocio}",
      isDefault: true,
    },
  ],

  ofertas: [
    {
      name: "Mes del gato",
      description: "10% en toda la categoría gatos",
      discountValue: 10,
      scope: "CATEGORY",
      categorySlug: "gatos",
      dias: 14,
    },
  ],

  supplierSlugs: [
    "demo-perros-1",
    "demo-perros-3",
    "demo-gatos-6",
    "demo-gatos-11",
    "demo-higiene-19",
  ],
};

export default petshop;
