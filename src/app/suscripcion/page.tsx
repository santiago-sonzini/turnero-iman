// Estado y gestión de la suscripción del tenant: plan, trial, reintento de
// pago, upgrade/downgrade y cancelación. También es la pantalla de "lock"
// cuando el acceso está bloqueado (los datos nunca se borran).
import { getCurrentTenant } from "@/server/tenant-context";
import { accesoDe, formatoArs, PLANES } from "@/server/plans";
import { redirect } from "next/navigation";
import { Panel } from "./panel";

export default async function Suscripcion() {
  const tenant = await getCurrentTenant();
  if (tenant.planStatus === "ONBOARDING") redirect("/onboarding");

  const acceso = accesoDe(tenant);
  const plan = tenant.plan ? PLANES[tenant.plan] : null;

  return (
    <Panel
      plan={
        plan
          ? {
              tier: plan.tier,
              nombre: plan.nombre,
              precio: plan.precioArs ? `${formatoArs(plan.precioArs)}/mes` : "a medida",
            }
          : null
      }
      precios={{
        SIMPLE: formatoArs(PLANES.SIMPLE.precioArs!),
        COMPLETO: formatoArs(PLANES.COMPLETO.precioArs!),
      }}
      acceso={JSON.parse(JSON.stringify(acceso))}
      tieneMp={!!tenant.mpPreapprovalId}
    />
  );
}
