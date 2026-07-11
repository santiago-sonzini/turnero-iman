import Link from "next/link";
import { ArrowRight, CalendarCheck, MessageCircle, Sparkles } from "lucide-react";
import { DEMO_MODE } from "@/server/db";
import { MagnetLogo } from "@/components/turnos/magnet-logo";

export default function Home() {
  return <main className="booking-page" style={{maxWidth:900,display:"grid",placeItems:"center",textAlign:"center"}}>
    <section style={{maxWidth:650}}><MagnetLogo particles/><p className="eyebrow" style={{marginTop:20}}>IMÁN TURNOS</p><h1>Tu agenda llena.<br/>Tu cabeza libre.</h1><p style={{color:"var(--tinta-suave)",fontSize:"1.1rem"}}>Reservas online, clientes que vuelven y cada hueco convertido en una oportunidad.</p><div style={{display:"flex",gap:10,justifyContent:"center",flexWrap:"wrap",margin:"28px 0"}}><Link className="button accent" style={{width:"auto"}} href={DEMO_MODE?"/app":"/auth"}>{DEMO_MODE?"Ver la barbería demo":"Probar 14 días gratis"}<ArrowRight/></Link><Link className="button" style={{width:"auto"}} href="/reservar/el-roble">Ver página de reservas</Link></div><div className="cards" style={{gridTemplateColumns:"repeat(3,1fr)",textAlign:"left"}}><div className="hint-card"><CalendarCheck/><b>Agenda y huecos</b></div><div className="hint-card"><MessageCircle/><b>WhatsApp fácil</b></div><div className="hint-card"><Sparkles/><b>Promos en 3 toques</b></div></div></section>
  </main>;
}
