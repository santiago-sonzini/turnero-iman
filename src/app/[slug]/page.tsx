import { notFound, redirect } from "next/navigation";
import { getOwnerData } from "@/app/actions/turnos";
import { tenantIdBySlug } from "@/server/queries";
import { accesoDe } from "@/server/plans";
import { AppShell } from "@/components/turnos/app-shell";
import getUserServer from "@/lib/user";

export const dynamic = "force-dynamic";

// Panel del dueño en /{slug}. La autenticación vive acá: si no hay sesión, va
// a /auth; si el usuario no es dueño de ESTE negocio, no puede entrar (404).
export default async function TenantAdmin({ params }: { params: { slug: string } }) {
  const user = await getUserServer();
  if (!user?.userDb) redirect("/auth");
  const target = await tenantIdBySlug(params.slug);
  if (!target) notFound();
  if (user.userDb.tenantId !== target.id) notFound();

  const from = new Date(); from.setDate(from.getDate() - 60); from.setHours(0, 0, 0, 0);
  const to = new Date(); to.setDate(to.getDate() + 45); to.setHours(23, 59, 59, 999);
  const data = await getOwnerData(from, to);
  const access = accesoDe(data.tenant);
  if (access.estado === "onboarding") redirect("/onboarding");
  if (access.estado === "bloqueado") redirect("/suscripcion");
  return <AppShell data={JSON.parse(JSON.stringify(data))} />;
}
