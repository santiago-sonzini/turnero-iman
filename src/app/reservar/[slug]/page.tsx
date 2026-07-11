import { notFound } from "next/navigation";
import { getPublicBooking } from "@/app/actions/turnos";
import { BookingFlow } from "@/components/turnos/booking-flow";

export default async function BookingPage({ params, searchParams }: { params: { slug: string }; searchParams: { promo?: string } }) {
  const initial = await getPublicBooking(params.slug, searchParams.promo);
  if (!initial) notFound();
  return <BookingFlow initial={JSON.parse(JSON.stringify(initial))} promoToken={searchParams.promo} />;
}
