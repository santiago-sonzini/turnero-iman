import { notFound } from "next/navigation";
import { getPublicBooking } from "@/app/actions/turnos";
import { BookingFlow } from "@/components/turnos/booking-flow";

export const dynamic = "force-dynamic";

// Página pública de reservas: /{slug}/turnos (el link compartible).
// ?promo= promo · ?prof= profesional preseleccionado · ?c= token del cliente (link del email).
export default async function PublicBooking({ params, searchParams }: { params: { slug: string }; searchParams: { promo?: string; prof?: string; c?: string } }) {
  const initial = await getPublicBooking(params.slug, searchParams.promo, searchParams.c);
  if (!initial) notFound();
  return <BookingFlow initial={JSON.parse(JSON.stringify(initial))} promoToken={searchParams.promo} preStaffId={searchParams.prof} />;
}
