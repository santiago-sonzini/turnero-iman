"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Clock3, MessageCircle } from "lucide-react";
import { MagnetLogo } from "./magnet-logo";

const whatsapp = "https://wa.me/5493534797679?text=Hola!%20Quiero%20probar%20Im%C3%A1n%20Turnos%20en%20mi%20negocio%20%F0%9F%A7%B2";

// Rubros que soporta Imán (el chip del hero los va rotando).
const RUBROS = [
  { emoji: "💈", label: "barberías" },
  { emoji: "💇", label: "peluquerías" },
  { emoji: "💅", label: "estudios de uñas" },
  { emoji: "✨", label: "centros de estética" },
  { emoji: "💆", label: "spa y masajes" },
  { emoji: "🎨", label: "estudios de tattoo" },
  { emoji: "🩺", label: "consultorios" },
];

export function LandingPage() {
  const [demoStep, setDemoStep] = useState(0);
  const [accent, setAccent] = useState("#1B7B94");
  const [rubro, setRubro] = useState(0);
  const [seconds, setSeconds] = useState(1800);
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { setDemoStep(5); return; }
    const demo = window.setInterval(() => setDemoStep((step) => (step + 1) % 6), 1500);
    const countdown = window.setInterval(() => setSeconds((value) => value <= 0 ? 1800 : value - 1), 1000);
    const rubros = window.setInterval(() => setRubro((r) => (r + 1) % RUBROS.length), 1900);
    return () => { window.clearInterval(demo); window.clearInterval(countdown); window.clearInterval(rubros); };
  }, []);
  const countdown = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  const rb = RUBROS[rubro] ?? RUBROS[0]!;

  return <main className="landing">
    <header className="landing-topbar">
      <div className="landing-wrap">
        <Link className="landing-login" href="/auth?modo=signin">Iniciar sesión <ArrowRight /></Link>
      </div>
    </header>
    <section className="landing-hero" id="inicio">
      <div className="landing-wrap landing-hero-grid">
        <div className="landing-hero-copy">
          <div className="landing-brand"><MagnetLogo particles /><b>Imán Turnos</b><span className="landing-rubro" key={rubro}>{rb.emoji} para {rb.label}</span></div>
          <h1>Tu agenda llena, sin perseguir a nadie.</h1>
          <p className="landing-sub">Imán Turnos te muestra cada hueco del día y qué cliente tuyo ya está para volver. Un toque, sale el WhatsApp, hueco lleno.</p>
          <div className="landing-actions"><Link className="landing-button primary" href="/auth?modo=signup">Probalo gratis <ArrowRight /></Link><a className="landing-button whatsapp" href={whatsapp} target="_blank" rel="noopener noreferrer"><MessageCircle /> Hablanos por WhatsApp</a></div>
          <p className="landing-micro">7 días gratis · sin cargos hoy · listo en 3 minutos</p>
          <div className="landing-rubros"><span className="landing-rubros-lbl">Hecho para</span>{RUBROS.map((r) => <span key={r.label} className="landing-rubro-chip">{r.emoji} {r.label.charAt(0).toUpperCase() + r.label.slice(1)}</span>)}</div>
        </div>
        <HeroDemo step={demoStep} />
      </div>
    </section>

    <section className="landing-section"><div className="landing-wrap"><p className="landing-kicker">EL PROBLEMA NO ES TU TRABAJO</p><h2>Te suena, ¿no?</h2><div className="landing-pain-grid">
      <Pain emoji="🕳️" quote="«Me cancelaron a las seis y la silla quedó vacía toda la tarde.»"><b>Cada hueco te muestra a quién llamar</b> para llenarlo. Con el mensaje ya escrito.</Pain>
      <Pain emoji="📱" quote="«Vivo contestando WhatsApp para dar turnos.»"><b>Tu link agenda solo</b>, hasta mientras cortás. Vos solo mirás la agenda llenarse.</Pain>
      <Pain emoji="👻" quote="«Clientes de años que dejaron de venir. Ni me enteré.»"><b>El semáforo te avisa a quién le toca volver</b>, antes de que se pierdan.</Pain>
    </div></div></section>

    <section className="landing-section tint-sol"><div className="landing-wrap"><p className="landing-kicker">SIN CURVA DE APRENDIZAJE</p><h2>Arrancás hoy, en 3 pasos</h2><div className="landing-step-grid"><Step number="1" title="Creá tu cuenta">El nombre de tu negocio y listo. No hay cargos hoy.</Step><Step number="2" title="Cargá servicios y horarios">Ajustás precios y tiempos en dos toques.</Step><Step number="3" title="Compartí tu link">En la bio de Instagram y en tu estado. Tus clientes reservan solos.</Step></div><p className="landing-micro centered">⏱️ Menos de 3 minutos. Sin instalar nada.</p></div></section>

    <section className="landing-section"><div className="landing-wrap landing-showcase"><div><p className="landing-kicker">TU MARCA, NO LA NUESTRA</p><h2>Así lo ve tu cliente</h2><p className="landing-copy">Tu página de reservas con <b>tu color y tu nombre</b>. Entran al link, eligen servicio y horario, confirman. Sin cuenta, sin app.</p><p className="landing-swatch-label">Probá tu color →</p><div className="landing-swatches">{["#1B7B94","#C1272D","#1F7A48","#6C3FA8","#8C5A2B","#33231A"].map((color) => <button key={color} aria-label={`Probar ${color}`} className={accent === color ? "selected" : ""} style={{background:color}} onClick={() => setAccent(color)} />)}</div></div><BookingPreview accent={accent} /></div></section>

    <section className="landing-section tint-rosa"><div className="landing-wrap landing-showcase reverse"><div><p className="landing-kicker">PROMOS CON SENTIDO</p><h2>Huecos que se venden solos</h2><p className="landing-copy">¿Un hueco a las 18:00 sin vender? Colgale un incentivo: <b>lavado gratis si lo reservan en los próximos 30 minutos</b>. Vos ponés el premio, Imán pone la urgencia.</p><p className="landing-copy">También armás promos en 3 toques y las mandás a quienes ya les toca volver.</p></div><div className="landing-incentive"><span className="landing-ping" /><h3>🎁 Lavado + peinado <em>GRATIS</em></h3><p>Reservá este hueco en los próximos 30 minutos y el lavado va de regalo.</p><div><Clock3 /><b>{countdown}</b><span>para que sea tuyo</span></div></div></div></section>

    <section className="landing-section" id="precio"><div className="landing-wrap landing-price-wrap"><p className="landing-kicker centered">PRECIOS EN PESOS</p><h2 className="centered">Un precio que se paga solo</h2><div className="landing-prices"><PriceCard name="Turnos" price="15.000" copy="Un corte recuperado por semana y ya está pago." items={["Turnos ilimitados","Página de reservas con tu marca","Clientes que ya están para volver","Promos e incentivos","WhatsApp listo para enviar"]}/><PriceCard featured name="Turnos Pro" price="30.000" copy="Tu equipo completo y tu página con tu estilo." items={["Todo el plan Turnos","Hasta 3 profesionales, cada uno con su agenda","Recordatorios automáticos por WhatsApp","Link de reserva directo por profesional","Temas visuales para tu página pública"]}/></div><div className="landing-guarantee"><span>🤝</span><div><b>7 días para probarlo en serio.</b><p>No se cobra nada hoy. Tus datos son tuyos y cancelás cuando quieras.</p></div></div></div></section>

    <section className="landing-section alternate"><div className="landing-wrap landing-faq"><p className="landing-kicker">SIN LETRA CHICA</p><h2>Las preguntas de siempre</h2>{[
      ["¿Cuánto sale?","Turnos cuesta $ 15.000 por mes y Turnos Pro $ 30.000. En pesos, sin costo por turno ni sorpresas en dólares."],
      ["¿Mis clientes tienen que bajarse una app?","No. Entran a tu link, eligen horario y confirman. Sin cuenta, app ni contraseña."],
      ["¿Qué pasa con mis datos y mis clientes?","Son tuyos, están separados por negocio y solo usamos proveedores necesarios para operar autenticación, base de datos, pagos, email y mensajería."],
      ["¿Cuánto tarda armarlo?","Menos de 3 minutos: nombre, primer servicio y color. Después ajustás horarios y compartís tu link."],
      ["¿Cómo funciona WhatsApp?","Imán te arma el mensaje listo y abre WhatsApp con el link wa.me: tocás y se abre el chat con el texto escrito para confirmar, recordar o llenar un hueco. Vos apretás enviar."],
      ["¿Cobran señas?","Todavía no. La interfaz y los campos están preparados, pero las señas permanecen desactivadas hasta su lanzamiento."],
    ].map(([q,a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}</div></section>

    <section className="landing-close"><div className="landing-wrap"><MagnetLogo particles /><h2>Mañana a esta hora, tu link ya está en tu bio.</h2><div className="landing-actions centered-actions"><Link className="landing-button primary" href="/auth?modo=signup">Probalo gratis <ArrowRight /></Link><a className="landing-button whatsapp" href={whatsapp} target="_blank" rel="noopener noreferrer"><MessageCircle /> Hablanos</a></div></div></section>
    <footer className="landing-footer"><div className="landing-wrap"><b>Imán Turnos</b><span>Hecho en Córdoba para negocios que atienden personas.</span><Link href="/privacidad">Privacidad</Link><Link href="/auth">Ingresar</Link></div></footer>
    <div className="landing-sticky"><Link className="landing-button primary" href="/auth?modo=signup">Probar 7 días gratis <ArrowRight /></Link></div>
  </main>;
}

function HeroDemo({ step }: { step: number }) { const filled = step >= 5; return <div className="landing-demo-wrap"><div className={`landing-phone demo-step-${step}`}><header><span>💈 <b>Barbería El Roble</b></span><small><b>8/12</b> turnos · hoy</small></header><DemoAppointment initials="RN" name="Rodrigo Núñez" service="Corte + barba · 55 min" price="$ 14.500"/><div className={`landing-demo-gap ${filled ? "filled" : ""}`}>{filled ? <div className="landing-filled"><span>MG</span><div><b>Marta Giménez</b><small>✂️ Corte · 11:55</small></div><em>agendada</em></div> : <><p>⚡ Próximo hueco</p><h3>🧲 11:55 – 12:40</h3><small>hueco libre · 45 min</small><button>⚡ Llenar este hueco</button></>}</div><DemoAppointment initials="SR" name="Santi Ríos" service="Corte · 40 min" price="$ 9.500"/>{step >= 2 && step < 5 && <div className="landing-demo-sheet"><i /><b>Llenar 11:55 – 12:40</b><small>Clientes que ya les toca volver</small><div className={step >= 3 ? "highlight" : ""}><span>MG</span><p><b>Marta Giménez</b><small>corte cada 24 días · van 31 🔴</small></p><em>WA</em></div><div><span>DS</span><p><b>Diego Sosa</b><small>corte cada 28 días · van 40 🔴</small></p><em>WA</em></div></div>}{step === 4 && <div className="landing-demo-message"><b>WhatsApp a Marta</b>“¡Hola Marta! Pasaron 31 días de tu corte. Tengo un lugar hoy 11:55, ¿te lo agendo?” <span>✓✓</span></div>}</div><p>▶ Simulación con datos de ejemplo — así se llena un hueco.</p></div> }
function DemoAppointment({initials,name,service,price}:{initials:string;name:string;service:string;price:string}) { return <div className="landing-demo-appointment"><span>{initials}</span><div><b>{name}</b><small>✂️ {service}</small></div><em>{price}</em></div> }
function Pain({emoji,quote,children}:{emoji:string;quote:string;children:React.ReactNode}) { return <article className="landing-pain"><span>{emoji}</span><h3>{quote}</h3><p>{children}</p></article> }
function Step({number,title,children}:{number:string;title:string;children:React.ReactNode}) { return <article className="landing-step"><span>{number}</span><h3>{title}</h3><p>{children}</p></article> }
function BookingPreview({accent}:{accent:string}) { return <div className="landing-booking-preview" style={{"--preview-accent":accent} as React.CSSProperties}><header><span>💈</span><h3>Barbería El Roble</h3><p>★★★★★ · Güemes, Córdoba</p></header><div><article><span>✂️</span><p><b>Corte clásico</b><small>40 min</small></p><em>$ 9.500</em></article><section><button>17:15</button><button className="selected">18:05</button><button>19:20</button></section><button className="confirm">Confirmar turno</button></div></div> }
function PriceCard({name,price,copy,items,featured=false}:{name:string;price:string;copy:string;items:string[];featured?:boolean}) { return <article className={`landing-price ${featured ? "featured" : ""}`}>{featured && <span className="landing-popular">MÁS COMPLETO</span>}<p>{name}</p><h3><sup>$</sup>{price}<small>/mes</small></h3><strong>{copy}</strong><ul>{items.map(item=><li key={item}><Check /> {item}</li>)}</ul><Link className={`landing-button ${featured ? "dark" : "primary"}`} href="/auth?modo=signup">Empezar gratis <ArrowRight /></Link></article> }
