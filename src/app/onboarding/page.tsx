// Paso 1: ingesta guiada de datos. El camino principal es la data real del
// usuario; el de ejemplo existe para no frenar a nadie.
import { getCurrentTenant } from "@/server/tenant-context";
import { redirect } from "next/navigation";
import { ImportarForm } from "./importar-form";

export default async function OnboardingImportar() {
  const tenant = await getCurrentTenant();
  // Retomar donde quedó si ya pasó este paso.
  if (tenant.onboardingStep === "revelacion") redirect("/onboarding/revelacion");
  if (tenant.onboardingStep === "plan") redirect("/onboarding/plan");

  return (
    <main>
      <h1 className="text-center text-3xl">
        Subí tus ventas y mirá quién se está enfriando
      </h1>
      <p className="onb-sub mt-3 text-center">
        Una fila por venta: <b>cliente, fecha, monto</b> (y teléfono si lo
        tenés). Desde Excel es copiar y pegar. Fechas dd/mm/aaaa y montos con
        puntos o comas: lo entendemos igual.
      </p>
      <div className="onb-card mt-6">
        <ImportarForm />
      </div>
    </main>
  );
}
