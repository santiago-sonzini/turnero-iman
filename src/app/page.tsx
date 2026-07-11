import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ImanLogo } from "@/components/iman/logo";
import { ThemeAccent } from "@/components/iman/theme-accent";
import { getBusinessProfile } from "./actions/business";
import { DEMO_MODE } from "@/server/db";
import { RUBROS, TIPOS } from "@/server/demo/packs/ids";

export default async function Home() {
  // En modo real este punto de entrada no toca la base (no hay sesión todavía):
  // manda a crear cuenta / ingresar. En demo muestra el acceso directo al panel.
  if (!DEMO_MODE) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-foreground">
        <ThemeAccent />
        <div className="w-full max-w-md text-center">
          <ImanLogo className="mx-auto h-20 w-20" />
          <h1 className="mt-6 text-4xl font-bold tracking-tight">
            Im<span className="text-acento">á</span>n
          </h1>
          <p className="mt-3 text-lg text-muted-foreground">
            Vendé más con los clientes que ya tenés.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/auth"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-base font-bold text-primary-foreground transition-transform hover:-translate-y-0.5"
            >
              Crear mi cuenta gratis
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/auth"
              className="inline-flex items-center gap-2 rounded-xl border px-6 py-3 text-base font-bold transition-colors hover:border-acento"
            >
              Ya tengo cuenta
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const negocio = await getBusinessProfile();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-foreground">
      <ThemeAccent />
      <div className="w-full max-w-md text-center">
        <ImanLogo className="mx-auto h-20 w-20" />
        <h1 className="mt-6 text-4xl font-bold tracking-tight">
          Im<span className="text-acento">á</span>n
        </h1>
        <p className="mt-3 text-lg text-muted-foreground">
          Vendé más con los clientes que ya tenés.
        </p>

        <Link
          href="/dashboard"
          className="mt-8 inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-base font-bold text-primary-foreground transition-transform hover:-translate-y-0.5"
        >
          Entrar al panel de {negocio.name}
          <ArrowRight className="h-4 w-4" />
        </Link>

        {DEMO_MODE && (
          <div className="mt-6 text-sm text-muted-foreground">
            <p>
              Demo con datos de ejemplo de un negocio ficticio.
              <br />
              Nada de lo que veas es real, todo lo que toques funciona.
            </p>

            {/* Links directos a cada pack (setean la cookie vía middleware) */}
            <div className="mt-5 space-y-2 text-xs">
              {TIPOS.map((t) => (
                <div key={t.id} className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
                  <span className="font-semibold text-foreground/70">{t.label}:</span>
                  {RUBROS.map((r) => (
                    <Link
                      key={r.id}
                      href={`/?tipo=${t.id}&rubro=${r.id}`}
                      className="rounded-full border px-2.5 py-0.5 transition-colors hover:border-acento hover:text-foreground"
                    >
                      {r.label}
                    </Link>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
