"use client";

import { useEffect, useState, useTransition } from "react";
import { ArrowLeft, Check, Clock3, MapPin } from "lucide-react";
import { bookPublic, publicAvailability } from "@/app/actions/turnos";
import { MagnetLogo } from "./magnet-logo";

const money = (c: number) => new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 0 }).format(c / 100);
export function BookingFlow({ initial, promoToken }: { initial: any; promoToken?: string }) {
  const [step, setStep] = useState(0); const [service, setService] = useState<any>(null); const [date, setDate] = useState(""); const [time, setTime] = useState("");
  const [slots, setSlots] = useState<string[]>([]); const [loading, start] = useTransition(); const [result, setResult] = useState<any>(null);
  const [form, setForm] = useState({ name: "", phone: "", email: "" });
  const days = Array.from({length:14},(_,i)=>{const d=new Date();d.setDate(d.getDate()+i);return d;});
  useEffect(()=>{if(service&&date) start(async()=>setSlots(await publicAvailability(initial.tenant.slug,service.id,date)))},[service,date]);
  const submit = () => start(async()=>{const r=await bookPublic({slug:initial.tenant.slug,serviceId:service.id,date,time,...form,promoToken});setResult(r);if(r.ok)setStep(3)});
  return <main className="booking-page" style={{"--acento":initial.profile.accent} as React.CSSProperties}>
    <header className="booking-brand"><MagnetLogo particles/><div><b>{initial.profile.name}</b><small><MapPin/> {initial.profile.address}</small></div></header>
    {initial.promo && <div className="promo-banner"><span>🎁</span><div><b>{initial.promo.name}</b><p>{initial.promo.message}</p></div></div>}
    <div className="booking-progress">{[0,1,2].map(i=><i key={i} className={i<=step?"on":""}/>)}</div>
    {step===0&&<section><p className="eyebrow">ELEGÍ TU SERVICIO</p><h1>¿Qué te hacemos?</h1><div className="booking-options">{initial.services.map((s:any)=><button key={s.id} onClick={()=>{setService(s);setStep(1)}}><span>{s.emoji}</span><div><b>{s.name}</b><small><Clock3/> {s.durationMinutes} min</small></div><strong>{money(s.priceCents)}</strong></button>)}</div></section>}
    {step===1&&<section><button className="back-link" onClick={()=>setStep(0)}><ArrowLeft/> Cambiar servicio</button><p className="eyebrow">DÍA Y HORA</p><h1>¿Cuándo venís?</h1><div className="booking-days">{days.map(d=>{const key=new Intl.DateTimeFormat("en-CA").format(d);return <button key={key} className={date===key?"on":""} onClick={()=>{setDate(key);setTime("")}}><small>{d.toLocaleDateString("es-AR",{weekday:"short"})}</small><b>{d.getDate()}</b></button>})}</div>{date&&<><h3 className="slot-title">Horarios disponibles</h3><div className="slots">{loading?<p>Buscando huecos…</p>:slots.length?slots.map(s=><button className={time===s?"on":""} onClick={()=>setTime(s)} key={s}>{s}</button>):<p>No quedan horarios ese día.</p>}</div></>}<button className="button accent" disabled={!time} onClick={()=>setStep(2)}>Continuar</button></section>}
    {step===2&&<section><button className="back-link" onClick={()=>setStep(1)}><ArrowLeft/> Cambiar horario</button><p className="eyebrow">ÚLTIMO PASO</p><h1>¿A nombre de quién?</h1><div className="booking-summary"><span>{service.emoji}</span><div><b>{service.name}</b><small>{date.split("-").reverse().join("/")} · {time}</small></div></div><label className="field"><span>Tu nombre</span><input autoComplete="name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label><label className="field"><span>WhatsApp</span><input type="tel" inputMode="tel" placeholder="351 555 0194" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/><small>Te contactamos por acá si hay algún cambio.</small></label><label className="field"><span>Email <em>opcional</em></span><input type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></label><div className="deposit-hook mini"><span>🔒</span><p>Señas online: próximamente</p></div>{result&&!result.ok&&<p className="form-error">{result.error}</p>}<button className="button accent" disabled={loading||form.name.trim().length<2||form.phone.replace(/\D/g,"").length<8} onClick={submit}>{loading?"Guardando…":"Confirmar turno"}</button></section>}
    {step===3&&<section className="confirmed"><span className="check"><Check/></span><p className="eyebrow">¡LISTO!</p><h1>Tu turno está confirmado</h1><div className="booking-summary"><span>{service.emoji}</span><div><b>{service.name}</b><small>{date.split("-").reverse().join("/")} · {time}</small></div></div><p>Te esperamos en {initial.profile.address}. Guardá el WhatsApp del negocio por cualquier cambio.</p><a className="button wa" href={`https://wa.me/54${initial.profile.phone?.replace(/\D/g,"")}`} target="_blank">Escribir al negocio</a></section>}
    <footer>Reservas con <MagnetLogo/> <b>Imán Turnos</b></footer>
  </main>;
}
