import { notFound } from "next/navigation";
import { getPublicBooking } from "@/app/actions/turnos";
import { BookingFlow } from "@/components/turnos/booking-flow";
import { publicBusinessMeta } from "@/server/queries";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata(props: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const params = await props.params;
  const business = await publicBusinessMeta(params.slug);
  if (!business?.profile) return { title: "Agenda no disponible", robots: { index: false, follow: false } };
  const name = business.profile.name || business.name;
  return {
    title: `Reservá tu turno en ${name}`,
    description: business.profile.description || `Elegí servicio, profesional, día y horario para reservar en ${name}.`,
    alternates: { canonical: `/${business.slug}/turnos` },
    openGraph: { title: `Reservá tu turno en ${name}`, description: `Agenda online de ${name}.`, type: "website" },
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
  const initial = await getPublicBooking(params.slug, searchParams.promo);
  if (!initial) notFound();
  return <BookingFlow initial={JSON.parse(JSON.stringify(initial))} promoToken={searchParams.promo} preStaffId={searchParams.prof} />;
}
