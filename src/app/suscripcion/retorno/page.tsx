// back_url de Mercado Pago. NUNCA confiamos en los query params para activar
// nada: se verifica la preapproval contra la API y recién ahí se sincroniza.
import Link from "next/link";
import { confirmarRetorno } from "@/app/actions/billing";

export default async function Retorno({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const preapprovalId =
    (searchParams.preapproval_id as string) ?? (searchParams.id as string) ?? null;

  let ok = false;
  if (preapprovalId) {
    try {
      ok = await confirmarRetorno(preapprovalId);
    } catch (e) {
      console.error("[mp] error verificando retorno", e);
    }
  }

  return (
    <main className="onb-card text-center">
      <div className="text-5xl">{ok ? "🧲" : "🤔"}</div>
      <h1 className="mt-3 text-2xl">
        {ok ? "¡Listo! Débito automático configurado" : "No pudimos confirmar la suscripción"}
      </h1>
      <p className="onb-sub mt-2">
        {ok
          ? "El primer cobro llega cuando termina tu prueba gratis. Mientras tanto, a recuperar clientes."
          : "Si autorizaste el pago en Mercado Pago, en unos minutos el estado se actualiza solo (nos avisa MP). Podés revisarlo en tu suscripción."}
      </p>
      <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">
        <Link href="/dashboard" className="onb-btn onb-btn-primario">
          Ir al panel
        </Link>
        <Link href="/suscripcion" className="onb-btn onb-btn-secundario">
          Ver mi suscripción
        </Link>
      </div>
    </main>
  );
}
