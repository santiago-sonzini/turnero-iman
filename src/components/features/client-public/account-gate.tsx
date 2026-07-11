// Pantalla que ve un cliente cuando su cuenta pública todavía no fue
// habilitada desde el dashboard. Compartida por /history/[id] y sus subpáginas.
import { Lock } from "lucide-react";

export function CuentaNoHabilitada() {
  return (
    <div className="flex h-full w-full items-center justify-center p-8">
      <div className="max-w-md rounded-xl border bg-card p-8 text-center">
        <Lock className="mx-auto h-8 w-8 text-muted-foreground" />
        <h1 className="mt-3 text-lg font-semibold">Cuenta no habilitada</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Esta página todavía no está disponible. Pedile a tu proveedor que
          habilite tu cuenta para acceder a tus pedidos y pagos.
        </p>
      </div>
    </div>
  );
}
