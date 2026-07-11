// Rubro ALMACÉN (default). La variante distribuidora conserva tal cual los
// datos históricos de "Distribuidora El Faro" (ex demo-data.ts); la minorista
// es el mismo catálogo en unidades para un almacén de barrio.
import type { RubroDef } from "../types";

const almacen: RubroDef = {
  id: "almacen",

  categorias: [
    { name: "Bebidas", slug: "bebidas" },
    { name: "Almacén", slug: "almacen" },
    { name: "Limpieza", slug: "limpieza" },
    { name: "Golosinas", slug: "golosinas" },
  ],

  // Minorista (unidad). MISMO ORDEN que la lista mayorista para que los slugs
  // (demo-<cat>-<n>) coincidan y las ofertas/pricelists sirvan en ambos tipos.
  productos: [
    ["Coca-Cola 2,25 L", 3400, "bebidas"],
    ["Cerveza Quilmes 1 L", 3700, "bebidas"],
    ["Agua mineral 2 L", 1700, "bebidas"],
    ["Fernet Branca 750 ml", 32000, "bebidas"],
    ["Vino tinto Toro 1 L", 3200, "bebidas"],
    ["Gaseosa naranja 2,25 L", 2500, "bebidas"],
    ["Energizante Speed 250 ml", 1300, "bebidas"],
    ["Azúcar Ledesma 1 kg", 1500, "almacen"],
    ["Harina 000 1 kg", 1050, "almacen"],
    ["Aceite girasol 1,5 L", 4800, "almacen"],
    ["Arroz largo fino 1 kg", 1750, "almacen"],
    ["Fideos guiseros 500 g", 1150, "almacen"],
    ["Yerba Playadito 1 kg", 7100, "almacen"],
    ["Puré de tomate 520 g", 990, "almacen"],
    ["Lavandina 2 L", 1500, "limpieza"],
    ["Detergente 750 ml", 1800, "limpieza"],
    ["Papel higiénico 4 rollos", 2600, "limpieza"],
    ["Jabón en polvo 800 g", 3000, "limpieza"],
    ["Alfajor triple", 850, "golosinas"],
    ["Caramelos surtidos bolsa 1 kg", 7200, "golosinas"],
  ],

  // Mayorista: la lista exacta de El Faro.
  productosMayorista: [
    ["Coca-Cola 2,25 L pack x8", 26400, "bebidas"],
    ["Cerveza Quilmes 1 L pack x6", 21600, "bebidas"],
    ["Agua mineral 2 L pack x6", 9800, "bebidas"],
    ["Fernet Branca 750 ml", 32000, "bebidas"],
    ["Vino tinto Toro 1 L pack x6", 18500, "bebidas"],
    ["Gaseosa naranja 2,25 L pack x8", 19200, "bebidas"],
    ["Energizante Speed 250 ml pack x24", 28800, "bebidas"],
    ["Azúcar Ledesma 1 kg pack x10", 14500, "almacen"],
    ["Harina 000 1 kg pack x10", 9900, "almacen"],
    ["Aceite girasol 1,5 L pack x6", 27600, "almacen"],
    ["Arroz largo fino 1 kg pack x10", 16800, "almacen"],
    ["Fideos guiseros 500 g pack x12", 13200, "almacen"],
    ["Yerba Playadito 1 kg pack x5", 34500, "almacen"],
    ["Puré de tomate 520 g pack x12", 11400, "almacen"],
    ["Lavandina 2 L pack x6", 8700, "limpieza"],
    ["Detergente 750 ml pack x12", 21000, "limpieza"],
    ["Papel higiénico 4 rollos pack x10", 25500, "limpieza"],
    ["Jabón en polvo 800 g pack x8", 23200, "limpieza"],
    ["Alfajor triple pack x24", 19700, "golosinas"],
    ["Caramelos surtidos bolsa 1 kg", 7200, "golosinas"],
  ],

  negocio: {
    comercio: { name: "Almacén El Faro", address: "Av. Rivadavia 12400, Ciudadela" },
    distribuidora: { name: "Distribuidora El Faro", address: "Av. Rivadavia 12400, Ciudadela" },
  },

  // Clientes B2B de la distribuidora (los históricos de El Faro).
  clientesB2B: [
    // ── Activos ──
    { name: "Kiosco La Esquina", phone: "5491155501001", cicloDias: 7, ticket: 65000, objetivo: "activo", categorias: ["bebidas", "golosinas"] },
    { name: "Almacén Don Cacho", phone: "5491155501002", email: "doncacho@gmail.com", cicloDias: 7, ticket: 110000, objetivo: "activo" },
    { name: "Súper Chino Familia Feliz", phone: "5491155501003", cicloDias: 4, ticket: 180000, objetivo: "activo" },
    { name: "Bar El Cruce", phone: "5491155501004", cicloDias: 10, ticket: 95000, objetivo: "activo", categorias: ["bebidas"] },
    { name: "Despensa Marta", phone: "5491155501005", cicloDias: 14, ticket: 52000, objetivo: "activo", categorias: ["almacen", "limpieza"] },
    { name: "Restaurante La Nona", phone: "5491155501006", email: "lanona@hotmail.com", cicloDias: 7, ticket: 140000, objetivo: "activo", categorias: ["almacen", "bebidas"] },
    { name: "Kiosco 24hs Central", phone: "5491155501007", cicloDias: 5, ticket: 70000, objetivo: "activo", categorias: ["bebidas", "golosinas"] },
    { name: "Autoservicio El Trébol", phone: "5491155501008", cicloDias: 10, ticket: 125000, objetivo: "activo" },
    { name: "Panadería San José", phone: "5491155501009", cicloDias: 14, ticket: 48000, objetivo: "activo", categorias: ["almacen"] },
    // ── En riesgo ──
    { name: "Almacén La Vecinal", phone: "5491155501010", cicloDias: 7, ticket: 88000, objetivo: "riesgo" },
    { name: "Kiosco Los Pibes", phone: "5491155501011", cicloDias: 10, ticket: 43000, objetivo: "riesgo", categorias: ["golosinas", "bebidas"] },
    { name: "Bar Avenida", phone: "5491155501012", cicloDias: 14, ticket: 76000, objetivo: "riesgo", categorias: ["bebidas"] },
    { name: "Despensa El Hornero", phone: "5491155501013", cicloDias: 15, ticket: 58000, objetivo: "riesgo" },
    { name: "Súper El Ahorro", phone: "5491155501014", email: "elahorro@yahoo.com.ar", cicloDias: 7, ticket: 150000, objetivo: "riesgo" },
    { name: "Rotisería Lo de Pepe", phone: null, cicloDias: 10, ticket: 62000, objetivo: "riesgo", notas: "Sin teléfono cargado — pedirlo la próxima" },
    // ── Dormidos ──
    { name: "Almacén Barrio Chacabuco", phone: "5491155501016", cicloDias: 10, ticket: 71000, objetivo: "dormido" },
    { name: "Kiosco Estación", phone: "5491155501017", cicloDias: 7, ticket: 39000, objetivo: "dormido", categorias: ["golosinas", "bebidas"] },
    { name: "Despensa Doña Rosa", phone: "5491155501018", cicloDias: 14, ticket: 55000, objetivo: "dormido", categorias: ["almacen", "limpieza"] },
    { name: "Bar La Terminal", phone: "5491155501019", cicloDias: 12, ticket: 83000, objetivo: "dormido", categorias: ["bebidas"] },
    { name: "Autoservicio Norte", phone: "5491155501020", cicloDias: 9, ticket: 105000, objetivo: "dormido" },
    // ── Perdidos ──
    { name: "Súper Del Parque", phone: "5491155501021", cicloDias: 7, ticket: 130000, objetivo: "perdido" },
    { name: "Kiosco El Faro Azul", phone: "5491155501022", cicloDias: 10, ticket: 41000, objetivo: "perdido", categorias: ["golosinas"] },
    { name: "Almacén 3 Hermanos", phone: "5491155501023", cicloDias: 14, ticket: 67000, objetivo: "perdido" },
    { name: "Despensa La Económica", phone: null, cicloDias: 12, ticket: 46000, objetivo: "perdido", notas: "Se mudó de local, conseguir teléfono nuevo" },
    { name: "Bar Sin Nombre", phone: "5491155501025", cicloDias: 15, ticket: 59000, objetivo: "perdido", categorias: ["bebidas"] },
    // ── Casos borde ──
    { name: "Kiosco El Nuevo", phone: "5491155501026", cicloDias: 0, ticket: 35000, objetivo: "sin-compras", notas: "Cliente nuevo, una sola compra" },
    { name: "Almacen Don Cacho SRL", phone: null, cicloDias: 0, ticket: 0, objetivo: "sin-compras", notas: "¿Duplicado de Almacén Don Cacho?" },
    { name: "La Vecinal Almacén", phone: "5491155501028", cicloDias: 0, ticket: 0, objetivo: "sin-compras" },
  ],

  ticketPersona: 12000,

  plantillasExtra: [
    {
      name: "Promo 2x1",
      situation: "Ofertas 2x1 con flyer",
      text: "Hola {nombre}! {negocio} te trae un 2x1 en {producto} 🎉 Llevás dos y pagás uno. Hasta agotar stock — avisame y te lo reservo.",
      imageUrl: "/demo/promo-2x1.svg",
      isDefault: true,
    },
  ],

  ofertas: [
    {
      name: "Promo Fernet + Coca",
      description: "10% en Fernet Branca y Coca-Cola",
      discountValue: 10,
      scope: "PRODUCTS",
      productSlugs: ["demo-bebidas-1", "demo-bebidas-4"],
      dias: 14,
    },
    {
      name: "Semana de Limpieza",
      description: "8% en toda la categoría limpieza",
      discountValue: 8,
      scope: "CATEGORY",
      categorySlug: "limpieza",
      dias: 7,
    },
  ],

  contactos: {
    distribuidora: [
      {
        clienteNombre: "Almacén Barrio Chacabuco",
        plantilla: "Reactivación",
        statusAtSend: "dormido",
        haceDias: 20,
        mensaje: "Hola! Te escribo de Distribuidora El Faro. Hace 28 días que no nos hacés un pedido y no queríamos que te quedes sin nada 😊 ¿Te armo el pedido de siempre?",
      },
      {
        clienteNombre: "Bar Avenida",
        plantilla: "Oferta por categoría",
        statusAtSend: "riesgo",
        haceDias: 4,
        mensaje: "Hola! Te habla Distribuidora El Faro. Esta semana tenemos precios especiales en bebidas. Si querés te paso la lista completa 👌",
      },
      {
        clienteNombre: "Súper Del Parque",
        plantilla: "Reactivación",
        statusAtSend: "perdido",
        haceDias: 40,
        mensaje: "Hola! Te escribo de Distribuidora El Faro. Hace bastante que no nos pedís nada, ¿está todo bien? Tenemos precios nuevos que te pueden servir.",
      },
    ],
    comercio: [
      {
        clienteNombre: "Héctor Molina",
        plantilla: "Reactivación",
        statusAtSend: "dormido",
        haceDias: 20,
        mensaje: "Hola Héctor! Te escribo de Almacén El Faro. Hace un montón que no pasás por el barrio 😊 ¿Te armo el pedido de siempre y te lo dejo listo?",
      },
      {
        clienteNombre: "Gustavo Ponce",
        plantilla: "Oferta por categoría",
        statusAtSend: "riesgo",
        haceDias: 4,
        mensaje: "Hola Gustavo! Esta semana tenemos precios especiales en almacén. Si querés te paso la lista y te lo dejo preparado 👌",
      },
    ],
  },

  ventaRecupero: {
    distribuidora: {
      clienteNombre: "Almacén Barrio Chacabuco",
      haceDias: 12,
      items: [
        { productoIdx: 0, cantidad: 2 },
        { productoIdx: 7, cantidad: 3 },
        { productoIdx: 15, cantidad: 2 },
      ],
    },
    comercio: {
      clienteNombre: "Héctor Molina",
      haceDias: 12,
      items: [
        { productoIdx: 0, cantidad: 2 },
        { productoIdx: 7, cantidad: 2 },
        { productoIdx: 12, cantidad: 1 },
      ],
    },
  },

  supplierSlugs: [
    "demo-bebidas-1",
    "demo-bebidas-2",
    "demo-bebidas-4",
    "demo-almacen-10",
    "demo-almacen-13",
  ],
};

export default almacen;
