import { getCurrentTenant } from "@/server/tenant-context";
import { OnboardingFlow } from "@/components/turnos/onboarding-flow";
export default async function Onboarding(){const tenant=await getCurrentTenant();return <OnboardingFlow tenantName={tenant.name}/>}
