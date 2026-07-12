"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Check, ChevronLeft, ChevronRight, Copy, ExternalLink, LogOut, MessageCircle, Plus, Scissors, Settings, Share2, Sparkles, Trash2, Users, X } from "lucide-react";
import { acceptWhatsappRisk, createPromotion, crearTurnoManual, deleteStaff, ownerAvailability, queueGapFill, saveBookingSettings, saveNotifications, saveProfile, saveService, saveStaff, saveTheme, setAppointmentStatus } from "@/app/actions/turnos";
import { signOut } from "@/app/actions/auth";
import { MagnetLogo } from "./magnet-logo";
import Image from "next/image";

type Screen = "agenda" | "clientes" | "promos" | "servicios" | "ajustes";
const money = (cents: number) => new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 0 }).format(cents / 100);
const dayKey = (d: Date) => d.toISOString().slice(0, 10);
const localDay = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).format(d);
const wa = (phone: string, text: string) => `https://wa.me/54${phone.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`;
const hhmm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
const timeAt = (d: Date) => d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false });
const minutesOf = (d: Date) => d.getHours() * 60 + d.getMinutes();
const initials = (name: string) => name.split(" ").map((x) => x[0]).slice(0, 2).join("").toUpperCase();

export function AppShell({ data }: { data: any }) {
  const [screen, setScreen] = useState<Screen>("agenda");
  const [date, setDate] = useState(new Date());
  const [view, setView] = useState<"dia" | "semana" | "mes">("dia");
  const [sheet, setSheet] = useState<any>(null);
  const accent = data.profile?.accent ?? "#E94F37";
  const appointments = useMemo(() => data.appointments.map((a: any) => ({ ...a, startsAt: new Date(a.startsAt), endsAt: new Date(a.endsAt) })), [data.appointments]);

  const nav = (to: Screen) => { setScreen(to); setSheet(null); };
  return (
    <div className="app" style={{ "--acento": accent } as React.CSSProperties}>
      <header className="top">
        <button className="marca" onClick={() => nav("agenda")}>
          <MagnetLogo particles />
          <span><span style={{ display: "block", lineHeight: 1.15 }}>Imán</span><small>{data.profile?.name ?? data.tenant.name}</small></span>
        </button>
        <span className="top-sp" />
        <div className="top-acciones">
          <button className="btn sm" onClick={() => setSheet({ type: "share" })}><Share2 /> Compartir</button>
          <CopyLinkButton path={`/${data.tenant.slug}/turnos`} className="btn sm icon-btn" />
        </div>
      </header>

      <main key={screen} className={`pantalla ${screen === "agenda" ? "con-fab" : ""}`}>
        {screen === "agenda" && <Agenda date={date} setDate={setDate} view={view} setView={setView} appointments={appointments} hours={data.workingHours} clients={data.clients} onSheet={setSheet} />}
        {screen === "clientes" && <Clients clients={data.clients} profile={data.profile} />}
        {screen === "promos" && <Promos promotions={data.promotions} slug={data.tenant.slug} onCreate={() => setSheet({ type: "promo" })} />}
        {screen === "servicios" && <Services services={data.services} hours={data.workingHours} onCreate={() => setSheet({ type: "service" })} />}
        {screen === "ajustes" && <SettingsScreen data={data} onEdit={() => setSheet({ type: "profile" })} onWhatsapp={() => setSheet({ type: "whatsapp" })} onBooking={() => setSheet({ type: "booking" })} onNotif={() => setSheet({ type: "notif" })} onStaff={() => setSheet({ type: "staff" })} onTheme={() => setSheet({ type: "theme" })} />}
      </main>

      {screen === "agenda" && <button className="fab fab-txt" aria-label="Crear turno" onClick={() => setSheet({ type: "manual" })}><Plus /> Crear turno</button>}

      <nav className="tabbar">
        <Tab active={screen === "agenda"} icon={<CalendarDays />} label="Agenda" onClick={() => nav("agenda")} />
        <Tab active={screen === "clientes"} icon={<Users />} label="Clientes" onClick={() => nav("clientes")} />
        <Tab active={screen === "promos"} icon={<Sparkles />} label="Promos" onClick={() => nav("promos")} />
        <Tab active={screen === "servicios"} icon={<Scissors />} label="Servicios" onClick={() => nav("servicios")} />
        <Tab active={screen === "ajustes"} icon={<Settings />} label="Ajustes" onClick={() => nav("ajustes")} />
      </nav>

      {sheet && <Sheet onClose={() => setSheet(null)}>{(close: () => void) => <>
        {sheet.type === "gap" && <GapSheet close={close} gap={sheet.gap} clients={data.clients} profile={data.profile} slug={data.tenant.slug} promotions={data.promotions} auto={data.tenant.plan === "TURNOS_AUTO" && !!data.tenant.whatsappRiskAcceptedAt} />}
        {sheet.type === "appointment" && <AppointmentSheet close={close} appointment={sheet.appointment} />}
        {sheet.type === "service" && <ServiceSheet close={close} />}
        {sheet.type === "promo" && <PromoSheet close={close} services={data.services} />}
        {sheet.type === "profile" && <ProfileSheet close={close} profile={data.profile} />}
        {sheet.type === "whatsapp" && <WhatsappSheet close={close} qr={data.whatsapp?.qrCode} eligible={data.tenant.plan === "TURNOS_AUTO"} accepted={!!data.tenant.whatsappRiskAcceptedAt} />}
        {sheet.type === "booking" && <BookingSettingsSheet close={close} tenant={data.tenant} profile={data.profile} />}
        {sheet.type === "manual" && <ManualSheet close={close} services={data.services} clients={data.clients} staff={data.staff ?? []} />}
        {sheet.type === "share" && <ShareSheet close={close} slug={data.tenant.slug} name={data.profile?.name ?? data.tenant.name} staff={data.staff ?? []} />}
        {sheet.type === "notif" && <NotificationsSheet close={close} profile={data.profile} />}
        {sheet.type === "staff" && <StaffSheet close={close} staff={data.staff ?? []} />}
        {sheet.type === "theme" && <ThemeSheet close={close} profile={data.profile} />}
      </>}</Sheet>}
    </div>
  );
}

function Tab({ active, icon, label, onClick }: any) {
  return <button className={active ? "activo" : ""} onClick={onClick}>{icon}<span>{label}</span><i className="pt" /></button>;
}

/* ---------- agenda -------------------------------------------------------- */

function buildDay(date: Date, appointments: any[], hours: any[]) {
  const weekday = date.getDay();
  const dayHours = hours.filter((h: any) => h.weekday === weekday && h.active);
  const items = appointments.filter((a: any) => localDay(a.startsAt) === localDay(date) && a.status !== "CANCELADO");
  const rows: any[] = [];
  if (dayHours.length) {
    const start = dayHours[0].startMinutes;
    const end = dayHours.at(-1).endMinutes;
    let cursor = start;
    for (const a of items) {
      const m = minutesOf(a.startsAt);
      if (m > cursor + 14) rows.push({ type: "gap", start: cursor, end: m });
      rows.push({ type: "appointment", appointment: a });
      cursor = Math.max(cursor, minutesOf(a.endsAt));
    }
    if (cursor < end) rows.push({ type: "gap", start: cursor, end });
  }
  const openMin = dayHours.reduce((acc: number, h: any) => acc + h.endMinutes - h.startMinutes, 0);
  const bookedMin = items.reduce((acc: number, a: any) => acc + (a.endsAt.getTime() - a.startsAt.getTime()) / 60000, 0);
  return { dayHours, items, rows, openMin, bookedMin };
}

function Agenda({ date, setDate, view, setView, appointments, hours, clients, onSheet }: any) {
  const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(date); d.setDate(date.getDate() - 3 + i); return d; });
  const isToday = localDay(date) === localDay(new Date());
  const { dayHours, items, rows, openMin, bookedMin } = buildDay(date, appointments, hours);
  const gaps = rows.filter((r) => r.type === "gap");
  const pct = openMin ? Math.min(100, Math.round((bookedMin / openMin) * 100)) : 0;
  const move = (dir: number) => {
    const d = new Date(date);
    if (view === "mes") d.setMonth(d.getMonth() + dir);
    else d.setDate(d.getDate() + dir * (view === "semana" ? 7 : 1));
    setDate(d);
  };
  return <>
    <div className="fecha-nav">
      <button className="nav-btn" aria-label="Anterior" onClick={() => move(-1)}><ChevronLeft /></button>
      <button className="fecha-lbl" onClick={() => setView(view === "mes" ? "dia" : "mes")}>
        <span className="dia">{view === "mes"
          ? date.toLocaleDateString("es-AR", { month: "long", year: "numeric" })
          : date.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "short" })}
          <span className="caret">▾</span></span>
        {isToday && view === "dia" && <span><span className="hoy-chip">Hoy</span></span>}
      </button>
      <button className="nav-btn" aria-label="Siguiente" onClick={() => move(1)}><ChevronRight /></button>
    </div>
    <div className="seg-fila">
      <div className="seg" role="tablist" aria-label="Vista">
        {(["dia", "semana", "mes"] as const).map((v) => <button key={v} className={view === v ? "on" : ""} onClick={() => setView(v)}>{v === "dia" ? "Día" : v === "semana" ? "Semana" : "Mes"}</button>)}
      </div>
    </div>

    {view === "dia" && <>
      <div className="semana-strip">
        {days.map((d) => {
          const closed = !hours.some((h: any) => h.weekday === d.getDay() && h.active);
          const count = appointments.filter((a: any) => localDay(a.startsAt) === localDay(d) && a.status !== "CANCELADO").length;
          return <button key={dayKey(d)} className={`dia-mini ${localDay(d) === localDay(date) ? "sel" : ""} ${localDay(d) === localDay(new Date()) ? "hoy" : ""} ${closed ? "cerrado" : ""}`} onClick={() => setDate(d)}>
            <div className="dw">{d.toLocaleDateString("es-AR", { weekday: "short" }).slice(0, 2)}</div>
            <div className="dn">{d.getDate()}</div>
            <div className="dots">{Array.from({ length: 3 }, (_, i) => <i key={i} className={i < Math.min(count, 3) ? "on" : ""} />)}</div>
          </button>;
        })}
      </div>
      {dayHours.length > 0 && <div className="ocupa">
        <span className="lbl"><b>{items.length}</b> turno{items.length === 1 ? "" : "s"}</span>
        <span className="barra"><i style={{ width: `${pct}%` }} /></span>
        <span className="huecos-tag">{gaps.length ? `${gaps.length} hueco${gaps.length > 1 ? "s" : ""}` : "sin huecos"}</span>
      </div>}
      <Timeline date={date} rows={rows} dayHours={dayHours} clients={clients} onSheet={onSheet} />
    </>}
    {view === "semana" && <WeekGrid days={days} appointments={appointments} hours={hours} onSelect={(a: any) => { setDate(a.startsAt); onSheet({ type: "appointment", appointment: a }); }} onDay={(d: Date) => { setDate(d); setView("dia"); }} />}
    {view === "mes" && <MonthGrid date={date} appointments={appointments} hours={hours} onSelect={(d: Date) => { setDate(d); setView("dia"); }} />}
  </>;
}

function Timeline({ date, rows, dayHours, clients, onSheet }: any) {
  if (!dayHours.length) return <div className="vacio"><span className="emo">🌙</span><h3>Hoy está cerrado</h3><p>Un día libre también ordena la agenda.</p></div>;
  if (!rows.length) return <div className="vacio"><span className="emo">🧲</span><h3>Día sin turnos</h3><p>Compartí tu link y mirá cómo se llena solo.</p></div>;
  const now = new Date();
  const nowMin = minutesOf(now);
  const today = localDay(date) === localDay(now);
  const past = localDay(date) < localDay(now);
  const futureGap = rows.find((r: any) => r.type === "gap" && !past && (!today || r.end > nowMin));
  const due = clients.filter((c: any) => recurrence(c).tone !== "aldia").length;
  return <div className="tl">
    {rows.map((row: any, index: number) => {
      if (row.type === "appointment") {
        const a = row.appointment;
        return <div className="tl-item" key={a.id}>
          <div className="tl-rail"><div className="h">{timeAt(a.startsAt)}</div><div className="m">{a.service.durationMinutes} min</div></div>
          <div className="tl-body"><AppointmentCard appointment={a} onClick={() => onSheet({ type: "appointment", appointment: a })} /></div>
        </div>;
      }
      const lost = (today && row.end <= nowMin) || past;
      const prime = row.start >= 1020;
      const destacado = row === futureGap;
      const dur = row.end - row.start;
      const durLabel = `${dur >= 60 ? `${Math.floor(dur / 60)} h ` : ""}${dur % 60 ? `${dur % 60} min` : ""}`.trim();
      return <div className="tl-item" key={`g${index}`}>
        <div className="tl-rail"><div className="h">{hhmm(row.start)}</div><div className="m">{durLabel}</div></div>
        <div className="tl-body">
          <button className={`hueco ${destacado ? "destacado" : ""} ${prime ? "prime" : ""} ${lost ? "perdido" : ""}`} disabled={lost} onClick={() => onSheet({ type: "gap", gap: row })}>
            {destacado && <span className="prox">⚡ Próximo hueco</span>}
            <span className="h-fila">
              <span className="h-info">
                <span className="h-rango">🧲 {hhmm(row.start)} – {hhmm(row.end)} <span className="z">💤</span></span>
                <span className="h-sub">{lost ? "Ya pasó" : `${durLabel} libres · ${due} para avisar`}</span>
              </span>
              {!destacado && !lost && <span className="h-mas"><Plus /></span>}
            </span>
            {destacado && <span className="h-acciones"><span className="btn btn-acento btn-llenar">⚡ Llenar hueco</span></span>}
          </button>
        </div>
      </div>;
    })}
  </div>;
}

function AppointmentCard({ appointment: a, onClick }: any) {
  const state = a.status === "ASISTIO" ? "asistio" : a.status === "NO_VINO" ? "novino" : "";
  return <button className={`turno ${state}`} onClick={onClick}>
    <span className="ava">{initials(a.client.name)}</span>
    <span className="info">
      <span className="nom">{a.client.name}</span>
      <span className="det">{a.service.emoji} {a.service.name}{a.staff ? ` · ${a.staff.emoji} ${a.staff.name}` : ""}
        {a.status === "ASISTIO" && <span className="estado-pill ok">✓ asistió</span>}
        {a.status === "NO_VINO" && <span className="estado-pill no">no vino</span>}
      </span>
    </span>
    <span className="lado"><span className="precio">{money(a.service.priceCents)}</span><br /><span className="dur">{a.service.durationMinutes} min</span></span>
  </button>;
}

function WeekGrid({ days, appointments, hours, onSelect, onDay }: any) {
  const START = 8 * 60, END = 21 * 60, SPAN = END - START;
  const marks = [9, 12, 15, 18];
  return <div className="sgrid-wrap"><div className="sgrid">
    <span />
    {days.map((d: Date) => <button key={`c${dayKey(d)}`} className={`sg-cab ${localDay(d) === localDay(new Date()) ? "hoy" : ""}`} onClick={() => onDay(d)}>{d.toLocaleDateString("es-AR", { weekday: "short" }).slice(0, 2)}<b>{d.getDate()}</b></button>)}
    <div className="sg-gut">{marks.map((h) => <i key={h} style={{ top: `${((h * 60 - START) / SPAN) * 100}%` }}>{h}</i>)}</div>
    {days.map((d: Date) => {
      const closed = !hours.some((h: any) => h.weekday === d.getDay() && h.active);
      if (closed) return <div key={dayKey(d)} className="sg-col cerrado">Cerrado</div>;
      const dayItems = appointments.filter((a: any) => localDay(a.startsAt) === localDay(d) && a.status !== "CANCELADO");
      return <div key={dayKey(d)} className={`sg-col ${localDay(d) === localDay(new Date()) ? "hoy" : ""}`}>
        {dayItems.map((a: any) => {
          const top = ((minutesOf(a.startsAt) - START) / SPAN) * 100;
          const height = Math.max(4, ((minutesOf(a.endsAt) - minutesOf(a.startsAt)) / SPAN) * 100);
          return <button key={a.id} className={`sg-ev ${a.endsAt < new Date() ? "pasado" : ""}`} style={{ top: `${top}%`, height: `${height}%` }} onClick={() => onSelect(a)}>{timeAt(a.startsAt)} {a.client.name.split(" ")[0]}</button>;
        })}
      </div>;
    })}
  </div></div>;
}

function MonthGrid({ date, appointments, hours, onSelect }: any) {
  const first = new Date(date.getFullYear(), date.getMonth(), 1);
  const start = new Date(first); start.setDate(first.getDate() - first.getDay());
  const days = Array.from({ length: 42 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return d; });
  const openMinutes = (weekday: number) => hours.filter((h: any) => h.weekday === weekday && h.active).reduce((acc: number, h: any) => acc + h.endMinutes - h.startMinutes, 0);
  return <>
    <div className="mes-grid">
      {["Do", "Lu", "Ma", "Mi", "Ju", "Vi", "Sá"].map((x) => <span className="mes-cab" key={x}>{x}</span>)}
      {days.map((d) => {
        const items = appointments.filter((a: any) => localDay(a.startsAt) === localDay(d) && a.status !== "CANCELADO");
        const open = openMinutes(d.getDay());
        // El día se va "llenando" según cuánto de la jornada está ocupada.
        const booked = items.reduce((acc: number, a: any) => acc + (a.endsAt.getTime() - a.startsAt.getTime()) / 60000, 0);
        const pct = open ? Math.min(100, Math.round((booked / open) * 100)) : 0;
        return <button key={dayKey(d)} className={`mes-dia ${d.getMonth() !== date.getMonth() ? "fuera" : ""} ${!open ? "cerrado" : ""} ${pct >= 95 ? "lleno" : ""} ${localDay(d) === localDay(new Date()) ? "hoy" : ""} ${localDay(d) === localDay(date) ? "sel" : ""}`} onClick={() => onSelect(d)}>
          {open > 0 && <span className="fill" style={{ height: `${pct}%` }} />}
          <span className="d">{d.getDate()}</span>
          {items.length > 0 && <span className="cnt">{items.length}</span>}
        </button>;
      })}
    </div>
    <p className="mes-leyenda">Cada día se llena según los turnos · tocá uno para verlo</p>
  </>;
}

/* ---------- clientes ------------------------------------------------------ */

function recurrence(c: any) {
  const last = c.appointments?.[0] ? new Date(c.appointments[0].startsAt) : null;
  if (!last || !c.expectedCycleDays) return { tone: "letoca", label: "Sin ciclo" };
  const days = Math.floor((Date.now() - last.getTime()) / 86400000);
  const ratio = days / c.expectedCycleDays;
  if (ratio >= 1.2) return { tone: "vencida", label: `${days - c.expectedCycleDays} días vencido` };
  if (ratio >= 0.85) return { tone: "letoca", label: "Le toca ahora" };
  return { tone: "aldia", label: "Al día" };
}

function Clients({ clients, profile }: any) {
  const [query, setQuery] = useState("");
  const order: Record<string, number> = { vencida: 0, letoca: 1, aldia: 2 };
  const list = clients
    .filter((c: any) => `${c.name}${c.phone}`.toLowerCase().includes(query.toLowerCase()))
    .sort((a: any, b: any) => order[recurrence(a).tone]! - order[recurrence(b).tone]!);
  return <>
    <div className="seccion-tit"><h2>Clientes</h2><span className="chip">{clients.length}</span></div>
    <div className="buscador"><Users /><input placeholder="Buscá por nombre o WhatsApp" value={query} onChange={(e) => setQuery(e.target.value)} /></div>
    {!list.length && <div className="vacio"><span className="emo">🫶</span><h3>Todavía nada por acá</h3><p>Tus clientes aparecen solos con cada reserva.</p></div>}
    {list.map((c: any) => {
      const r = recurrence(c);
      return <article className="cli-card" key={c.id}>
        <span className="ava">{initials(c.name)}</span>
        <div className="info">
          <span className="nom">{c.name}</span>
          <span className="sub">{c.phone}</span>
          <span className={`sem ${r.tone}`}><i className="pto" />{r.label}</span>
        </div>
        <a className="wa-redondo" href={wa(c.phone, `Hola ${c.name.split(" ")[0]} 👋 ¿Querés reservar tu próximo turno en ${profile.name}?`)} target="_blank" aria-label={`WhatsApp a ${c.name}`}><MessageCircle /></a>
      </article>;
    })}
  </>;
}

/* ---------- promos / servicios / ajustes ---------------------------------- */

function Promos({ promotions, slug, onCreate }: any) {
  return <>
    <div className="seccion-tit"><h2>Promos</h2><button className="btn sm btn-acento" onClick={onCreate}><Plus /> Crear</button></div>
    <div className="hint"><span className="hint-emo">🎁</span><div><b>Primero sumá valor</b><p>Un lavado, perfilado o café vende mejor que bajar el precio.</p></div></div>
    {!promotions.length && <div className="vacio"><span className="emo">⚡</span><h3>Sin promos activas</h3><p>Crear una lleva 3 toques. Probá con tu servicio estrella.</p></div>}
    {promotions.map((p: any) => <article className="tarjeta-fila" key={p.id}>
      <span className="emo">{p.kind === "ADD_ON" ? "🎁" : "⚡"}</span>
      <div className="info"><span className="nom">{p.name}</span><span className="sub">{p.message}</span><span className="sub">Vence {new Date(p.expiresAt).toLocaleDateString("es-AR")}</span></div>
      <a className="icon-btn" target="_blank" href={`/${slug}/turnos?promo=${p.token}`} aria-label="Abrir link de la promo"><ExternalLink /></a>
    </article>)}
  </>;
}

function Services({ services, hours, onCreate }: any) {
  return <>
    <div className="seccion-tit"><h2>Servicios</h2><button className="btn sm btn-acento" onClick={onCreate}><Plus /> Nuevo</button></div>
    {services.map((s: any) => <article className="tarjeta-fila" key={s.id}>
      <span className="emo">{s.emoji}</span>
      <div className="info"><span className="nom">{s.name}</span><span className="sub">{s.durationMinutes} min · {money(s.priceCents)}</span></div>
      <span className={`chip ${s.active ? "on" : ""}`}>{s.active ? "Activo" : "Pausado"}</span>
    </article>)}
    <div className="seccion-tit"><h2>Horarios</h2></div>
    <div className="tarjeta">
      {["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"].map((d, i) => {
        const h = hours.find((x: any) => x.weekday === i && x.active);
        return <div className="horas-fila" key={d}><b>{d}</b><span>{h ? `${hhmm(h.startMinutes)} — ${hhmm(h.endMinutes)}` : "Cerrado"}</span></div>;
      })}
    </div>
  </>;
}

function SettingsScreen({ data, onEdit, onWhatsapp, onBooking, onNotif, onStaff, onTheme }: any) {
  const auto = data.tenant.plan === "TURNOS_AUTO" || (data.tenant.addons ?? []).includes("multi_staff");
  const temaLabel: Record<string, string> = { clasico: "Clásico", profesional: "Profesional", noche: "Noche" };
  const router = useRouter();
  const [pending, start] = useTransition();
  const [leaving, startLeaving] = useTransition();
  const health = data.whatsapp?.health ?? "DISCONNECTED";
  const setAccent = (accent: string) => start(async () => {
    await saveProfile({ name: data.profile.name, phone: data.profile.phone ?? "", address: data.profile.address ?? "", instagram: data.profile.instagram ?? "", accent });
    router.refresh();
  });
  return <>
    <div className="seccion-tit"><h2>Ajustes</h2></div>
    <button className="tarjeta-fila" onClick={onEdit}>
      <span className="ava" style={{ width: 50, height: 50 }}>{initials(data.profile.name)}</span>
      <div className="info"><span className="nom">{data.profile.name}</span><span className="sub">{data.profile.address ?? "Sumá tu dirección"}</span></div>
      <ChevronRight />
    </button>
    <div className="seccion-tit"><h2>Tu página de reservas</h2></div>
    <PublicLink slug={data.tenant.slug} />
    <button className="tarjeta-fila" onClick={onBooking}>
      <span className="emo">🗓️</span>
      <div className="info"><span className="nom">Reservas y disponibilidad</span><span className="sub">Link, límite de días, precios y vacaciones</span></div>
      <ChevronRight />
    </button>
    <button className="tarjeta-fila" onClick={onNotif}>
      <span className="emo">📬</span>
      <div className="info"><span className="nom">Avisos por email</span><span className="sub">{data.profile.notifyOnBooking ? `Activado · ${data.profile.notifyEmail ?? ""}` : "Recibí un mail por cada reserva"}</span></div>
      <ChevronRight />
    </button>
    <div className="seccion-tit"><h2>Tema de tu marca</h2>{pending && <span className="chip">Guardando…</span>}</div>
    <div className="tema-grid">
      {["#E94F37", "#C5386A", "#7656D6", "#246BCE", "#1B7B94", "#198754", "#C26A12", "#33231A"].map((c) =>
        <button key={c} aria-label={`Usar color ${c}`} disabled={pending} onClick={() => setAccent(c)} style={{ background: c }} className={`tema-sw ${c.toLowerCase() === String(data.profile.accent).toLowerCase() ? "sel" : ""}`} />)}
    </div>
    <div className="seccion-tit"><h2>Turnos Auto</h2></div>
    {auto && <button className="tarjeta-fila" onClick={onStaff}>
      <span className="emo">💈</span>
      <div className="info"><span className="nom">Profesionales</span><span className="sub">{data.staff?.length ? `${data.staff.length} cargado${data.staff.length === 1 ? "" : "s"} · cada uno con su agenda` : "Sumá hasta 3 y el cliente elige"}</span></div>
      <ChevronRight />
    </button>}
    {auto && <button className="tarjeta-fila" onClick={onTheme}>
      <span className="emo">🎨</span>
      <div className="info"><span className="nom">Tema visual</span><span className="sub">{temaLabel[data.profile.theme ?? "clasico"] ?? "Clásico"} · el estilo de tu página</span></div>
      <ChevronRight />
    </button>}
    {!auto && <a className="tarjeta-fila" href="/suscripcion">
      <span className="emo">✨</span>
      <div className="info"><span className="nom">Subí a Turnos Auto</span><span className="sub">Hasta 3 profesionales y temas visuales para tu página</span></div>
      <ChevronRight />
    </a>}
    <a className="tarjeta-fila" href="/suscripcion">
      <span className="emo">💳</span>
      <div className="info"><span className="nom">Suscripción</span><span className="sub">Plan, débito automático y facturación</span></div>
      <ChevronRight />
    </a>
    <div className="hint"><span className="hint-emo">🔒</span><div><b>Señas para reservas</b><p>Preparado en datos, todavía no disponible.</p></div><em className="lado">Pronto</em></div>
    <button className="btn btn-danger block" style={{ marginTop: 18 }} disabled={leaving} onClick={() => startLeaving(async () => { await signOut(); })}>
      <LogOut /> {leaving ? "Cerrando…" : "Cerrar sesión"}
    </button>
  </>;
}

/* ---------- sheet system --------------------------------------------------- */

function Sheet({ children, onClose }: { children: (close: () => void) => React.ReactNode; onClose: () => void }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setOpen(true));
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { cancelAnimationFrame(id); document.body.style.overflow = prev; };
  }, []);
  const close = () => { setOpen(false); window.setTimeout(onClose, 300); };
  return <>
    <div className={`sheet-bg ${open ? "abierto" : ""}`} onMouseDown={close} />
    <aside role="dialog" aria-modal="true" className={`sheet ${open ? "abierto" : ""}`}>
      <div className="handle" />
      {children(close)}
    </aside>
  </>;
}

function SheetHead({ title, sub, onClose }: { title: React.ReactNode; sub?: React.ReactNode; onClose: () => void }) {
  return <header className="sheet-head">
    <div><h3>{title}</h3>{sub && <p>{sub}</p>}</div>
    <button className="cerrar" aria-label="Cerrar" onClick={onClose}><X /></button>
  </header>;
}

function GapSheet({ gap, clients, profile, slug, promotions, auto, close }: any) {
  const [pending, start] = useTransition();
  const [queued, setQueued] = useState<number | null>(null);
  const step = Math.max(15, profile.slotStepMinutes || 15);
  // Rango que se OFRECE (no el hueco entero): por defecto una ventana corta al
  // inicio del hueco, editable, para no mandar "de 11:15 a 20:00".
  const snap = (m: number) => Math.round(m / step) * step;
  const [desde, setDesde] = useState<number>(snap(gap.start));
  const [hasta, setHasta] = useState<number>(Math.min(snap(gap.start) + Math.max(step, 60), gap.end));
  const startOpts = useMemo(() => { const o: number[] = []; for (let m = snap(gap.start); m < gap.end; m += step) o.push(m); return o; }, [gap.start, gap.end, step]);
  const endOpts = useMemo(() => { const o: number[] = []; for (let m = desde + step; m <= gap.end; m += step) o.push(m); return o; }, [desde, gap.end, step]);
  const pickDesde = (m: number) => { setDesde(m); if (hasta <= m) setHasta(Math.min(m + step, gap.end)); };

  const due = clients.filter((c: any) => recurrence(c).tone !== "aldia").slice(0, 5);
  const activePromos = (promotions ?? []).filter((p: any) => p.active && new Date(p.expiresAt) > new Date());
  // Sugerimos la promo más reciente por defecto; el dueño puede sacarla.
  const [promoSel, setPromoSel] = useState<string>(activePromos[0]?.token ?? "");
  const promo = activePromos.find((p: any) => p.token === promoSel);
  const usualTimes = (c: any) => (c.appointments ?? []).slice(0, 3).map((a: any) => timeAt(new Date(a.startsAt)));
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const link = `${origin}/${slug}/turnos${promo ? `?promo=${promo.token}` : ""}`;
  const gapText = (name: string) => `Hola ${name.split(" ")[0]} 👋 Se liberó un lugar de ${hhmm(desde)} a ${hhmm(hasta)} en ${profile.name}.${promo ? ` Además tenés esta promo: ${promo.name}.` : ""} Reservá acá: ${link}`;

  return <>
    <SheetHead title="Llenar hueco" sub="Elegí el horario que ofrecés y a quién avisarle" onClose={close} />
    <div className="sheet-body">
      <div className="fila-2">
        <label className="campo"><span>Desde</span><select value={desde} onChange={(e) => pickDesde(+e.target.value)}>{startOpts.map((m) => <option key={m} value={m}>{hhmm(m)}</option>)}</select></label>
        <label className="campo"><span>Hasta</span><select value={hasta} onChange={(e) => setHasta(+e.target.value)}>{endOpts.map((m) => <option key={m} value={m}>{hhmm(m)}</option>)}</select></label>
      </div>
      {activePromos.length > 0 && <label className="campo"><span>Sumale una promo <em className="opt">sugerida</em></span>
        <select value={promoSel} onChange={(e) => setPromoSel(e.target.value)}>
          <option value="">Sin promo</option>
          {activePromos.map((p: any) => <option key={p.token} value={p.token}>🎁 {p.name}</option>)}
        </select>
      </label>}
      <div className="seccion-tit" style={{ margin: "14px 0 8px" }}><h2 style={{ fontSize: "1.05rem" }}>¿A quién le toca volver?</h2></div>
      {!due.length && <div className="vacio"><span className="emo">🌤️</span><h3>Nadie vencido por ahora</h3><p>Cuando a un cliente le toque volver, aparece acá.</p></div>}
      {due.map((c: any) => {
        const r = recurrence(c);
        const times = usualTimes(c);
        return <a className="cli-fila" key={c.id} target="_blank" href={wa(c.phone, gapText(c.name))}>
          <span className="ava">{initials(c.name)}</span>
          <div className="info"><span className="nom">{c.name}</span><span className="por">{r.label}</span>{times.length > 0 && <span className="horarios">🕐 suele venir {times.join(" · ")}</span>}</div>
          <span className="wa-redondo"><MessageCircle /></span>
        </a>;
      })}
      {queued !== null && <p className="form-error" style={{ color: "#176A43", background: "#DFF3E6", borderColor: "#176A43" }}>✓ {queued} mensajes quedaron en cola con ritmo humano.</p>}
    </div>
    {auto && due.length > 0 && <footer className="sheet-foot">
      <button className="btn btn-acento block" disabled={pending || queued !== null} onClick={() => start(async () => { setQueued(await queueGapFill(hhmm(desde), hhmm(hasta), promoSel || undefined)); })}>
        <Sparkles /> {pending ? "Encolando…" : `Poner ${due.length} mensajes en cola`}
      </button>
    </footer>}
  </>;
}

function AppointmentSheet({ appointment: a, close }: any) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const run = (status: any) => start(async () => { await setAppointmentStatus(a.id, status); router.refresh(); close(); });
  return <>
    <SheetHead title={a.client.name} sub={<>{a.service.emoji} {a.service.name} · {a.startsAt.toLocaleDateString("es-AR", { weekday: "long", day: "numeric" })} · {timeAt(a.startsAt)} · {money(a.service.priceCents)}</>} onClose={close} />
    <div className="sheet-body">
      <a className="btn btn-wa block" href={wa(a.client.phone, `Hola ${a.client.name.split(" ")[0]}, te escribo por tu turno de las ${timeAt(a.startsAt)}.`)} target="_blank"><MessageCircle /> Escribir por WhatsApp</a>
      <div className="acciones-turno" style={{ marginTop: 12 }}>
        <button className="btn" disabled={pending} onClick={() => run("ASISTIO")}>✓ Asistió</button>
        <button className="btn" disabled={pending} onClick={() => run("NO_VINO")}>No vino</button>
        <button className="btn btn-danger full" disabled={pending} onClick={() => run("CANCELADO")}>Cancelar turno</button>
      </div>
    </div>
  </>;
}

function ServiceSheet({ close }: any) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [form, set] = useState({ name: "", emoji: "✂️", durationMinutes: 40, priceCents: 900000 });
  return <>
    <SheetHead title="¿Qué ofrecés?" sub="Nuevo servicio para tu página de reservas" onClose={close} />
    <form className="sheet-body" onSubmit={(e) => { e.preventDefault(); start(async () => { await saveService(form); router.refresh(); close(); }); }}>
      <div className="campo"><span>Nombre</span><input required value={form.name} onChange={(e) => set({ ...form, name: e.target.value })} placeholder="Ej: Corte clásico" /></div>
      <div className="fila-2">
        <div className="campo"><span>Emoji</span><input value={form.emoji} onChange={(e) => set({ ...form, emoji: e.target.value })} /></div>
        <div className="campo"><span>Duración</span><select value={form.durationMinutes} onChange={(e) => set({ ...form, durationMinutes: +e.target.value })}><option value="30">30 min</option><option value="40">40 min</option><option value="45">45 min</option><option value="60">60 min</option></select></div>
      </div>
      <div className="campo"><span>Precio</span><input type="number" min="0" value={form.priceCents / 100} onChange={(e) => set({ ...form, priceCents: +e.target.value * 100 })} /></div>
      <button className="btn btn-acento block" disabled={pending}>{pending ? "Guardando…" : "Guardar servicio"}</button>
    </form>
  </>;
}

function PromoSheet({ services, close }: any) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [form, set] = useState({ serviceId: services[0]?.id, name: "Corte + regalo", addOnLabel: "Perfilado de cejas", message: "Reservá hoy y te sumamos un perfilado sin cargo.", expiresAt: new Date(Date.now() + 7 * 86400000) });
  return <>
    <SheetHead title="Armá una promo" sub="3 toques: servicio, regalo y mensaje" onClose={close} />
    <form className="sheet-body" onSubmit={(e) => { e.preventDefault(); start(async () => { await createPromotion(form); router.refresh(); close(); }); }}>
      <div className="campo"><span>1 · Servicio</span><select value={form.serviceId} onChange={(e) => set({ ...form, serviceId: e.target.value })}>{services.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
      <div className="campo"><span>2 · Sumale algo</span><input value={form.addOnLabel} onChange={(e) => set({ ...form, addOnLabel: e.target.value, name: `${services.find((s: any) => s.id === form.serviceId)?.name ?? "Promo"} + regalo` })} /></div>
      <div className="campo"><span>3 · Mensaje</span><textarea value={form.message} onChange={(e) => set({ ...form, message: e.target.value })} /></div>
      <button className="btn btn-acento block" disabled={pending}>{pending ? "Creando…" : "Crear link de promo"}</button>
    </form>
  </>;
}

function ProfileSheet({ profile, close }: any) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [form, set] = useState({ name: profile.name, phone: profile.phone ?? "", address: profile.address ?? "", mapsUrl: profile.mapsUrl ?? "", instagram: profile.instagram ?? "", accent: profile.accent });
  const labels: Record<string, string> = { name: "Nombre", phone: "WhatsApp", address: "Dirección", instagram: "Instagram" };
  return <>
    <SheetHead title="Datos y color" sub="Esto se ve en tu página pública" onClose={close} />
    <form className="sheet-body" onSubmit={(e) => { e.preventDefault(); start(async () => { await saveProfile(form); router.refresh(); close(); }); }}>
      {(["name", "phone", "address", "instagram"] as const).map((key) =>
        <div className="campo" key={key}><span>{labels[key]}</span><input value={(form as any)[key]} onChange={(e) => set({ ...form, [key]: e.target.value })} /></div>)}
      <div className="campo"><span>Link de Google Maps</span><input inputMode="url" value={form.mapsUrl} onChange={(e) => set({ ...form, mapsUrl: e.target.value })} placeholder="https://maps.app.goo.gl/…" /><p className="ayuda">Opcional. Habilita el botón “Cómo llegar” en tu página.</p></div>
      <div className="campo"><span>Color de marca</span><input type="color" value={form.accent} onChange={(e) => set({ ...form, accent: e.target.value })} /></div>
      <button className="btn btn-acento block" disabled={pending}>{pending ? "Guardando…" : "Guardar cambios"}</button>
    </form>
  </>;
}

function WhatsappSheet({ eligible, accepted, qr, close }: any) {
  const router = useRouter();
  const [pending, start] = useTransition();
  if (!eligible) return <>
    <SheetHead title="Automatizá desde tu número" sub="Confirmaciones, recordatorios y recupero con ritmo humano" onClose={close} />
    <div className="sheet-body"><a className="btn btn-acento block" href="/suscripcion">Subir a Turnos Auto</a></div>
  </>;
  return <>
    <SheetHead title={accepted ? "Vinculá tu WhatsApp" : "Antes de activarlo"} sub="Turnos Auto · integración no oficial" onClose={close} />
    <div className="sheet-body">
      {accepted ? <div className="qr-marco">
        {qr ? <Image src={qr} width={220} height={220} unoptimized alt="Código QR para vincular WhatsApp" /> : <p style={{ fontSize: "2rem", margin: "20px 0" }}>⏳</p>}
        <p>{qr ? "WhatsApp → Dispositivos vinculados → Vincular dispositivo." : "El worker está preparando el código de tu sesión aislada."}</p>
      </div> : <div className="riesgo">
        <b>Integración no oficial</b>
        <p>Turnos Auto usa open-wa para enviar desde tu número. WhatsApp puede limitar o bloquear cuentas que usen automatizaciones. Usamos ritmo humano, límites y pausas, pero el riesgo no desaparece.</p>
        <p>Si la sesión falla, Imán sigue funcionando y vuelve automáticamente a links wa.me.</p>
        <button className="btn btn-acento block" disabled={pending} onClick={() => start(async () => { await acceptWhatsappRisk(); router.refresh(); })}>{pending ? "Activando…" : "Entiendo el riesgo y acepto"}</button>
      </div>}
    </div>
  </>;
}

function PublicLink({ slug }: any) {
  const [copied, setCopied] = useState(false);
  const path = `/${slug}/turnos`;
  const shown = typeof window !== "undefined" ? window.location.host + path : path;
  const copy = () => {
    if (typeof navigator === "undefined" || !navigator.clipboard) return;
    navigator.clipboard.writeText(window.location.origin + path).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1600); });
  };
  return <div className="link-card">
    <a className="lk" href={path} target="_blank">{shown}</a>
    <button className="btn sm" onClick={copy}>{copied ? <><Check /> Copiado</> : <><Copy /> Copiar</>}</button>
  </div>;
}

function BookingSettingsSheet({ tenant, profile, close }: any) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const [slug, setSlug] = useState<string>(tenant.slug);
  const [showPrices, setShowPrices] = useState(profile.showPrices !== false);
  const [horizon, setHorizon] = useState<number>(profile.bookingHorizonDays ?? 30);
  const [cancelWindow, setCancelWindow] = useState<number>(profile.cancelWindowHours ?? 48);
  const [vacations, setVacations] = useState<any[]>(Array.isArray(profile.vacations) ? profile.vacations : []);
  const addVac = () => setVacations((v) => [...v, { start: "", end: "", label: "" }]);
  const setVac = (i: number, patch: any) => setVacations((v) => v.map((x, j) => j === i ? { ...x, ...patch } : x));
  const delVac = (i: number) => setVacations((v) => v.filter((_, j) => j !== i));
  const save = () => start(async () => {
    setError("");
    const r = await saveBookingSettings({ slug: slug.trim().toLowerCase(), showPrices, bookingHorizonDays: Number(horizon), cancelWindowHours: Number(cancelWindow), vacations: vacations.filter((v) => v.start && v.end) });
    if (!r.ok) { setError(r.error); return; }
    if (r.slug !== tenant.slug) { window.location.href = `/${r.slug}`; return; } // cambió el link: recargar en la ruta nueva
    router.refresh();
    close();
  });
  const OPTS = [7, 14, 21, 30, 45, 60, 90];
  const CANCEL_OPTS = [{ v: 0, label: "No permitir cancelar online" }, { v: 12, label: "12 horas antes" }, { v: 24, label: "24 horas antes" }, { v: 48, label: "48 horas antes" }, { v: 72, label: "72 horas antes" }, { v: 168, label: "1 semana antes" }];
  return <>
    <SheetHead title="Reservas y disponibilidad" sub="Tu link, límite de días, cancelación, precios y vacaciones" onClose={close} />
    <div className="sheet-body">
      <div className="campo"><span>Identificador del link</span>
        <div className="slug-input"><i>/</i><input value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase())} autoCapitalize="none" spellCheck={false} /><i>/turnos</i></div>
        <p className="ayuda">La dirección pública de tu página. Solo letras, números y guiones.</p>
      </div>
      <div className="campo"><span>Se puede reservar hasta dentro de</span>
        <select value={horizon} onChange={(e) => setHorizon(+e.target.value)}>{OPTS.map((d) => <option key={d} value={d}>{d} días</option>)}</select>
      </div>
      <div className="campo"><span>El cliente puede cancelar hasta</span>
        <select value={cancelWindow} onChange={(e) => setCancelWindow(+e.target.value)}>
          {CANCEL_OPTS.map((h) => <option key={h.v} value={h.v}>{h.label}</option>)}
        </select>
        <p className="ayuda">{cancelWindow > 0 ? `Después de ese margen, el turno solo se cancela escribiéndote.` : "Los clientes no pueden cancelar online."}</p>
      </div>
      <button type="button" className={`toggle ${showPrices ? "on" : ""}`} aria-pressed={showPrices} onClick={() => setShowPrices((v) => !v)}>
        <div className="info"><b>Mostrar precios en la página</b><small>{showPrices ? "Tus clientes ven el precio de cada servicio" : "Los precios quedan ocultos para el cliente"}</small></div>
        <span className="knob" />
      </button>
      <div className="seccion-tit" style={{ margin: "18px 0 10px" }}><h2 style={{ fontSize: "1.08rem" }}>Vacaciones y feriados</h2><button className="btn sm" onClick={addVac}><Plus /> Agregar</button></div>
      {!vacations.length && <p className="ayuda" style={{ marginBottom: 8 }}>Sin fechas bloqueadas. Agregá los días que no atendés y no se van a poder reservar.</p>}
      {vacations.map((v, i) => <div className="vac-row" key={i}>
        <input type="date" value={v.start || ""} onChange={(e) => setVac(i, { start: e.target.value })} />
        <span className="arw">→</span>
        <input type="date" value={v.end || ""} min={v.start || undefined} onChange={(e) => setVac(i, { end: e.target.value })} />
        <button className="cerrar" onClick={() => delVac(i)} aria-label="Quitar rango"><Trash2 /></button>
      </div>)}
      {error && <p className="form-error">{error}</p>}
    </div>
    <footer className="sheet-foot"><button className="btn btn-acento block" disabled={pending} onClick={save}>{pending ? "Guardando…" : "Guardar cambios"}</button></footer>
  </>;
}

function ManualSheet({ services, clients, staff = [], close }: any) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const activos = useMemo(() => services.filter((s: any) => s.active), [services]);
  const [serviceId, setServiceId] = useState(activos[0]?.id ?? "");
  const [staffId, setStaffId] = useState("");
  const [date, setDate] = useState(() => localDay(new Date()));
  const [time, setTime] = useState("");
  const [slots, setSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [name, setName] = useState("");
  const [tel, setTel] = useState("");
  const [error, setError] = useState("");

  // Recalcula horarios libres cada vez que cambia servicio, profesional o día.
  useEffect(() => {
    if (!serviceId || !date) { setSlots([]); return; }
    let vivo = true;
    setLoadingSlots(true); setTime("");
    ownerAvailability(serviceId, date, staffId || undefined)
      .then((s) => { if (vivo) setSlots(s); })
      .catch(() => { if (vivo) setSlots([]); })
      .finally(() => { if (vivo) setLoadingSlots(false); });
    return () => { vivo = false; };
  }, [serviceId, date, staffId]);

  // Si el nombre coincide con un cliente existente, autocompleta su teléfono.
  const pickName = (v: string) => {
    setName(v);
    const c = clients.find((c: any) => c.name === v);
    if (c?.phone) setTel(c.phone);
  };

  const submit = () => {
    setError("");
    if (!serviceId) return setError("Elegí un servicio.");
    if (!time) return setError("Elegí un horario.");
    if (name.trim().length < 2) return setError("Poné el nombre del cliente.");
    if (tel.replace(/\D/g, "").length < 6) return setError("Poné un WhatsApp válido.");
    start(async () => {
      const r = await crearTurnoManual({ serviceId, date, time, name, phone: tel, staffId: staffId || undefined });
      if (!r.ok) { setError(r.error); return; }
      router.refresh();
      close();
    });
  };

  return <>
    <SheetHead title="Nuevo turno" sub="Cargalo a mano — mismo motor de disponibilidad que tu página pública" onClose={close} />
    <div className="sheet-body">
      <div className="campo"><span>Servicio</span>
        <select value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
          {activos.length === 0 && <option value="">Creá un servicio primero</option>}
          {activos.map((s: any) => <option key={s.id} value={s.id}>{s.emoji} {s.name} · {s.durationMinutes} min</option>)}
        </select>
      </div>
      {staff.length > 0 && <div className="campo"><span>Profesional</span>
        <select value={staffId} onChange={(e) => setStaffId(e.target.value)}>
          <option value="">Cualquiera disponible</option>
          {staff.map((s: any) => <option key={s.id} value={s.id}>{s.emoji} {s.name}</option>)}
        </select>
      </div>}
      <div className="campo"><span>Día</span><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
      <div className="campo"><span>Horario</span>
        {loadingSlots
          ? <p className="ayuda">Buscando horarios libres…</p>
          : slots.length
            ? <div className="slot-grid">{slots.map((s) => <button type="button" key={s} className={`slot ${time === s ? "on" : ""}`} onClick={() => setTime(s)}>{s}</button>)}</div>
            : <p className="ayuda">No hay horarios libres ese día para este servicio.</p>}
      </div>
      <div className="campo"><span>Cliente</span>
        <input value={name} onChange={(e) => pickName(e.target.value)} placeholder="Nombre y apellido" list="clientes-manual" />
        <datalist id="clientes-manual">{clients.map((c: any) => <option key={c.id} value={c.name} />)}</datalist>
      </div>
      <div className="campo"><span>WhatsApp</span><input inputMode="tel" value={tel} onChange={(e) => setTel(e.target.value)} placeholder="351 555 0194" /></div>
      {error && <p className="campo-error">{error}</p>}
      <button className="btn btn-acento block" disabled={pending || !activos.length} onClick={submit}>{pending ? "Creando…" : "Crear turno"}</button>
    </div>
  </>;
}

function CopyLinkButton({ path, label, className }: { path: string; label?: string; className?: string }) {
  const [done, setDone] = useState(false);
  const copy = async () => {
    const url = `${window.location.origin}${path}`;
    try { await navigator.clipboard.writeText(url); }
    catch {
      const ta = document.createElement("textarea"); ta.value = url; document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); } catch { /* noop */ }
      ta.remove();
    }
    setDone(true); setTimeout(() => setDone(false), 1600);
  };
  return <button type="button" className={className ?? "btn sm"} onClick={copy} aria-label={label ?? "Copiar link"}>
    {done ? <Check /> : <Copy />}{label && <span>{done ? "¡Copiado!" : label}</span>}
  </button>;
}

function ShareSheet({ slug, name, staff = [], close }: any) {
  const path = `/${slug}/turnos`;
  const full = () => `${window.location.origin}${path}`;
  const wa = () => window.open(`https://wa.me/?text=${encodeURIComponent(`Reservá tu turno en ${name}: ${full()}`)}`, "_blank");
  const native = async () => { try { await (navigator as any).share({ title: name, text: `Reservá tu turno en ${name}`, url: full() }); } catch { /* cancelado */ } };
  const canNative = typeof navigator !== "undefined" && typeof (navigator as any).share === "function";
  return <>
    <SheetHead title="Compartí tu agenda" sub="Tu link de reservas: bio de Instagram, estado de WhatsApp o directo al cliente" onClose={close} />
    <div className="sheet-body">
      <div className="share-link"><span className="url">{path}</span><CopyLinkButton path={path} className="btn sm btn-acento" label="Copiar" /></div>
      <button className="btn block" onClick={wa}><MessageCircle /> Compartir por WhatsApp</button>
      {canNative && <button className="btn block" onClick={native}><Share2 /> Más opciones…</button>}
      <a className="btn block" href={path} target="_blank" rel="noopener noreferrer"><ExternalLink /> Abrir mi página</a>
      {staff.length > 0 && <>
        <p className="share-staff-tit">Link directo por profesional</p>
        {staff.map((s: any) => <div className="share-link" key={s.id}>
          <span className="url">{s.emoji} {s.name}</span>
          <CopyLinkButton path={`${path}?prof=${s.id}`} className="btn sm" label="Copiar" />
        </div>)}
      </>}
    </div>
  </>;
}

function NotificationsSheet({ profile, close }: any) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [on, setOn] = useState(!!profile.notifyOnBooking);
  const [email, setEmail] = useState(profile.notifyEmail ?? "");
  const [error, setError] = useState("");
  const save = () => {
    setError("");
    start(async () => {
      const r = await saveNotifications({ notifyOnBooking: on, notifyEmail: email });
      if (!r.ok) { setError(r.error); return; }
      router.refresh(); close();
    });
  };
  return <>
    <SheetHead title="Avisos por email" sub="Recibí un mail cada vez que alguien reserva — tenga o no email el cliente" onClose={close} />
    <div className="sheet-body">
      <label className="switch-fila">
        <div><b>Avisarme cada reserva</b><small>Te llega un email con el turno, el cliente y su WhatsApp.</small></div>
        <input type="checkbox" checked={on} onChange={(e) => setOn(e.target.checked)} />
        <span className="switch" aria-hidden="true" />
      </label>
      <div className="campo" style={{ marginTop: 14 }}><span>Email para los avisos</span>
        <input type="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vos@tunegocio.com" />
        <p className="ayuda">A este mail te llegan los avisos. Puede ser distinto al de tu cuenta.</p>
      </div>
      {error && <p className="campo-error">{error}</p>}
      <button className="btn btn-acento block" disabled={pending} onClick={save}>{pending ? "Guardando…" : "Guardar"}</button>
    </div>
  </>;
}

const STAFF_EMOJIS = ["💈", "✂️", "💇", "💅", "🧔", "👩", "🎨", "🪒"];
function StaffSheet({ staff, close }: any) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const [nombre, setNombre] = useState("");
  const [emoji, setEmoji] = useState("💈");
  const add = () => {
    setError("");
    if (nombre.trim().length < 2) { setError("Poné el nombre del profesional."); return; }
    start(async () => {
      const r = await saveStaff({ name: nombre, emoji });
      if (!r.ok) { setError(r.error); return; }
      setNombre(""); router.refresh();
    });
  };
  const remove = (id: string) => start(async () => { await deleteStaff(id); router.refresh(); });
  return <>
    <SheetHead title="Tu equipo" sub="Hasta 3 profesionales, cada uno con su agenda. El cliente elige con quién reservar." onClose={close} />
    <div className="sheet-body">
      {staff.length > 0 && <div className="staff-list">
        {staff.map((s: any) => <div className="staff-row" key={s.id}>
          <span className="em">{s.emoji}</span><b>{s.name}</b>
          <button className="staff-del" aria-label={`Quitar ${s.name}`} disabled={pending} onClick={() => remove(s.id)}><Trash2 /></button>
        </div>)}
      </div>}
      {staff.length < 3 ? <>
        <div className="campo" style={{ marginTop: 12 }}><span>Nuevo profesional</span>
          <div className="emoji-pick">{STAFF_EMOJIS.map((e) => <button type="button" key={e} className={emoji === e ? "on" : ""} onClick={() => setEmoji(e)}>{e}</button>)}</div>
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Nico" maxLength={40} />
        </div>
        {error && <p className="campo-error">{error}</p>}
        <button className="btn btn-acento block" disabled={pending} onClick={add}><Plus /> Agregar profesional</button>
      </> : <p className="ayuda">Llegaste al máximo de 3 profesionales.</p>}
    </div>
  </>;
}

const TEMAS_UI = [
  { id: "clasico", label: "Clásico", desc: "Cálido y con personalidad (el actual).", bg: "#FFF6E9", ink: "#33231A", acc: "#E94F37" },
  { id: "profesional", label: "Profesional", desc: "Limpio, sobrio, minimal.", bg: "#F4F5F7", ink: "#242A33", acc: "#246BCE" },
  { id: "noche", label: "Noche", desc: "Modo oscuro, moderno.", bg: "#151210", ink: "#F1E9DE", acc: "#E94F37" },
];
function ThemeSheet({ profile, close }: any) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [sel, setSel] = useState(profile.theme ?? "clasico");
  const [error, setError] = useState("");
  const pick = (id: string) => { setSel(id); setError(""); start(async () => { const r = await saveTheme(id); if (!r.ok) { setError(r.error); setSel(profile.theme ?? "clasico"); return; } router.refresh(); }); };
  return <>
    <SheetHead title="Tema visual" sub="El estilo de tu página pública de reservas" onClose={close} />
    <div className="sheet-body">
      <div className="tema-cards">
        {TEMAS_UI.map((t) => <button key={t.id} className={`tema-card ${sel === t.id ? "on" : ""}`} disabled={pending} onClick={() => pick(t.id)}>
          <span className="tema-swatch" style={{ background: t.bg, color: t.ink, borderColor: t.ink }}><i style={{ background: t.acc }} />Aa</span>
          <span className="tema-info"><b>{t.label}</b><small>{t.desc}</small></span>
          {sel === t.id && <Check />}
        </button>)}
      </div>
      {error && <p className="campo-error">{error}</p>}
    </div>
  </>;
}
