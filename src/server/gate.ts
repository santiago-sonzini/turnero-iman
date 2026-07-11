// Helpers de gating para páginas y actions. Lanzan/redirigen según el plan y
// el estado de suscripción del tenant de la sesión.
import { getCurrentTenant } from "./tenant-context";
import { accesoDe, tieneFeature, type Acceso, type FeatureKey } from "./plans";

export async function getAcceso(): Promise<Acceso> {
  const tenant = await getCurrentTenant();
  return accesoDe(tenant);
}

export async function featureHabilitada(f: FeatureKey): Promise<boolean> {
  const tenant = await getCurrentTenant();
  return tieneFeature(tenant, f);
}

/** Para usar al tope de un server action de una feature paga. */
export async function requireFeature(f: FeatureKey): Promise<void> {
  const tenant = await getCurrentTenant();
  if (!tieneFeature(tenant, f)) {
    throw new Error(
      "Esta función no está incluida en tu plan. Podés cambiarlo en Ajustes → Suscripción."
    );
  }
  const acceso = accesoDe(tenant);
  if (acceso.estado === "bloqueado") {
    throw new Error(
      "Tu suscripción no está activa. Reactivala en Ajustes → Suscripción (tus datos siguen guardados)."
    );
  }
}
