import { notFound } from "next/navigation";
import { getPublicBooking } from "@/app/actions/turnos";
import { BookingFlow } from "@/components/turnos/booking-flow";

export const dynamic = "force-dynamic";

// Página pública de reservas: /{slug}/turnos (el link compartible).
export default async function PublicBooking({ params, searchParams }: { params: { slug: string }; searchParams: { promo?: string } }) {
  const initial = await getPublicBooking(params.slug, searchParams.promo);
  if (!initial) notFound();
  return <BookingFlow initial={JSON.parse(JSON.stringify(initial))} promoToken={searchParams.promo} />;
}
