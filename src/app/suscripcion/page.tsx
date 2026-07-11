import { redirect } from "next/navigation";
import { getCurrentTenant } from "@/server/tenant-context";
import { accesoDe, formatoArs, PLANES } from "@/server/plans";
import { Panel } from "./panel";
export default async function Subscription(){const tenant=await getCurrentTenant();if(tenant.planStatus==="ONBOARDING")redirect("/onboarding");return <Panel plan={tenant.plan} acceso={JSON.parse(JSON.stringify(accesoDe(tenant)))} hasMp={!!tenant.mpPreapprovalId} prices={{TURNOS:formatoArs(PLANES.TURNOS.precioArs),TURNOS_AUTO:formatoArs(PLANES.TURNOS_AUTO.precioArs)}}/>}
