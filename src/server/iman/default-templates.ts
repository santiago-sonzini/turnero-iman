// Plantillas de WhatsApp por defecto. Se cargan en CUALQUIER deploy (real o
// demo) la primera vez que no hay ninguna, para que Promos no arranque vacío.
// El seed demo las reusa y le suma una con flyer (Promo 2x1).

export interface PlantillaSeed {
  name: string;
  situation: string;
  text: string;
  imageUrl?: string;
  isDefault?: boolean;
}

export const DEFAULT_PLANTILLAS: PlantillaSeed[] = [
  {
    name: "Reactivación",
    situation: "Para clientes dormidos o perdidos",
    text: "Hola {nombre}! Te escribo de {negocio}. Hace {dias} días que no nos hacés un pedido y no queríamos que te quedes sin nada 😊 ¿Te armo el pedido de siempre? Cualquier cosa me decís y te lo dejo listo.",
    isDefault: true,
  },
  {
    name: "Promo para mejores clientes",
    situation: "Para premiar a los que más compran",
    text: "Hola {nombre}! De {negocio} te saludamos. Por ser de nuestros mejores clientes te guardamos una promo exclusiva: {producto} a {precio}. Avisame si te lo sumo al próximo pedido 💪",
    isDefault: true,
  },
  {
    name: "Oferta por categoría",
    situation: "Para ofrecer un rubro puntual (ej: bebidas)",
    text: "Hola {nombre}! Te habla {negocio}. Esta semana tenemos precios especiales en {producto}. Si querés te paso la lista completa y armamos el pedido 👌",
    isDefault: true,
  },
  {
    name: "Producto nuevo",
    situation: "Para avisar que entró mercadería nueva",
    text: "Hola {nombre}! De {negocio} te contamos que nos entró {producto} a {precio}. Pensamos que te puede servir para el local. ¿Te reservo unas unidades?",
    isDefault: true,
  },
  {
    name: "Seguimiento",
    situation: "Después de una entrega",
    text: "Hola {nombre}! De {negocio} te saludamos. ¿Llegó todo bien con el último pedido? Cualquier cosa que falte o haya que cambiar, avisanos por acá y lo resolvemos.",
    isDefault: true,
  },
];
