import { requireTenant } from "@/server/require-tenant";
import { OnboardingFlow } from "@/components/turnos/onboarding-flow";
import { onboardingInitialData } from "@/server/queries";
import { DEMO_MODE } from "@/server/db";
import { mpConfigurado } from "@/server/mp/preapproval";
import { redirect } from "next/navigation";

export default async function Onboarding(){
  const tenant=await requireTenant();
  if(tenant.planStatus!=="ONBOARDING") redirect("/app");
  const [profile,services]=await onboardingInitialData();
  return <OnboardingFlow initial={{
    step:tenant.onboardingStep,
    mp:mpConfigurado()&&!DEMO_MODE,
    business:{name:profile?.name??tenant.name,phone:profile?.phone??"",address:profile?.address??"",mapsUrl:(profile as any)?.mapsUrl??"",instagram:profile?.instagram??"",accent:profile?.accent??"#E94F37",businessType:(profile as any)?.businessType??"barberia"},
    services:services.map((s)=>({name:s.name,emoji:s.emoji,durationMinutes:s.durationMinutes,priceCents:s.priceCents})),
  }}/>;
}
