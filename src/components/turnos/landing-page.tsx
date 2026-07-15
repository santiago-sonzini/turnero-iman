"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Clock3, MessageCircle } from "lucide-react";
import { MagnetLogo } from "./magnet-logo";
import { LANDING_FAQ } from "@/lib/seo";

const whatsapp = "https://wa.me/5493534797679?text=Hola!%20Quiero%20probar%20Im%C3%A1n%20Turnos%20en%20mi%20negocio%20%F0%9F%A7%B2";
const whatsappPersonalizado = "https://wa.me/5493534797679?text=Hola!%20Quiero%20consultar%20por%20el%20plan%20Turnos%20Personalizado";

// Rubros que soporta Imán.
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
  const [seconds, setSeconds] = useState(1800);
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { setDemoStep(5); return; }
    const demo = window.setInterval(() => setDemoStep((step) => (step + 1) % 6), 1500);
    const countdown = window.setInterval(() => setSeconds((value) => value <= 0 ? 1800 : value - 1), 1000);
    return () => { window.clearInterval(demo); window.clearInterval(countdown); };
  }, []);
  const countdown = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

  return <main className="landing">
    <header className="landing-topbar">
      <div className="landing-wrap">
        <Link className="landing-login" href="/auth?modo=signin">Iniciar sesión <ArrowRight /></Link>
      </div>
    </header>
    <section className="landing-hero" id="inicio">
      <div className="landing-wrap landing-hero-grid">
        <div className="landing-hero-copy">
          <div className="landing-brand"><MagnetLogo particles /><b>Imán Turnos</b></div>
          <h1>Tu agenda llena, sin perseguir a nadie.</h1>
          <p className="landing-sub">Imán Turnos te muestra cada hueco del día y qué cliente tuyo ya está para volver. Un toque, sale el WhatsApp, hueco lleno.</p>
          <div className="landing-actions"><Link className="landing-button primary" href="/auth?modo=signup">Probalo gratis <ArrowRight /></Link><a className="landing-button whatsapp" href={whatsapp} target="_blank" rel="noopener noreferrer"><MessageCircle /> Hablanos por WhatsApp</a></div>
          <p className="landing-micro">7 días gratis · sin cargos hoy · listo en 3 minutos</p>
          <div className="landing-rubros"><span className="landing-rubros-lbl">Hecho para</span>{RUBROS.map((r) => <span key={r.label} className="landing-rubro-chip">{r.emoji} {r.label.charAt(0).toUpperCase() + r.label.slice(1)}</span>)}</div>
        </div>
        <HeroDemo step={demoStep} />
      </div>
    </section>

    <section className="landing-section tint-rosa"><div className="landing-wrap landing-showcase reverse"><div><p className="landing-kicker">PROMOS CON SENTIDO</p><h2>Huecos que se venden solos</h2><p className="landing-copy">¿Un hueco a las 18:00 sin vender? Colgale un incentivo: <b>lavado gratis si lo reservan en los próximos 30 minutos</b>. Vos ponés el premio, Imán pone la urgencia.</p><p className="landing-copy">También armás promos en 3 toques y las mandás a quienes ya les toca volver.</p></div><div className="landing-incentive"><span className="landing-ping" /><h3>🎁 Lavado + peinado <em>GRATIS</em></h3><p>Reservá este hueco en los próximos 30 minutos y el lavado va de regalo.</p><div><Clock3 /><b>{countdown}</b><span>para que sea tuyo</span></div></div></div></section>

    <section className="landing-section"><div className="landing-wrap landing-showcase"><div><p className="landing-kicker">TU MARCA, NO LA NUESTRA</p><h2>Así lo ve tu cliente</h2><p className="landing-copy">Tu página de reservas con <b>tu color y tu nombre</b>. Entran al link, eligen servicio y horario, confirman. Sin cuenta, sin app.</p><p className="landing-swatch-label">Probá tu color →</p><div className="landing-swatches">{["#1B7B94","#C1272D","#1F7A48","#6C3FA8","#8C5A2B","#33231A"].map((color) => <button key={color} aria-label={`Probar ${color}`} className={accent === color ? "selected" : ""} style={{background:color}} onClick={() => setAccent(color)} />)}</div></div><BookingPreview accent={accent} /></div></section>

    <section className="landing-section" id="precio"><div className="landing-wrap landing-price-wrap"><p className="landing-kicker centered">PRECIOS EN PESOS</p><h2 className="centered">Un precio que recuperás enseguida</h2><div className="landing-prices"><PriceCard name="Turnos" price="20.000" copy="Un corte recuperado por semana y ya está pago." items={["Turnos ilimitados","Página de reservas con tu marca","Clientes que ya están para volver","Promos e incentivos","WhatsApp listo para enviar"]}/><PriceCard featured badge="MÁS ELEGIDO" name="Turnos Pro" price="35.000" copy="Tu equipo completo y tu página con tu estilo." items={["Todo el plan Turnos","Hasta 3 profesionales, cada uno con su agenda","Recordatorios automáticos por WhatsApp","Link de reserva directo por profesional","Temas visuales para tu página pública"]}/><PriceCard badge="A MEDIDA" name="Turnos Personalizado" price="60.000" copy="Una solución propia para equipos que quieren diferenciarse." items={["Todo el plan Turnos Pro","Hasta 10 profesionales con agenda propia","Diseño personalizado para tu página","Posibilidad de usar tu propio dominio","Configuración acompañada"]} href={whatsappPersonalizado} cta="Consultar por WhatsApp" external /></div><div className="landing-guarantee"><span>🤝</span><div><b>7 días para probarlo en serio.</b><p>No se cobra nada hoy. Tus datos son tuyos y cancelás cuando quieras.</p></div></div></div></section>

    <section className="landing-section alternate"><div className="landing-wrap landing-faq"><p className="landing-kicker">SIN LETRA CHICA</p><h2>Las preguntas de siempre</h2>{LANDING_FAQ.map(({ q, a }) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}</div></section>

    <section className="landing-section tint-sol"><div className="landing-wrap"><p className="landing-kicker">SIN CURVA DE APRENDIZAJE</p><h2>Arrancás hoy, en 3 pasos</h2><div className="landing-step-grid"><Step number="1" title="Creá tu cuenta">El nombre de tu negocio y listo. No hay cargos hoy.</Step><Step number="2" title="Cargá servicios y horarios">Ajustás precios y tiempos en dos toques.</Step><Step number="3" title="Compartí tu link">En la bio de Instagram y en tu estado. Tus clientes reservan solos.</Step></div><p className="landing-micro centered">⏱️ Menos de 3 minutos. Sin instalar nada.</p></div></section>

    <section className="landing-close"><div className="landing-wrap"><MagnetLogo particles /><h2>Mañana a esta hora, tu link ya está en tu bio.</h2><div className="landing-actions centered-actions"><Link className="landing-button primary" href="/auth?modo=signup">Probalo gratis <ArrowRight /></Link><a className="landing-button whatsapp" href={whatsapp} target="_blank" rel="noopener noreferrer"><MessageCircle /> Hablanos</a></div></div></section>
    <footer className="landing-footer"><div className="landing-wrap"><b>Imán Turnos</b><span>Hecho en Córdoba para negocios que atienden personas.</span><Link href="/blog">Blog</Link><Link href="/privacidad">Privacidad</Link><Link href="/terminos">Términos</Link><Link href="/auth">Ingresar</Link></div></footer>
    <div className="landing-sticky"><Link className="landing-button primary" href="/auth?modo=signup">Probar 7 días gratis <ArrowRight /></Link></div>
  </main>;
}

function HeroDemo({ step }: { step: number }) { const filled = step >= 5; return <div className="landing-demo-wrap"><div className={`landing-phone demo-step-${step}`}><header><span>💈 <b>Barbería El Roble</b></span><small><b>8/12</b> turnos · hoy</small></header><DemoAppointment initials="RN" name="Rodrigo Núñez" service="Corte + barba · 55 min" price="$ 14.500"/><div className={`landing-demo-gap ${filled ? "filled" : ""}`}>{filled ? <div className="landing-filled"><span>MG</span><div><b>Marta Giménez</b><small>✂️ Corte · 11:55</small></div><em>agendada</em></div> : <><p>⚡ Próximo hueco</p><h3>🧲 11:55 – 12:40</h3><small>hueco libre · 45 min</small><button>⚡ Llenar este hueco</button></>}</div><DemoAppointment initials="SR" name="Santi Ríos" service="Corte · 40 min" price="$ 9.500"/>{step >= 2 && step < 5 && <div className="landing-demo-sheet"><i /><b>Llenar 11:55 – 12:40</b><small>Clientes que ya les toca volver</small><div className={step >= 3 ? "highlight" : ""}><span>MG</span><p><b>Marta Giménez</b><small>corte cada 24 días · van 31 🔴</small></p><em>WA</em></div><div><span>DS</span><p><b>Diego Sosa</b><small>corte cada 28 días · van 40 🔴</small></p><em>WA</em></div></div>}{step === 4 && <div className="landing-demo-message"><b>WhatsApp a Marta</b>“¡Hola Marta! Pasaron 31 días de tu corte. Tengo un lugar hoy 11:55, ¿te lo agendo?” <span>✓✓</span></div>}</div><p>▶ Simulación con datos de ejemplo — así se llena un hueco.</p></div> }
function DemoAppointment({initials,name,service,price}:{initials:string;name:string;service:string;price:string}) { return <div className="landing-demo-appointment"><span>{initials}</span><div><b>{name}</b><small>✂️ {service}</small></div><em>{price}</em></div> }
function Step({number,title,children}:{number:string;title:string;children:React.ReactNode}) { return <article className="landing-step"><span>{number}</span><h3>{title}</h3><p>{children}</p></article> }
function BookingPreview({accent}:{accent:string}) { return <div className="landing-booking-preview" style={{"--preview-accent":accent} as React.CSSProperties}><header><span>💈</span><h3>Barbería El Roble</h3><p>★★★★★ · Güemes, Córdoba</p></header><div><article><span>✂️</span><p><b>Corte clásico</b><small>40 min</small></p><em>$ 9.500</em></article><section><button>17:15</button><button className="selected">18:05</button><button>19:20</button></section><button className="confirm">Confirmar turno</button></div></div> }
function PriceCard({name,price,copy,items,featured=false,badge,href="/auth?modo=signup",cta="Empezar gratis",external=false}:{name:string;price:string;copy:string;items:string[];featured?:boolean;badge?:string;href?:string;cta?:string;external?:boolean}) { const buttonClass = `landing-button ${external ? "whatsapp" : featured ? "dark" : "primary"}`; return <article className={`landing-price ${featured ? "featured" : ""}`}>{badge && <span className="landing-popular">{badge}</span>}<p>{name}</p><h3><sup>$</sup>{price}<small>/mes</small></h3><strong>{copy}</strong><ul>{items.map(item=><li key={item}><Check /> {item}</li>)}</ul>{external ? <a className={buttonClass} href={href} target="_blank" rel="noopener noreferrer">{cta} <MessageCircle /></a> : <Link className={buttonClass} href={href}>{cta} <ArrowRight /></Link>}</article> }
