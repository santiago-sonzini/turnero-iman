"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Clock3, CreditCard, Sparkles } from "lucide-react";
import { elegirPlan } from "@/app/actions/billing";
import { saveOnboardingBusiness, saveOnboardingServices } from "@/app/actions/turnos";
import { BUSINESS_TYPES, businessTypeById } from "@/lib/business-types";
import { normalizeMapsUrl } from "@/lib/maps";
import { MagnetLogo } from "./magnet-logo";

type ServiceRow = { name: string; emoji: string; durationMinutes: number; priceCents: number; on: boolean };
type InitialOnboarding = {
  step: string;
  mp: boolean;
  business: { name: string; phone: string; address: string; mapsUrl: string; instagram: string; accent: string; businessType: string };
  services: { name: string; emoji: string; durationMinutes: number; priceCents: number }[];
};

const SWATCHES = ["#E94F37", "#C5386A", "#7656D6", "#246BCE", "#1B7B94", "#198754", "#C26A12", "#33231A"];

// Acepta un enlace de Google Maps (link corto o largo). Rechaza texto suelto o
// URLs que no sean de Maps, así el botón "Cómo llegar" nunca queda roto.
function esLinkMapsValido(value: string): boolean {
  return normalizeMapsUrl(value) !== null;
}

// Errores de "Tu negocio" (paso 1). Devuelve string vacío cuando el campo está OK.
function erroresNegocio(b: InitialOnboarding["business"], ubicTab: "texto" | "link") {
  const digitosTel = b.phone.replace(/\D/g, "");
  return {
    name: b.name.trim().length < 2 ? "Poné el nombre de tu negocio (al menos 2 letras)." : "",
    phone: !digitosTel ? "Escribí tu WhatsApp." : digitosTel.length < 8 || digitosTel.length > 15
      ? "Ese WhatsApp no parece válido. Usá solo números, ej: 351 555 0194." : "",
    mapsUrl: ubicTab === "link" && b.mapsUrl.trim() && !esLinkMapsValido(b.mapsUrl)
      ? "Pegá un enlace de Google Maps válido (empieza con https://)." : "",
  };
}

// Combina la plantilla del rubro con los servicios que ya existían (por si el
// dueño retomó el onboarding): mantiene precios cargados y suma extras.
function rowsForType(typeId: string, existing: InitialOnboarding["services"]): ServiceRow[] {
  const tmpl = businessTypeById(typeId).services;
  const byName = new Map(existing.map((s) => [s.name, s]));
  const rows: ServiceRow[] = tmpl.map((t) => {
    const ex = byName.get(t.name);
    return { ...t, priceCents: ex?.priceCents ?? t.priceCents, on: true };
  });
  for (const s of existing) if (!tmpl.some((t) => t.name === s.name)) rows.push({ ...s, on: true });
  return rows;
}

export function OnboardingFlow({ initial }: { initial: InitialOnboarding }) {
  const stepIndex = initial.step === "plan" ? 2 : initial.step === "servicio" ? 1 : 0;
  const [step, setStep] = useState(stepIndex);
  const [saving, startSaving] = useTransition();
  const [finishing, startFinishing] = useTransition();
  const [error, setError] = useState("");
  const [business, setBusiness] = useState(initial.business);
  const [rows, setRows] = useState<ServiceRow[]>(() => rowsForType(initial.business.businessType, initial.services));
  // Tab de ubicación: dirección escrita o link de Google Maps. Si ya cargó un
  // link (por ejemplo retomando el onboarding), arranca en esa pestaña.
  const [ubicTab, setUbicTab] = useState<"texto" | "link">(initial.business.mapsUrl ? "link" : "texto");
  // Los errores por campo recién se muestran tras el primer intento de "Seguir",
  // y de ahí en más se actualizan en vivo mientras el usuario corrige.
  const [triedNext, setTriedNext] = useState(false);
  // Plan elegido para arrancar el trial (se puede empezar en Turnos Pro).
  const [planElegido, setPlanElegido] = useState<"TURNOS" | "TURNOS_AUTO">("TURNOS");
  const router = useRouter();

  const errores = erroresNegocio(business, ubicTab);
  const hayErrores = !!(errores.name || errores.phone || errores.mapsUrl);

  const pickType = (id: string) => {
    setBusiness({ ...business, businessType: id });
    setRows(rowsForType(id, initial.services)); // el paso de servicios refleja el rubro elegido
  };

  // Avance OPTIMISTA: la pantalla pasa al siguiente paso al toque y el
  // guardado corre atrás. Si falla, volvemos al paso con el error a la vista.
  const advance = (to: number, work: () => Promise<void>, from: number) => {
    setError("");
    setStep(to);
    startSaving(async () => {
      try { await work(); }
      catch (err) {
        console.error("[onboarding]", err);
        setStep(from);
        setError("No pudimos guardar este paso. Tus datos siguen acá; probá de nuevo.");
      }
    });
  };

  const nextBusiness = () => {
    setTriedNext(true);
    if (hayErrores) return;
    // Normalizamos antes de guardar: nombre sin espacios sobrantes y, si el link
    // de Maps no es válido, no lo persistimos (para no romper "Cómo llegar").
    const limpio = {
      ...business,
      name: business.name.trim(),
      mapsUrl: normalizeMapsUrl(business.mapsUrl) ?? "",
    };
    setBusiness(limpio);
    advance(1, () => saveOnboardingBusiness(limpio), 0);
  };
  const nextService = () => {
    const elegidos = rows.filter((r) => r.on).map(({ on: _on, ...s }) => s);
    if (!elegidos.length) { setError("Elegí al menos un servicio."); return; }
    advance(2, () => saveOnboardingServices(elegidos), 1);
  };

  const finish = (conPago: boolean) => startFinishing(async () => {
    setError("");
    try {
      const result = await elegirPlan(planElegido, { conPago });
      if (!result.ok) throw new Error(result.error);
      if (result.initPoint) { window.location.href = result.initPoint; return; }
      router.push("/app");
      router.refresh();
    } catch (err: any) {
      console.error("[onboarding]", err);
      setError(err?.message ?? "No pudimos activar tu prueba. Probá de nuevo.");
    }
  });

  const setRow = (i: number, patch: Partial<ServiceRow>) => setRows((rs) => rs.map((r, j) => j === i ? { ...r, ...patch } : r));
  const activos = rows.filter((r) => r.on).length;

  return <main className="sus" style={{ "--acento": business.accent } as React.CSSProperties}>
    <header className="sus-brand">
      <MagnetLogo particles />
      <div><b>Imán Turnos</b><small>Listo en menos de 3 minutos</small></div>
      {saving && <span className="chip" style={{ marginLeft: "auto" }}>Guardando…</span>}
    </header>
    <div className="bk-prog" style={{ padding: "0 0 14px" }}>
      {[0, 1, 2].map((i) => <span key={i} className={`step ${i < step ? "done" : i === step ? "now" : ""}`}><i /></span>)}
    </div>
    {error && <p className="form-error" role="alert">{error}</p>}

    {step === 0 && <section>
      <p className="eyebrow">1 DE 3 · TU NEGOCIO</p>
      <h1 style={{ marginBottom: 6 }}>Dale tu identidad</h1>
      <p className="bk-sub">Tu color también pinta tu página pública de reservas.</p>
      <div className="campo"><span>¿A qué se dedica tu negocio?</span>
        <div className="tipo-grid">
          {BUSINESS_TYPES.map((t) => <button key={t.id} type="button" className={`tipo ${business.businessType === t.id ? "on" : ""}`} onClick={() => pickType(t.id)}>
            <span className="emo">{t.emoji}</span><small>{t.label}</small>
          </button>)}
        </div>
      </div>
      <div className="campo"><span>Nombre</span><input value={business.name} maxLength={60} aria-invalid={triedNext && !!errores.name} onChange={(e) => setBusiness({ ...business, name: e.target.value })} placeholder="Ej: Barbería El Roble" />
        {triedNext && errores.name && <p className="campo-error" role="alert">{errores.name}</p>}</div>
      <div className="campo"><span>WhatsApp</span><input inputMode="tel" value={business.phone} aria-invalid={triedNext && !!errores.phone} onChange={(e) => setBusiness({ ...business, phone: e.target.value })} placeholder="351 555 0194" />
        {triedNext && errores.phone && <p className="campo-error" role="alert">{errores.phone}</p>}</div>
      <div className="campo"><span>¿Dónde te encontrás?</span>
        <div className="mini-tabs" role="tablist" aria-label="Cómo cargar la ubicación">
          <button type="button" role="tab" aria-selected={ubicTab === "texto"} className={ubicTab === "texto" ? "on" : ""} onClick={() => setUbicTab("texto")}>Dirección</button>
          <button type="button" role="tab" aria-selected={ubicTab === "link"} className={ubicTab === "link" ? "on" : ""} onClick={() => setUbicTab("link")}>Link de Maps</button>
        </div>
        {ubicTab === "texto"
          ? <input value={business.address} maxLength={120} onChange={(e) => setBusiness({ ...business, address: e.target.value })} placeholder="Güemes 742, Córdoba" />
          : <input inputMode="url" value={business.mapsUrl} aria-invalid={triedNext && !!errores.mapsUrl} onChange={(e) => setBusiness({ ...business, mapsUrl: e.target.value })} placeholder="https://maps.app.goo.gl/…" />}
        {triedNext && errores.mapsUrl
          ? <p className="campo-error" role="alert">{errores.mapsUrl}</p>
          : <p className="ayuda">{ubicTab === "texto" ? "Opcional. Se muestra en tu página de reservas." : "Opcional. Pegá el enlace de Google Maps: tus clientes tocan “Cómo llegar” y les abre la app."}</p>}
      </div>
      <div className="campo"><span>Color de marca</span>
        <div className="tema-grid" style={{ marginBottom: 10 }}>
          {SWATCHES.map((c) => <button key={c} type="button" aria-label={`Usar color ${c}`} style={{ background: c }} className={`tema-sw ${c.toLowerCase() === business.accent.toLowerCase() ? "sel" : ""}`} onClick={() => setBusiness({ ...business, accent: c })} />)}
        </div>
        <input type="color" aria-label="Color personalizado" value={business.accent} onChange={(e) => setBusiness({ ...business, accent: e.target.value })} />
      </div>
      <button className="btn btn-acento block" disabled={saving || (triedNext && hayErrores)} onClick={nextBusiness}>Seguir</button>
    </section>}

    {step === 1 && <section>
      <button className="bk-volver" onClick={() => setStep(0)}><ArrowLeft /> Volver</button>
      <p className="eyebrow">2 DE 3 · TUS SERVICIOS</p>
      <h1 style={{ marginBottom: 6 }}>¿Qué pueden reservar?</h1>
      <div className="hint"><span className="hint-emo">{businessTypeById(business.businessType).emoji}</span><div><b>Te dejamos los típicos de {businessTypeById(business.businessType).label.toLowerCase()}</b><p>Destildá los que no ofrecés y ajustá los precios. Después sumás más.</p></div></div>
      <div className="svc-picks">
        {rows.map((r, i) => <div className={`svc-pick ${r.on ? "on" : ""}`} key={`${r.name}-${i}`}>
          <span className="emo">{r.emoji}</span>
          <div className="info"><b>{r.name}</b><small>{r.durationMinutes} min</small></div>
          <label className="price"><span>$</span><input type="number" min="0" value={Math.round(r.priceCents / 100)} onChange={(e) => setRow(i, { priceCents: Math.max(0, +e.target.value) * 100 })} /></label>
          <button type="button" className="tick" aria-pressed={r.on} aria-label={r.on ? `Quitar ${r.name}` : `Agregar ${r.name}`} onClick={() => setRow(i, { on: !r.on })}>{r.on && <Check />}</button>
        </div>)}
      </div>
      <button className="btn btn-acento block" style={{ marginTop: 14 }} disabled={!activos} onClick={nextService}>{activos ? `Crear ${activos} servicio${activos > 1 ? "s" : ""}` : "Elegí al menos uno"}</button>
    </section>}

    {step === 2 && <section>
      <button className="bk-volver" onClick={() => setStep(1)}><ArrowLeft /> Volver</button>
      <p className="eyebrow">3 DE 3 · TU PLAN</p>
      <h1 style={{ marginBottom: 6 }}>Probalo 7 días gratis</h1>
      <p className="bk-sub">Elegí con qué plan arrancás. Cambiás cuando quieras — los 7 días son gratis igual.</p>
      <button type="button" className={`plan-opt ${planElegido === "TURNOS" ? "on" : ""}`} onClick={() => setPlanElegido("TURNOS")}>
        <span className="emo"><Clock3 /></span>
        <div className="info"><span className="nom">Turnos · $ 15.000/mes</span><span className="sub">Agenda, reservas, clientes, promos, wa.me y email.</span></div>
        <span className="plan-check">{planElegido === "TURNOS" && <Check />}</span>
      </button>
      <button type="button" className={`plan-opt destacado ${planElegido === "TURNOS_AUTO" ? "on" : ""}`} onClick={() => setPlanElegido("TURNOS_AUTO")}>
        <span className="emo"><Sparkles /></span>
        <div className="info"><span className="nom">Turnos Pro · $ 30.000/mes <em className="plan-badge">Más completo</em></span><span className="sub">Todo Turnos + hasta 3 profesionales con agenda propia y temas visuales.</span></div>
        <span className="plan-check">{planElegido === "TURNOS_AUTO" && <Check />}</span>
      </button>
      {initial.mp
        ? <button className="btn btn-acento block" disabled={finishing} onClick={() => finish(true)}>
            <CreditCard /> {finishing ? "Conectando con Mercado Pago…" : "Empezar prueba gratis"}
          </button>
        : <button className="btn btn-acento block" disabled={finishing} onClick={() => finish(false)}>
            {finishing ? "Preparando tu agenda…" : "Empezar mi prueba gratis"}
          </button>}
      <p style={{ fontSize: 12, color: "var(--tinta-suave)", textAlign: "center", marginTop: 12, fontWeight: 700 }}>
        {initial.mp
          ? "Dejás la tarjeta autorizada en Mercado Pago. No se cobra nada ahora: el primer débito recién llega al terminar los 7 días, y cancelás cuando quieras."
          : "No se cobra nada ahora. Mercado Pago se vincula desde Ajustes → Suscripción."}
      </p>
    </section>}
  </main>;
}
