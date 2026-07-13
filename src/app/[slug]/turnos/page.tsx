import { notFound } from "next/navigation";
import { getPublicBooking } from "@/app/actions/turnos";
import { BookingFlow } from "@/components/turnos/booking-flow";
import { publicBusinessMeta } from "@/server/queries";
import { JsonLd } from "@/components/seo/json-ld";
import { SITE, localBusinessLd, breadcrumbLd } from "@/lib/seo";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata(props: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const params = await props.params;
  const business = await publicBusinessMeta(params.slug);
  if (!business?.profile) return { title: "Agenda no disponible", robots: { index: false, follow: false } };
  const name = business.profile.name || business.name;
  const rubro = business.profile.businessType ? ` ${business.profile.businessType}` : "";
  const description =
    business.profile.description ||
    `Reservá tu turno online en ${name}${rubro ? ` (${business.profile.businessType})` : ""}. Elegí servicio, día y horario. Confirmación al instante, sin llamados ni esperas.`;
  const title = `Turnos en ${name} — Reservá online`;
  return {
    title,
    description,
    keywords: [`turnos ${name}`, `reservar turno ${name}`, business.profile.businessType, "turnos online", "reserva online"].filter(Boolean) as string[],
    alternates: { canonical: `/${business.slug}/turnos` },
    openGraph: {
      title,
      description,
      type: "website",
      locale: SITE.locale,
      url: `/${business.slug}/turnos`,
      siteName: SITE.name,
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

// Página pública de reservas: /{slug}/turnos (el link compartible).
// ?promo= promo · ?prof= profesional preseleccionado. El acceso privado a un
// turno usa un fragmento #booking=... que nunca llega a logs HTTP.
export default async function PublicBooking(
  props: { params: Promise<{ slug: string }>; searchParams: Promise<{ promo?: string; prof?: string }> }
) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  const [initial, meta] = await Promise.all([
    getPublicBooking(params.slug, searchParams.promo),
    publicBusinessMeta(params.slug),
  ]);
  if (!initial) notFound();

  const name = meta?.profile?.name || meta?.name || params.slug;
  const ld = meta?.profile
    ? [
        localBusinessLd({
          slug: meta.slug,
          name,
          description: meta.profile.description,
          businessType: meta.profile.businessType,
          address: meta.profile.address,
          phone: meta.profile.phone,
          instagram: meta.profile.instagram,
          mapsUrl: meta.profile.mapsUrl,
          logoUrl: meta.profile.logoUrl,
          services: meta.services,
          showPrices: meta.profile.showPrices,
        }),
        breadcrumbLd([
          { name: "Inicio", path: "/" },
          { name, path: `/${meta.slug}/turnos` },
        ]),
      ]
    : null;

  return (
    <>
      {ld && <JsonLd data={ld} />}
      <BookingFlow initial={JSON.parse(JSON.stringify(initial))} promoToken={searchParams.promo} preStaffId={searchParams.prof} />
    </>
  );
}
