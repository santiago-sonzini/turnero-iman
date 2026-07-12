import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

// Compat: el link viejo /reservar/{slug} ahora vive en /{slug}/turnos.
export default function ReservarRedirect({ params, searchParams }: { params: { slug: string }; searchParams: { promo?: string } }) {
  redirect(`/${params.slug}/turnos${searchParams?.promo ? `?promo=${searchParams.promo}` : ""}`);
}
