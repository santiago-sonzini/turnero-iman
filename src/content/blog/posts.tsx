import type { ReactNode } from "react";
import Link from "next/link";

// Registro de posts del blog. Cada post es data + un componente Body (JSX).
// Server-rendered: los buscadores leen el HTML completo. La FAQ de cada post
// alimenta tanto la sección visible como el JSON-LD (FAQPage) de la página.

export type BlogFaq = { q: string; a: string };

export type BlogPost = {
  slug: string;
  title: string;
  /** Título para <title>/OG; si falta se usa `title`. */
  seoTitle?: string;
  description: string;
  excerpt: string;
  /** ISO date de publicación. */
  date: string;
  /** ISO date de última edición. */
  updated?: string;
  author: string;
  tags: string[];
  keywords: string[];
  readingMinutes: number;
  emoji: string;
  faq?: BlogFaq[];
  Body: () => ReactNode;
};

const A = ({ href, children }: { href: string; children: ReactNode }) => (
  <Link href={href}>{children}</Link>
);

const POSTS: BlogPost[] = [
  {
    slug: "sistema-de-turnos-online-para-barberias-y-peluquerias",
    title: "Sistema de turnos online para barberías y peluquerías: la guía completa 2026",
    seoTitle: "Sistema de turnos online para barberías y peluquerías (Guía 2026)",
    description:
      "Cómo elegir e implementar un sistema de turnos online para tu barbería o peluquería en Argentina: página de reservas, recordatorios por WhatsApp, precios y errores a evitar.",
    excerpt:
      "Todo lo que necesitás para pasar de la libreta y el WhatsApp a mano a una agenda que se llena sola: qué mirar, cómo implementarlo en un día y cuánto cuesta.",
    date: "2026-06-18",
    updated: "2026-07-13",
    author: "Equipo Imán Turnos",
    tags: ["Turnos online", "Barberías", "Peluquerías"],
    keywords: [
      "sistema de turnos online",
      "turnos online para barberías",
      "software de turnos peluquería",
      "agenda online para peluquería",
      "sistema de reservas Argentina",
    ],
    readingMinutes: 7,
    emoji: "💈",
    faq: [
      { q: "¿Qué es un sistema de turnos online?", a: "Es una herramienta que le da a tu negocio una página de reservas propia. Tu cliente entra desde un link, elige servicio, día y horario, y confirma solo. La agenda se actualiza al instante y vos dejás de contestar mensajes uno por uno." },
      { q: "¿Necesito que mis clientes se descarguen una app?", a: "No. Un buen sistema funciona desde el navegador: el cliente abre tu link, reserva y listo. Sin cuenta, sin contraseña y sin instalar nada." },
      { q: "¿Cuánto cuesta un sistema de turnos en Argentina?", a: "Depende del producto. Imán Turnos arranca en $ 20.000 por mes, el plan Pro cuesta $ 35.000 y la opción personalizada para equipos de hasta 10 profesionales cuesta $ 60.000. En pesos y sin costo por turno." },
      { q: "¿Cuánto tardo en configurarlo?", a: "Menos de una tarde. Cargás el nombre del negocio, tus servicios con precio y duración, tus horarios de atención y tu color. En Imán Turnos el mínimo para publicar tu link son 3 minutos." },
    ],
    Body: () => (
      <>
        <p>
          Si tenés una barbería o una peluquería, seguro te pasó: estás con las manos en la
          cabeza de un cliente y el teléfono no para de sonar. Otro que quiere turno, otro que
          lo quiere cambiar, otro que pregunta el precio. Cada interrupción es un corte peor y
          un cliente que, si no le contestás en cinco minutos, se va a la competencia.
        </p>
        <p>
          Un <strong>sistema de turnos online</strong> resuelve exactamente eso. En esta guía te
          contamos qué es, qué mirar antes de elegir uno y cómo implementarlo en tu negocio sin
          volverte loco.
        </p>

        <h2>Qué es (y qué no es) un sistema de turnos online</h2>
        <p>
          Es una página de reservas propia de tu negocio. Tu cliente entra desde un link —el que
          ponés en la bio de Instagram o en tu estado de WhatsApp—, ve tus servicios, elige día y
          horario disponible y confirma. Vos no tocás nada: la agenda se llena sola.
        </p>
        <p>
          No es una app que tus clientes tengan que descargar. No es una planilla de Excel
          compartida. Y no es un grupo de WhatsApp donde todos ven los turnos de todos. Es tu
          agenda, con tu marca, funcionando las 24 horas.
        </p>

        <h2>Los 5 puntos que tenés que mirar antes de elegir</h2>
        <h3>1. Que tu cliente no tenga que crear cuenta</h3>
        <p>
          Cada paso extra es gente que abandona. El mejor sistema es el que deja reservar en tres
          toques: servicio, horario, confirmar. Sin registro, sin contraseña.
        </p>
        <h3>2. Recordatorios por WhatsApp</h3>
        <p>
          El WhatsApp es el canal donde tus clientes viven. Un recordatorio el día anterior baja
          las ausencias de forma dramática. Si el sistema te arma el mensaje listo para enviar,
          mejor todavía.
        </p>
        <h3>3. Que sea tuyo, no de la plataforma</h3>
        <p>
          Tu página tiene que tener tu nombre y tu color, no el logo de una empresa gigante que
          te mezcla con veinte barberías más. La marca es tuya.
        </p>
        <h3>4. Precios en pesos, sin sorpresas</h3>
        <p>
          Cuidado con los precios atados al dólar o con costos por turno que se comen tu margen.
          Buscá un precio fijo mensual que puedas calcular de memoria.
        </p>
        <h3>5. Que te muestre a quién le toca volver</h3>
        <p>
          Acá está la diferencia entre una agenda y una máquina de facturar. Los mejores sistemas
          te avisan qué cliente hace 30 días que no viene para que lo invites de vuelta.
          Justamente de eso hablamos en <A href="/blog/como-llenar-los-huecos-de-tu-agenda">cómo llenar los huecos de tu agenda</A>.
        </p>

        <h2>Cómo implementarlo en un día</h2>
        <ol>
          <li><strong>Cargá tus servicios</strong> con precio y duración real (un corte con barba no dura lo mismo que un corte solo).</li>
          <li><strong>Definí tus horarios</strong> de atención y tus días de descanso.</li>
          <li><strong>Elegí tu color</strong> y subí tu logo si tenés.</li>
          <li><strong>Compartí tu link</strong> en la bio de Instagram, tu estado de WhatsApp y donde te encuentren.</li>
        </ol>
        <p>
          Con <A href="/">Imán Turnos</A> el mínimo para publicar son 3 minutos. El resto lo vas
          ajustando con el negocio andando. Si querés el paso a paso completo, está todo en la{" "}
          <A href="/ayuda">guía de ayuda</A>.
        </p>

        <h2>El error más común: seguir tomando turnos a mano “por las dudas”</h2>
        <p>
          Muchos arrancan con el sistema pero siguen anotando algunos turnos en la libreta. Ahí
          empiezan los choques: dos personas para el mismo horario, huecos que en el papel no
          aparecen. Si vas a hacerlo, hacelo completo. Una sola agenda, la digital, es la que te
          saca el peso de encima.
        </p>

        <h2>En resumen</h2>
        <p>
          Un sistema de turnos online no es un lujo tecnológico: es la diferencia entre perseguir
          clientes y que los clientes te encuentren. Menos WhatsApp a mano, menos ausencias, más
          sillas ocupadas. Y todo empieza con un link.
        </p>
        <p>
          ¿Tenés barbería o peluquería y querés probarlo?{" "}
          <A href="/auth?modo=signup">Creá tu cuenta gratis</A> y publicá tu página de reservas hoy.
        </p>
      </>
    ),
  },

  {
    slug: "como-llenar-los-huecos-de-tu-agenda",
    title: "Cómo llenar los huecos de tu agenda (sin bajar los precios)",
    seoTitle: "Cómo llenar los huecos de tu agenda sin regalar tu trabajo",
    description:
      "Un hueco vacío es plata que no vuelve. Estrategias concretas para llenar los espacios libres de tu agenda con los clientes que ya tenés, sin malvender tu servicio.",
    excerpt:
      "Un turno cancelado a las seis deja la silla vacía toda la tarde. Te mostramos cómo llenar esos huecos con clientes que ya te conocen, sin rematar tu trabajo.",
    date: "2026-06-30",
    updated: "2026-07-13",
    author: "Equipo Imán Turnos",
    tags: ["Productividad", "Promos", "Clientes"],
    keywords: [
      "llenar huecos de la agenda",
      "huecos en la agenda barbería",
      "cómo llenar turnos vacíos",
      "promociones para negocios de servicios",
      "clientes recurrentes",
    ],
    readingMinutes: 6,
    emoji: "🕳️",
    faq: [
      { q: "¿Cómo lleno un hueco de última hora?", a: "El camino más rápido es avisarle a un cliente que ya te toca volver: alguien que suele venir cada 3 o 4 semanas y ya pasó ese tiempo. Un mensaje de WhatsApp con el horario concreto convierte muchísimo más que un posteo genérico." },
      { q: "¿Conviene bajar el precio para llenar un hueco?", a: "No siempre. Bajar el precio educa a tus clientes a esperar descuentos. Es mejor agregar valor (un lavado, un producto, un extra) con tiempo límite, así llenás el hueco sin tocar tu tarifa de lista." },
      { q: "¿Cada cuánto debería volver un cliente?", a: "Depende del servicio, pero un corte de pelo suele ser cada 3 a 4 semanas. Si medís el ritmo de cada cliente, sabés exactamente cuándo invitarlo antes de que se pierda." },
    ],
    Body: () => (
      <>
        <p>
          Hacé la cuenta un segundo. Un hueco de una hora en tu agenda, tres veces por semana, a
          precio de un corte promedio. En un mes es más que la suscripción de cualquier sistema
          de turnos. En un año, unas vacaciones. <strong>El hueco vacío no es un rato libre: es
          plata que no vuelve.</strong>
        </p>
        <p>
          La buena noticia: casi siempre se llena con clientes que ya tenés. Acá van las
          estrategias que mejor funcionan.
        </p>

        <h2>1. Empezá por los clientes que ya te toca volver</h2>
        <p>
          Tu mejor lista de contactos no está afuera: está en tu propia agenda. Alguien que se
          corta cada 3 semanas y hace 5 que no aparece es un cliente listo para volver, solo que
          se olvidó. Un mensaje corto —“¡Hola! Pasaron 30 días de tu corte, tengo lugar hoy a las
          18, ¿te lo agendo?”— convierte muchísimo más que cualquier promoción general.
        </p>
        <p>
          El truco es saber <em>a quién</em> escribirle. Por eso en{" "}
          <A href="/">Imán Turnos</A> cada cliente tiene un semáforo: verde si está al día, rojo
          si ya se le pasó el tiempo de volver. Mirás la lista, elegís y el mensaje ya viene
          escrito.
        </p>

        <h2>2. Colgale un incentivo al hueco, no un descuento</h2>
        <p>
          Bajar el precio para llenar un hueco tiene un costo oculto: le enseñás a tu clientela a
          esperar los descuentos. La próxima vez no pagan precio de lista, esperan tu oferta.
        </p>
        <p>
          En cambio, <strong>agregar valor con tiempo límite</strong> llena el hueco sin tocar tu
          tarifa: “Reservá este turno de las 18 en los próximos 30 minutos y el lavado va de
          regalo”. El cliente siente que ganó algo, y vos mantenés tu precio intacto. La urgencia
          hace el resto.
        </p>

        <h2>3. Tené tu link siempre a mano</h2>
        <p>
          Muchos huecos se llenan solos si la gente puede reservar en el momento en que se
          acuerda de vos —a las 11 de la noche, un domingo, cuando vos estás durmiendo. Un{" "}
          <A href="/blog/sistema-de-turnos-online-para-barberias-y-peluquerias">sistema de turnos online</A>{" "}
          con tu link en la bio de Instagram trabaja 24/7 sin que muevas un dedo.
        </p>

        <h2>4. Convertí cada cancelación en una oportunidad</h2>
        <p>
          La cancelación duele, pero abre un hueco <em>hoy</em>, que es cuando más fácil se llena.
          En vez de lamentarte, activá el plan: mirá a quién le toca volver, mandá el aviso con el
          horario que se liberó y observá la silla llenarse de nuevo. Si querés que te cancelen
          menos de entrada, leé{" "}
          <A href="/blog/como-reducir-cancelaciones-y-ausencias-de-turnos">cómo reducir cancelaciones y ausencias</A>.
        </p>

        <h2>5. Medí para no adivinar</h2>
        <p>
          ¿Cuáles son tus horarios muertos? ¿Los martes al mediodía? ¿Las últimas horas de la
          tarde? Cuando los tenés identificados, podés atacarlos con promos puntuales en vez de
          disparar al aire. Lo que se mide, se llena.
        </p>

        <h2>La idea de fondo</h2>
        <p>
          No necesitás más clientes nuevos para facturar más. Necesitás que los que ya tenés
          vuelvan a tiempo y que ningún hueco quede sin pelear. Esa es la diferencia entre una
          agenda que espera y una agenda que trabaja para vos.
        </p>
        <p>
          <A href="/auth?modo=signup">Probá Imán Turnos gratis</A> y mirá tu agenda llenarse
          hueco por hueco.
        </p>
      </>
    ),
  },

  {
    slug: "como-reducir-cancelaciones-y-ausencias-de-turnos",
    title: "Cómo reducir las cancelaciones y ausencias de turnos (no-show)",
    seoTitle: "Cómo reducir cancelaciones y ausencias de turnos (no-show)",
    description:
      "Los clientes que no aparecen te cuestan tiempo y plata. Tácticas simples para bajar el no-show en tu negocio de servicios: recordatorios, confirmación y política de cancelación.",
    excerpt:
      "El cliente que no viene ni avisa es el peor de todos: reservó tu tiempo y lo tiró a la basura. Estas tácticas bajan el no-show sin espantar a la clientela.",
    date: "2026-07-08",
    updated: "2026-07-13",
    author: "Equipo Imán Turnos",
    tags: ["Ausencias", "WhatsApp", "Retención"],
    keywords: [
      "reducir cancelaciones de turnos",
      "no-show",
      "clientes que no vienen",
      "recordatorios de turnos por WhatsApp",
      "política de cancelación",
    ],
    readingMinutes: 6,
    emoji: "👻",
    faq: [
      { q: "¿Qué es el no-show?", a: "Es cuando un cliente reserva un turno y no aparece ni avisa. Es la ausencia más costosa porque bloqueaste ese horario y no llegás a llenarlo con otra persona." },
      { q: "¿Los recordatorios por WhatsApp bajan las ausencias?", a: "Sí, y bastante. Un recordatorio el día anterior con opción de confirmar reduce las ausencias porque le da al cliente la chance de avisar con tiempo si no puede venir, dejándote el hueco libre para reasignar." },
      { q: "¿Conviene cobrar seña para evitar ausencias?", a: "La seña reduce el no-show porque el cliente ya puso plata. Pero también agrega fricción y puede espantar a clientes nuevos. Muchos negocios prefieren empezar con recordatorios y confirmación, y reservar la seña para horarios de alta demanda." },
    ],
    Body: () => (
      <>
        <p>
          Una cancelación con aviso te molesta, pero te deja tiempo para reaccionar. Una ausencia
          sin aviso —el famoso <strong>no-show</strong>— es distinta: reservaste tu tiempo, dijiste
          que no a otro cliente, y a la hora acordada no aparece nadie. Es la fuga más silenciosa
          de tu facturación.
        </p>
        <p>
          No se elimina del todo, pero se baja muchísimo con cuatro cosas simples.
        </p>

        <h2>1. Recordá el turno el día anterior</h2>
        <p>
          La mayoría de las ausencias no son mala fe: son olvidos. Un recordatorio por WhatsApp el
          día previo resuelve gran parte del problema. Y si además le das al cliente la opción de
          confirmar o avisar que no puede, ganás doble: el que no viene te libera el hueco con
          tiempo para reasignarlo.
        </p>
        <p>
          En <A href="/">Imán Turnos</A> el recordatorio ya viene armado. Tocás y se abre el
          WhatsApp con el mensaje escrito; vos solo apretás enviar.
        </p>

        <h2>2. Pedí una confirmación activa</h2>
        <p>
          No es lo mismo “te espero mañana a las 15” que “¿me confirmás tu turno de mañana a las
          15?”. La segunda obliga a responder. Un cliente que confirmó tiene muchas menos chances
          de faltar, porque ya se comprometió por escrito.
        </p>

        <h2>3. Facilitá la cancelación (sí, en serio)</h2>
        <p>
          Suena contraintuitivo, pero si al cliente le resulta fácil avisar que no viene, te avisa.
          Y un turno cancelado con horas de anticipación es un hueco que todavía podés llenar. El
          problema no es que cancelen: es que <em>no avisen</em>. Dales una salida cómoda y la van
          a usar.
        </p>

        <h2>4. Tené una política clara para los reincidentes</h2>
        <p>
          El 90% de tus clientes es impecable. El problema suele ser un grupo chico que falta una
          y otra vez. Para ellos podés reservar medidas más firmes: pedir seña, o priorizar a
          quienes sí cumplen en los horarios más demandados. La clave es aplicar la política solo
          donde hace falta, sin castigar a la mayoría que se porta bien.
        </p>

        <h2>Y cuando igual te falta alguien…</h2>
        <p>
          Va a pasar, es parte del oficio. La diferencia está en qué hacés con ese hueco. En vez
          de perderlo, activá el plan de recuperación: mirá a quién le toca volver y ofrecele el
          horario que quedó libre. Todo el método está en{" "}
          <A href="/blog/como-llenar-los-huecos-de-tu-agenda">cómo llenar los huecos de tu agenda</A>.
        </p>

        <h2>En síntesis</h2>
        <p>
          Recordá, pedí confirmación, facilitá el aviso y sé firme solo con los reincidentes. Con
          eso solo, la mayoría de los negocios baja sus ausencias a la mitad. Y cada ausencia
          evitada es una silla que factura.
        </p>
        <p>
          <A href="/auth?modo=signup">Empezá gratis con Imán Turnos</A> y mandá tu primer
          recordatorio hoy.
        </p>
      </>
    ),
  },
];

export function allPosts(): BlogPost[] {
  // Más nuevos primero (orden estable, sin depender de la fecha del sistema).
  return [...POSTS].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

export function getPost(slug: string): BlogPost | undefined {
  return POSTS.find((p) => p.slug === slug);
}

export function postSlugs(): string[] {
  return POSTS.map((p) => p.slug);
}
