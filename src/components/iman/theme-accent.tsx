// Override del color de acento por deploy, desde datos (BusinessProfile.themeAccent).
// Se inyecta como <style> para que el branding de un cliente no requiera tocar
// globals.css. La paleta completa (semáforo, fondos) sigue en globals.css.
import { getBusinessProfile } from "@/app/actions/business";
import { TenantError } from "@/server/tenant-context";

// Solo aceptamos hex simple para no inyectar CSS arbitrario.
function hexValido(v: string | null | undefined): v is string {
  return !!v && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v);
}

export async function ThemeAccent() {
  // En páginas públicas (landing, auth) no hay sesión ni tenant: sin acento
  // custom, y listo. Cualquier otro error sí debe explotar.
  let accent: string | null | undefined;
  try {
    accent = (await getBusinessProfile()).themeAccent;
  } catch (e) {
    if (e instanceof TenantError) return null;
    throw e;
  }
  if (!hexValido(accent)) return null;
  return (
    <style
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{
        __html: `:root{--acento:${accent};}`,
      }}
    />
  );
}
