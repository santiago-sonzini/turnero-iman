import { redirect } from "next/navigation";
import { requireTenant } from "@/server/require-tenant";
import { accesoDe, formatoArs, PLANES } from "@/server/plans";
import { mpConfigurado } from "@/server/mp/preapproval";
import { DEMO_MODE } from "@/server/db";
import { Panel } from "./panel";

export default async function Subscription() {
  const tenant = await requireTenant();
  if (tenant.planStatus === "ONBOARDING") redirect("/onboarding");
  return <Panel
    plan={tenant.plan}
    acceso={JSON.parse(JSON.stringify(accesoDe(tenant)))}
    hasMp={!!tenant.mpPreapprovalId}
    mpReady={mpConfigurado() && !DEMO_MODE}
    prices={{ TURNOS: formatoArs(PLANES.TURNOS.precioArs), TURNOS_AUTO: formatoArs(PLANES.TURNOS_AUTO.precioArs) }}
  />;
}
