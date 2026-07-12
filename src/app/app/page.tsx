import { redirect } from "next/navigation";
import { tenantRouteMeta } from "@/server/queries";
import getUserServer from "@/lib/user";

export const dynamic = "force-dynamic";

// Compat: /app manda al panel del negocio en /{slug} (donde vive el admin).
export default async function AppRedirect() {
  const user = await getUserServer();
  if (!user?.userDb) redirect("/auth");
  const tenant = await tenantRouteMeta(user.userDb.tenantId);
  if (!tenant) redirect("/auth");
  if (tenant.planStatus === "ONBOARDING") redirect("/onboarding");
  redirect(`/${tenant.slug}`);
}
