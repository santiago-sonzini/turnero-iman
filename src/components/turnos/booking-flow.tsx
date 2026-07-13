"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ArrowLeft, CalendarPlus, Check, Clock3, Instagram, MapPin, MessageCircle, X } from "lucide-react";
import { bookPublic, cancelPublicAppointment, claimPublicAppointmentAccess } from "@/app/actions/turnos";
import { isVacation, weekdayOf } from "@/lib/availability";
import { whatsappUrl } from "@/lib/phone";
import { MagnetLogo } from "./magnet-logo";

const money = (c: number) => new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 0 }).format(c / 100);
const CONFETI = ["#E94F37", "#FFC53D", "#35B36B", "#246BCE", "#7656D6", "#FFFDF8"];

export function BookingFlow({ initial, promoToken, preStaffId }: { initial: any; promoToken?: string; preStaffId?: string }) {
  const router = useRouter();
  const staffList: any[] = useMemo(() => initial.staff ?? [], [initial.staff]);
  const [step, setStep] = useState(0);
  const [service, setService] = useState<any>(null);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  // "" = cualquier profesional. Un ?prof= válido lo preselecciona.
  const [staffId, setStaffId] = useState<string>(preStaffId && staffList.some((s) => s.id === preStaffId) ? preStaffId : "");
  const [saving, start] = useTransition();
  const [result, setResult] = useState<any>(null);
  const [form, setForm] = useState({ name: "", phone: "", email: "" });
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [cancelStep, setCancelStep] = useState<"idle" | "confirm" | "done">("idle");
  const [cancelErr, setCancelErr] = useState("");
  const [accessErr, setAccessErr] = useState("");

  const showPrices = initial.profile.showPrices !== false;
  const vacations = initial.profile.vacations ?? [];
  const horizonDays = Math.min(90, Math.max(1, initial.horizonDays ?? 14));
  const days = useMemo(() => Array.from({ length: horizonDays }, (_, i) => { const d = new Date(); d.setDate(d.getDate() + i); return d; }), [horizonDays]);
  const openWeekdays = useMemo(() => new Set(initial.hours.map((h: any) => h.weekday)), [initial.hours]);

  // Profesionales que ofrecen el servicio elegido (sin servicios asignados = todos).
  const staffParaServicio = useMemo(
    () => service ? staffList.filter((s: any) => !s.serviceIds?.length || s.serviceIds.includes(service.id)) : staffList,
    [service, staffList],
  );
  // Si el profe elegido no ofrece el servicio nuevo, volvemos a "cualquiera".
  useEffect(() => {
    if (staffId && service && !staffParaServicio.some((s: any) => s.id === staffId)) setStaffId("");
  }, [service, staffId, staffParaServicio]);

  const slots: string[] = service && date
    ? initial.availability?.[`${service.id}|${date}|${staffId || "*"}`] ?? []
    : [];

  // Magic link: el fragmento no se envía al servidor ni como Referer. Se
  // intercambia una vez por una cookie HttpOnly y luego se limpia la URL.
  useEffect(() => {
    const raw = window.location.hash.startsWith("#booking=")
      ? decodeURIComponent(window.location.hash.slice("#booking=".length))
      : "";
    if (!raw) return;
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
    const separator = raw.indexOf(".");
    if (separator < 1) { setAccessErr("El enlace de tu turno no es válido."); return; }
    const appointmentId = raw.slice(0, separator);
    const token = raw.slice(separator + 1);
    void claimPublicAppointmentAccess({ slug: initial.tenant.slug, appointmentId, token }).then((response) => {
      if (!response.ok) { setAccessErr(response.error); return; }
      router.refresh();
    });
  }, [initial.tenant.slug, router]);

  const staffElegido = staffId ? staffParaServicio.find((s: any) => s.id === staffId) : null;

  const submit = () => start(async () => {
    const r = await bookPublic({ slug: initial.tenant.slug, serviceId: service.id, date, time, staffId: staffId || undefined, ...form, marketingConsent, promoToken });
    setResult(r);
    if (r.ok) { setStep(3); window.scrollTo({ top: 0 }); }
  });

  const cancelBooking = () => start(async () => {
    setCancelErr("");
    const r = await cancelPublicAppointment(initial.tenant.slug, result?.appointmentId);
    if (!r.ok) { setCancelErr(r.error); setCancelStep("idle"); return; }
    setCancelStep("done");
  });

  const prettyDate = date ? new Date(`${date}T12:00:00-03:00`).toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" }) : "";

  const addToCalendar = () => {
    const startAt = new Date(`${date}T${time}:00-03:00`);
    const endAt = new Date(startAt.getTime() + service.durationMinutes * 60000);
    const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    const title = `${service.emoji} ${service.name} — ${initial.profile.name}`;
    const location = initial.profile.address ?? "";
    if (/android/i.test(navigator.userAgent)) {
      const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${fmt(startAt)}/${fmt(endAt)}&location=${encodeURIComponent(location)}&details=${encodeURIComponent(`Turno en ${initial.profile.name}. Reservado con Imán Turnos.`)}`;
      window.open(url, "_blank");
      return;
    }
    const ics = [
      "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Iman Turnos//ES", "BEGIN:VEVENT",
      `UID:${date}-${time.replace(":", "")}@iman-turnos`,
      `DTSTAMP:${fmt(new Date())}`, `DTSTART:${fmt(startAt)}`, `DTEND:${fmt(endAt)}`,
      `SUMMARY:${title}`, `LOCATION:${location}`,
      `DESCRIPTION:Turno en ${initial.profile.name}. Reservado con Imán Turnos.`,
      "END:VEVENT", "END:VCALENDAR",
    ].join("\r\n");
    const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url; a.download = "turno.ics"; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  };

  return <main className="bk" data-theme={initial.profile.theme ?? "clasico"} style={{ "--acento": initial.profile.accent } as React.CSSProperties}>
    <header className="bk-hero">
      <span className="powered"><MagnetLogo /> Imán Turnos</span>
      <div className="foto">{initial.profile.logoUrl
        ? <Image src={initial.profile.logoUrl} alt={`Logo de ${initial.profile.name}`} width={96} height={96} unoptimized />
        : initial.services[0]?.emoji ?? "🧲"}</div>
      <h1>{initial.profile.name}</h1>
      {initial.profile.mapsUrl
        ? <a className="meta meta-link" href={initial.profile.mapsUrl} target="_blank" rel="noopener noreferrer"><MapPin /> {initial.profile.address || "Cómo llegar"}</a>
        : initial.profile.address && <p className="meta"><MapPin /> {initial.profile.address}</p>}
      {initial.profile.instagram && <a className="meta meta-link" href={`https://instagram.com/${initial.profile.instagram}`} target="_blank" rel="noopener noreferrer"><Instagram /> @{initial.profile.instagram}</a>}
    </header>

      {accessErr && <p className="form-error" role="alert">{accessErr}</p>}
      {initial.promo && step < 3 && <div className="promo-banner"><span>🎁</span><div><b>{initial.promo.name}</b><p>{initial.promo.message}</p></div></div>}

    {step < 3 && <div className="bk-prog">
      {[0, 1, 2].map((i) => <span key={i} className={`step ${i < step ? "done" : i === step ? "now" : ""}`}><i /></span>)}
    </div>}

    {step === 0 && <section className="bk-body">
      {initial.misTurnos && <ReturningClient mis={initial.misTurnos} slug={initial.tenant.slug} windowHours={initial.profile.cancelWindowHours ?? 48} />}
      <h2 className="bk-titulo">¿Qué te hacemos?</h2>
      <p className="bk-sub">Elegí un servicio para ver los horarios libres.</p>
      {initial.services.map((s: any) => <button className="svc" key={s.id} onClick={() => { setService(s); setDate(""); setTime(""); setStep(1); }}>
        <span className="em">{s.emoji}</span>
        <span className="info"><span className="nom">{s.name}</span><span className="dur"><Clock3 /> {s.durationMinutes} min</span></span>
        {showPrices && <span className="precio">{money(s.priceCents)}</span>}
      </button>)}
    </section>}

    {step === 1 && <section className="bk-body">
      <button className="bk-volver" onClick={() => setStep(0)}><ArrowLeft /> Cambiar servicio</button>
      <h2 className="bk-titulo">¿Cuándo venís?</h2>
      <p className="bk-sub">{service.emoji} {service.name} · {service.durationMinutes} min</p>
      {staffParaServicio.length > 0 && <div className="prof-picker">
        <span className="prof-label">¿Con quién?</span>
        <div className="prof-chips">
          <button className={`prof-chip ${!staffId ? "on" : ""}`} onClick={() => { setStaffId(""); setTime(""); }}>Cualquiera</button>
          {staffParaServicio.map((s: any) => <button key={s.id} className={`prof-chip ${staffId === s.id ? "on" : ""}`} onClick={() => { setStaffId(s.id); setTime(""); }}>{s.emoji} {s.name}</button>)}
        </div>
      </div>}
      <div className="dias-scroll">
        {days.map((d) => {
          const key = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).format(d);
          const closed = !openWeekdays.has(weekdayOf(key)) || isVacation(key, vacations);
          return <button key={key} disabled={closed} className={`dia-pastilla ${date === key ? "sel" : ""} ${closed ? "cerrado" : ""}`} onClick={() => { setDate(key); setTime(""); }}>
            <span className="dow">{d.toLocaleDateString("es-AR", { weekday: "short" })}</span>
            <span className="num">{d.getDate()}</span>
            <span className="mes">{d.toLocaleDateString("es-AR", { month: "short" })}</span>
          </button>;
        })}
      </div>
      {date && <>
        <h3 className="bk-titulo" style={{ fontSize: "1.08rem" }}>Horarios libres</h3>
        <div className="horas-grid">
          {slots.length
            ? slots.map((s) => <button key={s} className={`hora-btn ${time === s ? "sel" : ""}`} onClick={() => setTime(s)}>{s}</button>)
            : <p className="sin-horas">No quedan horarios ese día. Probá con otro 🙏</p>}
        </div>
      </>}
      <div className="bk-cta"><button className="btn btn-acento block" disabled={!time} onClick={() => setStep(2)}>Continuar</button></div>
    </section>}

    {step === 2 && <section className="bk-body">
      <button className="bk-volver" onClick={() => { setResult(null); setStep(1); }}><ArrowLeft /> Cambiar horario</button>
      <h2 className="bk-titulo">¿A nombre de quién?</h2>
      <p className="bk-sub">Último paso y el turno queda tuyo.</p>
      <div className="resumen">
        <div className="r-fila"><span className="k">Servicio</span><span className="v">{service.emoji} {service.name}</span></div>
        {staffList.length > 0 && <div className="r-fila"><span className="k">Con</span><span className="v">{staffElegido ? `${staffElegido.emoji} ${staffElegido.name}` : "Cualquiera disponible"}</span></div>}
        <div className="r-fila"><span className="k">Día</span><span className="v">{prettyDate}</span></div>
        <div className="r-fila"><span className="k">Hora</span><span className="v">{time}</span></div>
        {showPrices && <div className="r-fila r-total"><span className="k">Total</span><span className="v">{money(service.priceCents)}</span></div>}
      </div>
      <label className="campo"><span>Tu nombre</span><input autoComplete="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
      <label className="campo"><span>WhatsApp</span><input type="tel" inputMode="tel" autoComplete="tel" placeholder="351 555 0194" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <p className="ayuda">Te contactamos por acá si hay algún cambio.</p></label>
      <label className="campo"><span>Email <em className="opt">opcional</em></span><input type="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
      <button type="button" className={`consent ${marketingConsent ? "on" : ""}`} aria-pressed={marketingConsent} onClick={() => setMarketingConsent((v) => !v)}>
        <Smiley happy={marketingConsent} />
        <span className="info">
          <b>Quiero recibir promociones</b>
          <small>{marketingConsent ? "Podemos avisarte de huecos y promociones." : "Solo vas a recibir mensajes sobre este turno."}</small>
        </span>
        <span className="check">{marketingConsent && <Check />}</span>
      </button>
      {result && !result.ok && <p className="form-error">{result.error}</p>}
      <div className="bk-cta">
        <button className="btn btn-acento block" disabled={saving || form.name.trim().length < 2 || form.phone.replace(/\D/g, "").length < 8} onClick={submit}>
          {saving ? "Guardando tu turno…" : "Confirmar turno"}
        </button>
      </div>
    </section>}

    {step === 3 && <section className="bk-ok">
      {cancelStep !== "done" && <div className="confeti" aria-hidden="true">
        {Array.from({ length: 26 }, (_, i) => <i key={i} style={{
          left: `${(i * 37) % 100}%`,
          background: CONFETI[i % CONFETI.length],
          animationDuration: `${2.2 + ((i * 13) % 10) / 6}s`,
          animationDelay: `${((i * 7) % 12) / 10}s`,
        }} />)}
      </div>}
      {cancelStep === "done" ? <>
        <div className="marca-ok cancelado"><X strokeWidth={3} /></div>
        <h1>Turno cancelado</h1>
        <p className="sub">Liberaste tu lugar. Podés reservar otro cuando quieras.</p>
        <div className="bk-ok-acciones">
          <button className="btn btn-acento block" onClick={() => { setService(null); setDate(""); setTime(""); setResult(null); setCancelStep("idle"); setStep(0); window.scrollTo({ top: 0 }); }}>Reservar otro turno</button>
        </div>
      </> : <>
        <div className="marca-ok"><Check strokeWidth={3} /></div>
        <h1>¡Turno confirmado!</h1>
        <p className="sub">{prettyDate} · {time} hs</p>
        <div className="resumen">
          <div className="r-fila"><span className="k">Servicio</span><span className="v">{service.emoji} {service.name}</span></div>
          {result?.staff && <div className="r-fila"><span className="k">Con</span><span className="v">{result.staff.emoji} {result.staff.name}</span></div>}
          {(initial.profile.address || initial.profile.mapsUrl) && <div className="r-fila"><span className="k">Dónde</span><span className="v">{initial.profile.mapsUrl
            ? <a href={initial.profile.mapsUrl} target="_blank" rel="noopener noreferrer" className="meta-link">{initial.profile.address || "Ver en Maps"}</a>
            : initial.profile.address}</span></div>}
          {showPrices && <div className="r-fila r-total"><span className="k">Total</span><span className="v">{money(service.priceCents)}</span></div>}
        </div>
        <div className="bk-ok-acciones">
          <button className="btn btn-acento block" onClick={addToCalendar}><CalendarPlus /> Agregar a calendario</button>
          {initial.profile.phone && <a className="btn btn-wa block" href={whatsappUrl(initial.profile.phone)} target="_blank" rel="noopener noreferrer"><MessageCircle /> Escribir al negocio</a>}
        </div>
        {result?.appointmentId && initial.profile.cancelWindowHours > 0 && <div className="bk-ok-cancelar">
          {cancelStep === "confirm"
            ? <><p className="bk-cancel-q">¿Seguro que querés cancelar este turno?</p>
                <div className="bk-cancel-row">
                  <button className="btn btn-fantasma" disabled={saving} onClick={cancelBooking}>{saving ? "Cancelando…" : "Sí, cancelar"}</button>
                  <button className="btn" disabled={saving} onClick={() => setCancelStep("idle")}>No</button>
                </div></>
            : <button className="bk-cancel-link" onClick={() => setCancelStep("confirm")}>Cancelar turno</button>}
          {cancelErr && <p className="form-error" style={{ marginTop: 8 }}>{cancelErr}</p>}
        </div>}
      </>}
    </section>}

    <footer className="bk-foot"><a href="/" target="_blank" rel="noopener noreferrer">Reservas con <MagnetLogo /> <b>Imán Turnos</b></a></footer>
  </main>;
}

// Cliente que ya reservó antes (cookie con su token): saludo, sus turnos y
// cancelación online hasta N horas antes (N lo define el negocio).
function ReturningClient({ mis, slug, windowHours }: { mis: any; slug: string; windowHours: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [now] = useState(() => Date.now());
  const fmt = (v: string) => new Date(v).toLocaleString("es-AR", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "America/Argentina/Buenos_Aires" });
  const fmtDay = (v: string) => new Date(v).toLocaleDateString("es-AR", { day: "numeric", month: "long", timeZone: "America/Argentina/Buenos_Aires" });
  const upcoming = mis.appointments.filter((a: any) => new Date(a.startsAt).getTime() >= now).sort((a: any, b: any) => +new Date(a.startsAt) - +new Date(b.startsAt));
  const last = mis.appointments.find((a: any) => new Date(a.startsAt).getTime() < now);
  const cancel = (id: string) => start(async () => {
    setError("");
    const r = await cancelPublicAppointment(slug, id);
    if (!r.ok) { setError(r.error); setConfirmId(null); return; }
    setConfirmId(null);
    router.refresh();
  });
  return <div className="mis-turnos">
    <div className="mt-head"><Smiley happy /><div><b>¡Hola de nuevo, {mis.name.split(" ")[0]}! 👋</b><small>{upcoming.length ? "Tus próximos turnos" : "Reservá tu próximo turno acá abajo"}</small></div></div>
    {upcoming.map((a: any) => <div className="mt-row" key={a.id}>
      <span className="em">{a.service.emoji}</span>
      <div className="info"><b>{a.service.name}</b><small>{fmt(a.startsAt)} hs</small></div>
      {confirmId === a.id
        ? <span className="mt-confirm"><button className="si" disabled={pending} onClick={() => cancel(a.id)}>{pending ? "…" : "Sí"}</button><button className="no" disabled={pending} onClick={() => setConfirmId(null)}>No</button></span>
        : <button className="mt-cancel" onClick={() => setConfirmId(a.id)}>Cancelar</button>}
    </div>)}
    {upcoming.length > 0 && windowHours > 0 && <p className="mt-note">Podés cancelar online hasta {windowHours} h antes del turno.</p>}
    {error && <p className="form-error" style={{ marginTop: 8 }}>{error}</p>}
    {!upcoming.length && last && <p className="mt-last">Tu última visita fue <b>{last.service.name}</b> el {fmtDay(last.startsAt)}.</p>}
  </div>;
}

// Carita que sonríe con el consentimiento activado y se entristece al apagarlo.
function Smiley({ happy }: { happy: boolean }) {
  return (
    <svg className={`smiley ${happy ? "happy" : "sad"}`} viewBox="0 0 48 48" aria-hidden="true">
      <circle className="face" cx="24" cy="24" r="20" />
      <circle className="eye" cx="17.5" cy="20" r="2.4" />
      <circle className="eye" cx="30.5" cy="20" r="2.4" />
      <circle className="cheek" cx="13" cy="27" r="2.8" />
      <circle className="cheek" cx="35" cy="27" r="2.8" />
      <path className="mouth smile" d="M15 28 Q24 37 33 28" />
      <path className="mouth frown" d="M15 33 Q24 25 33 33" />
    </svg>
  );
}
