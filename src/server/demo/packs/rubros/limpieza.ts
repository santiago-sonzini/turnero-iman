// Rubro LIMPIEZA: artículos de limpieza e higiene. Reposición frecuente.
import type { RubroDef } from "../types";

const limpieza: RubroDef = {
  id: "limpieza",

  categorias: [
    { name: "Lavado", slug: "lavado" },
    { name: "Hogar", slug: "hogar" },
    { name: "Papelería", slug: "papeles" },
    { name: "Químicos", slug: "quimicos" },
  ],

  productos: [
    ["Jabón líquido ropa 3 L", 6800, "lavado"],
    ["Jabón en polvo 800 g", 3000, "lavado"],
    ["Suavizante 900 ml", 2400, "lavado"],
    ["Quitamanchas 500 ml", 3900, "lavado"],
    ["Detergente concentrado 750 ml", 1800, "hogar"],
    ["Limpiavidrios gatillo 500 ml", 2600, "hogar"],
    ["Desengrasante cocina 500 ml", 3100, "hogar"],
    ["Lustramuebles 360 ml", 2900, "hogar"],
    ["Esponja multiuso x3", 1500, "hogar"],
    ["Trapo de piso microfibra", 2200, "hogar"],
    ["Escoba + secador combo", 8900, "hogar"],
    ["Papel higiénico 4 rollos", 2600, "papeles"],
    ["Rollo de cocina x3", 3300, "papeles"],
    ["Servilletas x200", 1900, "papeles"],
    ["Bolsas residuo 50x70 x30", 2700, "papeles"],
    ["Lavandina 2 L", 1500, "quimicos"],
    ["Alcohol etílico 500 ml", 2100, "quimicos"],
    ["Insecticida aerosol", 4300, "quimicos"],
    ["Desodorante de ambiente", 3200, "quimicos"],
    ["Cloro gel 1 L", 2500, "quimicos"],
  ],

  negocio: {
    comercio: { name: "Casa Limpia", address: "Av. San Martín 4520, Caseros" },
    distribuidora: { name: "Distribuidora Higiene Total", address: "Ruta 8 km 22, Loma Hermosa" },
  },

  clientesB2B: [
    { name: "Consorcio Edificio Mitre 1420", phone: "5491155505001", cicloDias: 14, ticket: 120000, objetivo: "activo", categorias: ["quimicos", "papeles"] },
    { name: "Lavadero El Trébol", phone: "5491155505002", cicloDias: 7, ticket: 85000, objetivo: "activo", categorias: ["lavado"] },
    { name: "Hotel Los Tilos", phone: "5491155505003", email: "compras@lostilos.com", cicloDias: 7, ticket: 210000, objetivo: "activo" },
    { name: "Clínica Santa Ana", phone: "5491155505004", cicloDias: 10, ticket: 175000, objetivo: "activo", categorias: ["quimicos"] },
    { name: "Ferretería Industrial Oeste", phone: "5491155505005", cicloDias: 14, ticket: 95000, objetivo: "activo" },
    { name: "Empresa de Limpieza Brillante SRL", phone: "5491155505006", cicloDias: 7, ticket: 260000, objetivo: "activo" },
    { name: "Restaurante Don Emilio", phone: "5491155505007", cicloDias: 10, ticket: 68000, objetivo: "riesgo", categorias: ["hogar", "papeles"] },
    { name: "Consorcio Torre Libertad", phone: "5491155505008", cicloDias: 14, ticket: 110000, objetivo: "riesgo" },
    { name: "Gimnasio Energym", phone: null, cicloDias: 12, ticket: 54000, objetivo: "riesgo", notas: "Sin teléfono cargado — pedirlo la próxima" },
    { name: "Colegio San Andrés", phone: "5491155505010", cicloDias: 20, ticket: 190000, objetivo: "dormido" },
    { name: "Lavadero Burbujas", phone: "5491155505011", cicloDias: 8, ticket: 62000, objetivo: "dormido", categorias: ["lavado"] },
    { name: "Panadería La Espiga", phone: "5491155505012", cicloDias: 12, ticket: 48000, objetivo: "dormido" },
    { name: "Hotel Plaza Oeste", phone: "5491155505013", cicloDias: 7, ticket: 230000, objetivo: "perdido" },
    { name: "Consorcio Alsina 950", phone: "5491155505014", cicloDias: 14, ticket: 89000, objetivo: "perdido", categorias: ["papeles", "quimicos"] },
    { name: "Oficinas Centro Cívico", phone: null, cicloDias: 15, ticket: 76000, objetivo: "perdido", notas: "Cambió la administración, reconfirmar" },
    { name: "Jardín Arcoíris", phone: "5491155505016", cicloDias: 0, ticket: 42000, objetivo: "sin-compras", notas: "Cliente nuevo, una sola compra" },
    { name: "El Trebol Lavadero", phone: null, cicloDias: 0, ticket: 0, objetivo: "sin-compras", notas: "¿Duplicado de Lavadero El Trébol?" },
  ],

  ticketPersona: 8500,
  cicloFactor: 1.5,

  plantillasExtra: [
    {
      name: "Combo del mes",
      situation: "Ofrecer el combo de limpieza mensual",
      text: "Hola {nombre}! {negocio} armó el combo del mes: {producto} a {precio}. Lo dejás pedido hoy y te lo llevamos esta semana 🧼",
      isDefault: true,
    },
    {
      name: "Reposición programada",
      situation: "Clientes con consumo regular",
      text: "Hola {nombre}! Según tus últimos pedidos ya te estarías quedando sin insumos de limpieza. ¿Repetimos el pedido anterior? {negocio}",
      isDefault: true,
    },
  ],

  ofertas: [
    {
      name: "Semana del lavado",
      description: "12% en toda la categoría lavado",
      discountValue: 12,
      scope: "CATEGORY",
      categorySlug: "lavado",
      dias: 7,
    },
  ],

  supplierSlugs: [
    "demo-lavado-1",
    "demo-hogar-5",
    "demo-papeles-12",
    "demo-quimicos-16",
    "demo-quimicos-18",
  ],
};

export default limpieza;
