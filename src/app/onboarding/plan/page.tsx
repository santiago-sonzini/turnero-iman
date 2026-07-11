// Paso 3: precios DESPUÉS del valor. La recomendación sale de lo que vimos en
// el onboarding (snapshot del reveal + la pregunta de recibos).
import { getCurrentTenant } from "@/server/tenant-context";
import { PLANES } from "@/server/plans";
import { PlanPicker } from "./plan-picker";

export default async function ElegirPlan() {
  const tenant = await getCurrentTenant();
  const snapshot = (tenant.revealSnapshot ?? {}) as {
    enRiesgo?: number;
    dormidos?: number;
  };
  const enfriandose = (snapshot.enRiesgo ?? 0) + (snapshot.dormidos ?? 0);

  const planes = [PLANES.SIMPLE, PLANES.COMPLETO].map((p) => ({
    tier: p.tier,
    nombre: p.nombre,
    descripcion: p.descripcion,
    precioArs: p.precioArs!,
  }));

  return (
    <main>
      <div className="text-center">
        <h1 className="text-3xl">
          {enfriandose > 0
            ? `Recuperar a esos ${enfriandose} vale más que esto`
            : "Elegí cómo lo querés usar"}
        </h1>
        <p className="onb-sub mt-2">
          14 días gratis con todo. Cancelás cuando quieras y tus datos quedan
          guardados igual.
        </p>
      </div>
      <PlanPicker planes={planes} />
      <p className="onb-sub mt-6 text-center text-sm">
        ¿Sos distribuidora o querés copias con tu marca para tus comercios?{" "}
        <b>Plan Personalizado</b>: escribinos y lo armamos juntos.
      </p>
    </main>
  );
}
