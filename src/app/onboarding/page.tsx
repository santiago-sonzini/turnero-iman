import { getCurrentTenant } from "@/server/tenant-context";
import { OnboardingFlow } from "@/components/turnos/onboarding-flow";
import { db } from "@/server/db";
import { redirect } from "next/navigation";

export default async function Onboarding(){
  const tenant=await getCurrentTenant();
  if(tenant.planStatus!=="ONBOARDING") redirect("/app");
  const [profile,service]=await Promise.all([
    db.businessProfile.findFirst(),
    db.service.findFirst({orderBy:{createdAt:"asc"}}),
  ]);
  return <OnboardingFlow initial={{
    step:tenant.onboardingStep,
    business:{name:profile?.name??tenant.name,phone:profile?.phone??"",address:profile?.address??"",instagram:profile?.instagram??"",accent:profile?.accent??"#E94F37"},
    service:service?{id:service.id,name:service.name,emoji:service.emoji,durationMinutes:service.durationMinutes,priceCents:service.priceCents}:{name:"Corte clásico",emoji:"✂️",durationMinutes:40,priceCents:900000},
  }}/>;
}
