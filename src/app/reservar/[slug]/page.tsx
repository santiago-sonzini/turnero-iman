import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

// Compat: el link viejo /reservar/{slug} ahora vive en /{slug}/turnos.
export default async function ReservarRedirect(
  props: { params: Promise<{ slug: string }>; searchParams: Promise<{ promo?: string }> }
) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  redirect(`/${params.slug}/turnos${searchParams?.promo ? `?promo=${searchParams.promo}` : ""}`);
}
