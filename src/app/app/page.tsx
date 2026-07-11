import { redirect } from "next/navigation";
import { getOwnerData } from "@/app/actions/turnos";
import { accesoDe } from "@/server/plans";
import { AppShell } from "@/components/turnos/app-shell";
import getUserServer from "@/lib/user";

export default async function OwnerApp() {
  const user = await getUserServer();
  if (!user?.userDb) redirect("/auth");
  const from = new Date(); from.setDate(from.getDate() - 60); from.setHours(0,0,0,0);
  const to = new Date(); to.setDate(to.getDate() + 45); to.setHours(23,59,59,999);
  const data = await getOwnerData(from, to);
  const access = accesoDe(data.tenant);
  if (access.estado === "onboarding") redirect("/onboarding");
  if (access.estado === "bloqueado") redirect("/suscripcion");
  return <AppShell data={JSON.parse(JSON.stringify(data))} />;
}
