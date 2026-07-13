// back_url de Mercado Pago. NUNCA confiamos en los query params para activar
// nada: se verifica la preapproval contra la API y recién ahí se sincroniza.
import Link from "next/link";
import { confirmarRetorno } from "@/app/actions/billing";

export default async function Retorno(
  props: {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
  }
) {
  const searchParams = await props.searchParams;
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
    <main style={{ textAlign: "center", paddingTop: 20 }}>
      <div style={{ fontSize: "3.4rem", marginBottom: 10 }}>{ok ? "🧲" : "🤔"}</div>
      <h1 style={{ fontSize: "1.7rem", marginBottom: 8 }}>
        {ok ? "¡Listo! Débito automático configurado" : "No pudimos confirmar la suscripción"}
      </h1>
      <p className="bk-sub" style={{ maxWidth: "40ch", margin: "0 auto 22px" }}>
        {ok
          ? "Con el trial de Mercado Pago, el primer cobro llega recién cuando termina tu prueba gratis. Mientras tanto, a recuperar clientes."
          : "Si autorizaste el pago en Mercado Pago, en unos minutos el estado se actualiza solo (nos avisa MP). Podés revisarlo en tu suscripción."}
      </p>
      <div style={{ display: "grid", gap: 10, maxWidth: 340, margin: "0 auto" }}>
        <Link href="/app" className="btn btn-acento block">Ir a mi agenda</Link>
        <Link href="/suscripcion" className="btn block">Ver mi suscripción</Link>
      </div>
    </main>
  );
}
