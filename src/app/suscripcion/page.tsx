import { redirect } from "next/navigation";
import { requireTenant } from "@/server/require-tenant";
import { accesoDe, formatoArs, PLANES } from "@/server/plans";
import { mpConfigurado } from "@/server/mp/preapproval";
import { DEMO_MODE } from "@/server/db";
import { reconciliarTenantMercadoPago } from "@/server/mp/reconcile";
import { Panel } from "./panel";

export default async function Subscription() {
  let tenant = await requireTenant();
  if (tenant.planStatus === "ONBOARDING") redirect("/onboarding");
  if (tenant.mpPreapprovalId && mpConfigurado() && !DEMO_MODE) {
    try {
      await reconciliarTenantMercadoPago(tenant.id);
      tenant = await requireTenant();
    } catch (error) {
      console.error("[mp] no se pudo verificar la suscripción al abrir el panel", error);
    }
  }
  return <Panel
    plan={tenant.plan}
    acceso={JSON.parse(JSON.stringify(accesoDe(tenant)))}
    hasMp={!!tenant.mpPreapprovalId}
    lastPaymentAt={tenant.mpLastPaymentPreapprovalId === tenant.mpPreapprovalId
      ? tenant.mpLastPaymentAt?.toISOString() ?? null
      : null}
    mpReady={mpConfigurado() && !DEMO_MODE}
    prices={{ TURNOS: formatoArs(PLANES.TURNOS.precioArs), TURNOS_AUTO: formatoArs(PLANES.TURNOS_AUTO.precioArs) }}
  />;
}
