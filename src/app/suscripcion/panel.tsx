"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, CreditCard, Sparkles } from "lucide-react";
import { activarPago, cambiarPlan, cancelarSuscripcion } from "@/app/actions/billing";

export function Panel({ plan, acceso, hasMp, mpReady, prices }: any) {
  const [loading, setLoading] = useState("");
  const [error, setError] = useState("");

  const pay = async () => {
    setLoading("mp"); setError("");
    const r = await activarPago();
    if (r.ok && r.initPoint) { location.href = r.initPoint; return; }
    setError(r.ok ? "Mercado Pago no está disponible." : r.error);
    setLoading("");
  };
  const change = async (p: any) => {
    setLoading(p); setError("");
    const r = await cambiarPlan(p);
    if (!r.ok) { setError(r.error); setLoading(""); return; }
    location.reload();
  };
  const cancel = async () => {
    if (!confirm("¿Cancelar la suscripción? Tus datos quedan guardados.")) return;
    setLoading("cancel");
    await cancelarSuscripcion();
    location.reload();
  };

  const estado = acceso.estado === "pleno"
    ? { clase: "aldia", label: "Al día" }
    : acceso.estado === "gracia"
      ? { clase: "letoca", label: "Pago pendiente" }
      : { clase: "vencida", label: "Pausada" };

  return <main>
    <p className="eyebrow">TU SUSCRIPCIÓN</p>
    <h1>{acceso.estado === "bloqueado" ? "Reactivá tu agenda" : "Todo bajo control"}</h1>
    <div className="tarjeta-fila" style={{ cursor: "default" }}>
      <span className="emo">💳</span>
      <div className="info">
        <span className="nom">{plan === "TURNOS_AUTO" ? "Turnos Auto" : "Turnos"}</span>
        <span className="sub">{plan ? `${prices[plan]}/mes` : "Sin plan"}</span>
      </div>
      <span className={`sem ${estado.clase}`}><i className="pto" />{estado.label}</span>
    </div>
    {acceso.diasTrial && <div className="hint"><span className="hint-emo">⏳</span><div><b>{acceso.diasTrial} día{acceso.diasTrial === 1 ? "" : "s"} de prueba</b><p>Dejá el débito listo hoy: con el trial de Mercado Pago no se cobra nada hasta que termine.</p></div></div>}
    {mpReady
      ? <button className="btn btn-acento block" onClick={pay} disabled={!!loading}>
        <CreditCard /> {loading === "mp" ? "Abriendo Mercado Pago…" : hasMp ? "Gestionar en Mercado Pago" : "Configurar débito automático"}
      </button>
      : <div className="hint"><span className="hint-emo">🔌</span><div><b>Mercado Pago no está conectado</b><p>Configurá MP_ACCESS_TOKEN y NEXT_PUBLIC_APP_URL (https) en el servidor para habilitar el débito automático.</p></div></div>}

    <div className="seccion-tit"><h2>Cambiar de plan</h2></div>
    {plan !== "TURNOS" && <button className="tarjeta-fila" disabled={!!loading} onClick={() => change("TURNOS")}>
      <span className="emo">🗓️</span>
      <div className="info"><span className="nom">Turnos</span><span className="sub">{prices.TURNOS}/mes · WhatsApp manual</span></div>
    </button>}
    {plan !== "TURNOS_AUTO" && <button className="tarjeta-fila" disabled={!!loading} onClick={() => change("TURNOS_AUTO")}>
      <span className="emo"><Sparkles /></span>
      <div className="info"><span className="nom">Turnos Auto</span><span className="sub">{prices.TURNOS_AUTO}/mes · Hasta 3 profesionales y temas</span></div>
    </button>}
    {error && <p className="form-error">{error}</p>}

    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 25 }}>
      <Link className="bk-volver" href="/app"><ArrowLeft /> Volver a la agenda</Link>
      {hasMp && <button className="bk-volver" style={{ color: "var(--rojo)" }} disabled={!!loading} onClick={cancel}>Cancelar suscripción</button>}
    </div>
  </main>;
}
