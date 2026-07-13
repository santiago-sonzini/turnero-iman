// Configuración central de SEO: identidad de marca, datos compartidos y
// generadores de JSON-LD (Schema.org). Es un módulo PURO (sin imports de
// servidor/DB) para poder usarse tanto en Server como en Client Components.
import { env } from "@/env";

export const SITE = {
  name: "Imán Turnos",
  shortName: "Imán",
  url: (env.NEXT_PUBLIC_APP_URL ?? "https://turnero.iman.ar").replace(/\/$/, ""),
  tagline: "Tu agenda, sin huecos",
  description:
    "Sistema de turnos online para barberías, peluquerías, estética, uñas y consultorios. Página de reservas con tu marca, recordatorios por WhatsApp y clientes que vuelven.",
  locale: "es_AR",
  lang: "es-AR",
  whatsapp: "https://wa.me/5493534797679",
  instagram: "https://instagram.com/iman.software",
  brandColor: "#E94F37",
  keywords: [
    "turnos online",
    "sistema de turnos",
    "agenda online",
    "reservas online",
    "software de turnos para barberías",
    "sistema de reservas para peluquerías",
    "agenda para estética",
    "turnos por WhatsApp",
    "app de turnos Argentina",
    "gestión de citas",
    "reducir cancelaciones de turnos",
    "página de reservas",
  ],
} as const;

export function abs(path = "/"): string {
  return `${SITE.url}${path.startsWith("/") ? path : `/${path}`}`;
}

/** FAQ compartida entre la landing y el JSON-LD (FAQPage) para no duplicar. */
export const LANDING_FAQ: ReadonlyArray<{ q: string; a: string }> = [
  { q: "¿Cuánto sale?", a: "Turnos cuesta $ 15.000 por mes y Turnos Pro $ 30.000. En pesos, sin costo por turno ni sorpresas en dólares." },
  { q: "¿Mis clientes tienen que bajarse una app?", a: "No. Entran a tu link, eligen horario y confirman. Sin cuenta, app ni contraseña." },
  { q: "¿Qué pasa con mis datos y mis clientes?", a: "Son tuyos, están separados por negocio y solo usamos proveedores necesarios para operar autenticación, base de datos, pagos, email y mensajería." },
  { q: "¿Cuánto tarda armarlo?", a: "Menos de 3 minutos: nombre, primer servicio y color. Después ajustás horarios y compartís tu link." },
  { q: "¿Cómo funciona WhatsApp?", a: "Imán te arma el mensaje listo y abre WhatsApp con el link wa.me: tocás y se abre el chat con el texto escrito para confirmar, recordar o llenar un hueco. Vos apretás enviar." },
  { q: "¿Cobran señas?", a: "Todavía no. La interfaz y los campos están preparados, pero las señas permanecen desactivadas hasta su lanzamiento." },
];

type Json = Record<string, unknown>;

/** Nodo Organization: identidad de la empresa detrás del producto. */
export function organizationLd(): Json {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE.url}/#organization`,
    name: SITE.name,
    url: SITE.url,
    logo: abs("/icon.svg"),
    description: SITE.description,
    foundingLocation: { "@type": "Place", name: "Córdoba, Argentina" },
    areaServed: { "@type": "Country", name: "Argentina" },
    sameAs: [SITE.instagram],
  };
}

/** Nodo WebSite con SearchAction (potencial sitelinks searchbox). */
export function websiteLd(): Json {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE.url}/#website`,
    name: SITE.name,
    url: SITE.url,
    inLanguage: SITE.lang,
    publisher: { "@id": `${SITE.url}/#organization` },
  };
}

/** SoftwareApplication: describe al producto como app SaaS con precio. */
export function softwareApplicationLd(): Json {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "@id": `${SITE.url}/#software`,
    name: SITE.name,
    applicationCategory: "BusinessApplication",
    applicationSubCategory: "Scheduling & Appointment Software",
    operatingSystem: "Web",
    url: SITE.url,
    description: SITE.description,
    inLanguage: SITE.lang,
    publisher: { "@id": `${SITE.url}/#organization` },
    offers: [
      { "@type": "Offer", name: "Turnos", price: "15000", priceCurrency: "ARS", category: "subscription", url: abs("/#precio") },
      { "@type": "Offer", name: "Turnos Pro", price: "30000", priceCurrency: "ARS", category: "subscription", url: abs("/#precio") },
    ],
    featureList: [
      "Turnos ilimitados",
      "Página de reservas con tu marca",
      "Recordatorios y avisos por WhatsApp",
      "Promos e incentivos para llenar huecos",
      "Clientes recurrentes con semáforo de retorno",
      "Agenda por profesional",
    ],
  };
}

/** FAQPage a partir de una lista de preguntas/respuestas. */
export function faqLd(items: ReadonlyArray<{ q: string; a: string }>): Json {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map(({ q, a }) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  };
}

/** BreadcrumbList a partir de pares [nombre, ruta]. */
export function breadcrumbLd(items: ReadonlyArray<{ name: string; path: string }>): Json {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: abs(it.path),
    })),
  };
}

/** Article/BlogPosting para una nota del blog. */
export function articleLd(input: {
  slug: string;
  title: string;
  description: string;
  datePublished: string;
  dateModified?: string;
  author: string;
  keywords?: string[];
}): Json {
  const url = abs(`/blog/${input.slug}`);
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "@id": `${url}#article`,
    headline: input.title,
    description: input.description,
    inLanguage: SITE.lang,
    datePublished: input.datePublished,
    dateModified: input.dateModified ?? input.datePublished,
    author: { "@type": "Organization", name: input.author, url: SITE.url },
    publisher: { "@id": `${SITE.url}/#organization` },
    image: abs(`/blog/${input.slug}/opengraph-image`),
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    keywords: (input.keywords ?? []).join(", "),
    isPartOf: { "@id": `${SITE.url}/#website` },
  };
}

// Mapea el rubro del negocio (texto libre) a un @type de Schema.org más preciso.
const BUSINESS_TYPE_MAP: Array<[RegExp, string]> = [
  [/barber/i, "BarberShop"],
  [/pelu|hair|salon/i, "HairSalon"],
  [/u[ñn]as|nail|manicur/i, "NailSalon"],
  [/spa|masaj/i, "DaySpa"],
  [/est[eé]tica|belle|beauty|depila|cej|pesta/i, "BeautySalon"],
  [/tattoo|tatu/i, "TattooParlor"],
  [/consult|m[eé]dic|salud|kinesi|odont|dent|psico/i, "MedicalBusiness"],
];

export function schemaTypeForBusiness(businessType?: string | null): string {
  if (businessType) {
    for (const [re, type] of BUSINESS_TYPE_MAP) if (re.test(businessType)) return type;
  }
  return "HealthAndBeautyBusiness";
}

export type BusinessLdInput = {
  slug: string;
  name: string;
  description?: string | null;
  businessType?: string | null;
  address?: string | null;
  phone?: string | null;
  instagram?: string | null;
  mapsUrl?: string | null;
  logoUrl?: string | null;
  services?: ReadonlyArray<{ name: string; priceCents: number; durationMinutes: number }>;
  showPrices?: boolean;
};

/** LocalBusiness para la página pública de un negocio (/{slug}/turnos). */
export function localBusinessLd(b: BusinessLdInput): Json {
  const bookingUrl = abs(`/${b.slug}/turnos`);
  const sameAs = b.instagram
    ? [/^https?:/i.test(b.instagram) ? b.instagram : `https://instagram.com/${b.instagram.replace(/^@/, "")}`]
    : undefined;

  const node: Json = {
    "@context": "https://schema.org",
    "@type": schemaTypeForBusiness(b.businessType),
    "@id": `${bookingUrl}#business`,
    name: b.name,
    url: bookingUrl,
    description: b.description || `Reservá tu turno online en ${b.name}.`,
    image: b.logoUrl || abs("/opengraph-image"),
    currenciesAccepted: "ARS",
    areaServed: { "@type": "Country", name: "Argentina" },
    potentialAction: {
      "@type": "ReserveAction",
      target: { "@type": "EntryPoint", urlTemplate: bookingUrl, actionPlatform: ["https://schema.org/DesktopWebPlatform", "https://schema.org/MobileWebPlatform"] },
      result: { "@type": "Reservation", name: `Turno en ${b.name}` },
    },
    isPartOf: { "@id": `${SITE.url}/#website` },
  };
  if (b.address) node.address = { "@type": "PostalAddress", streetAddress: b.address, addressCountry: "AR" };
  if (b.phone) node.telephone = b.phone;
  if (b.mapsUrl) node.hasMap = b.mapsUrl;
  if (sameAs) node.sameAs = sameAs;

  const priced = (b.services ?? []).filter((s) => b.showPrices !== false && s.priceCents > 0);
  if (priced.length) {
    node.makesOffer = priced.map((s) => ({
      "@type": "Offer",
      priceCurrency: "ARS",
      price: (s.priceCents / 100).toFixed(0),
      itemOffered: { "@type": "Service", name: s.name },
    }));
  }
  return node;
}
