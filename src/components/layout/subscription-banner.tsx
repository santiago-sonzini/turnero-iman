import Link from "next/link";

// Banner de estado de suscripción (trial corriendo / pago rechazado en
// gracia). Se muestra arriba del contenido del dashboard.
export function SubscriptionBanner({
  acceso,
}: {
  acceso:
    | { estado: "pleno"; diasTrial?: number }
    | { estado: "gracia"; hasta: Date };
}) {
  if (acceso.estado === "pleno") {
    if (acceso.diasTrial == null) return null;
    return (
      <div className="fixed left-0 right-0 top-16 z-10 border-b bg-primary/10 px-4 py-1.5 text-center text-sm">
        Prueba gratis: te quedan <b>{acceso.diasTrial} días</b>.{" "}
        <Link href="/suscripcion" className="font-bold underline">
          Dejá el débito configurado
        </Link>{" "}
        y no se corta nada.
      </div>
    );
  }
  return (
    <div className="fixed left-0 right-0 top-16 z-10 border-b bg-destructive/15 px-4 py-1.5 text-center text-sm">
      No pudimos cobrar tu suscripción. Tenés hasta el{" "}
      <b>{acceso.hasta.toLocaleDateString("es-AR")}</b> para{" "}
      <Link href="/suscripcion" className="font-bold underline">
        reintentar el pago
      </Link>{" "}
      — después se pausa el acceso (tus datos quedan guardados).
    </div>
  );
}
