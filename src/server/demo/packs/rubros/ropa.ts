// Rubro ROPA: indumentaria urbana. Ciclos de compra largos (estacionales).
import type { RubroDef } from "../types";

const ropa: RubroDef = {
  id: "ropa",

  categorias: [
    { name: "Remeras y camisas", slug: "remeras" },
    { name: "Pantalones", slug: "pantalones" },
    { name: "Abrigos", slug: "abrigos" },
    { name: "Accesorios", slug: "accesorios" },
  ],

  productos: [
    ["Remera lisa algodón", 12000, "remeras"],
    ["Remera estampada", 15500, "remeras"],
    ["Chomba piqué", 21000, "remeras"],
    ["Camisa manga larga", 28000, "remeras"],
    ["Camisa leñadora", 26500, "remeras"],
    ["Jean clásico recto", 45000, "pantalones"],
    ["Jean chupín elastizado", 48000, "pantalones"],
    ["Jogger de frisa", 27000, "pantalones"],
    ["Pantalón cargo", 39000, "pantalones"],
    ["Short deportivo", 16500, "pantalones"],
    ["Calza deportiva", 18000, "pantalones"],
    ["Buzo canguro frisa", 34000, "abrigos"],
    ["Sweater de hilo", 38000, "abrigos"],
    ["Campera inflable", 89000, "abrigos"],
    ["Campera de jean", 65000, "abrigos"],
    ["Medias soquete x3", 6500, "accesorios"],
    ["Gorra trucker", 14000, "accesorios"],
    ["Cinturón cuero", 19500, "accesorios"],
    ["Bufanda tejida", 12500, "accesorios"],
    ["Riñonera urbana", 22000, "accesorios"],
  ],

  negocio: {
    comercio: { name: "Tienda Aura", address: "Av. Avellaneda 3100, Flores" },
    distribuidora: { name: "Mayorista Textil Avellaneda", address: "Helguera 560, Flores" },
  },

  clientesB2B: [
    { name: "Boutique Alma", phone: "5491155504001", cicloDias: 21, ticket: 380000, objetivo: "activo", categorias: ["remeras", "accesorios"] },
    { name: "Tienda Urbana BA", phone: "5491155504002", email: "urbanaba@gmail.com", cicloDias: 14, ticket: 520000, objetivo: "activo" },
    { name: "Showroom Mica", phone: "5491155504003", cicloDias: 30, ticket: 260000, objetivo: "activo", categorias: ["remeras", "pantalones"] },
    { name: "Local Feria Once", phone: "5491155504004", cicloDias: 10, ticket: 640000, objetivo: "activo" },
    { name: "Ropería El Paso", phone: "5491155504005", cicloDias: 21, ticket: 310000, objetivo: "activo", categorias: ["abrigos"] },
    { name: "Tienda Nube Rosario", phone: "5491155504006", email: "ventas@nubeross.com", cicloDias: 30, ticket: 290000, objetivo: "activo" },
    { name: "Boutique Delia", phone: "5491155504007", cicloDias: 21, ticket: 240000, objetivo: "riesgo", categorias: ["remeras"] },
    { name: "Outlet Ruta 8", phone: "5491155504008", cicloDias: 30, ticket: 450000, objetivo: "riesgo" },
    { name: "Kiosco de Ropa Lanús", phone: null, cicloDias: 21, ticket: 180000, objetivo: "riesgo", notas: "Sin teléfono cargado — pedirlo la próxima" },
    { name: "Tienda Mimos", phone: "5491155504010", cicloDias: 30, ticket: 210000, objetivo: "dormido", categorias: ["accesorios"] },
    { name: "Boutique Sofi Moda", phone: "5491155504011", cicloDias: 21, ticket: 330000, objetivo: "dormido" },
    { name: "Feriante La Salada", phone: "5491155504012", cicloDias: 14, ticket: 560000, objetivo: "dormido" },
    { name: "Tienda Vintage Palermo", phone: "5491155504013", cicloDias: 30, ticket: 275000, objetivo: "perdido" },
    { name: "Boutique Roma", phone: "5491155504014", cicloDias: 21, ticket: 195000, objetivo: "perdido", categorias: ["abrigos", "remeras"] },
    { name: "Showroom Zona Norte", phone: null, cicloDias: 30, ticket: 230000, objetivo: "perdido", notas: "Cerró el local, ¿sigue vendiendo online?" },
    { name: "Tienda Nueva Génesis", phone: "5491155504016", cicloDias: 0, ticket: 150000, objetivo: "sin-compras", notas: "Cliente nuevo, una sola compra" },
    { name: "Alma Boutique", phone: null, cicloDias: 0, ticket: 0, objetivo: "sin-compras", notas: "¿Duplicado de Boutique Alma?" },
  ],

  ticketPersona: 42000,
  cicloFactor: 3,
  packMultiplo: 6,

  plantillasExtra: [
    {
      name: "Nueva colección",
      situation: "Avisar cuando entra colección nueva",
      text: "Hola {nombre}! Entró la colección nueva a {negocio} 🧥 {producto} en todos los talles. Vení a verla antes de que se corten los talles más pedidos.",
      isDefault: true,
    },
    {
      name: "Liquidación de temporada",
      situation: "Liquidar fin de temporada",
      text: "Hola {nombre}! {negocio} entró en liquidación de temporada: hasta 40% en {producto}. Te esperamos 😉",
      isDefault: true,
    },
  ],

  ofertas: [
    {
      name: "Abrigos -15%",
      description: "15% en toda la categoría abrigos",
      discountValue: 15,
      scope: "CATEGORY",
      categorySlug: "abrigos",
      dias: 10,
    },
  ],

  supplierSlugs: [
    "demo-remeras-1",
    "demo-pantalones-6",
    "demo-abrigos-12",
    "demo-abrigos-14",
    "demo-accesorios-17",
  ],
};

export default ropa;
