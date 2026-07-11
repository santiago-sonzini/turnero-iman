"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Eye, EyeOff, LockKeyhole, Mail, Scissors, Store } from "lucide-react";
import { login, signup } from "@/app/actions/auth";
import { MagnetLogo } from "./magnet-logo";

type Mode = "signin" | "signup";

export function AuthScreen({ initialMode = "signin" }: { initialMode?: Mode }) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [showPassword, setShowPassword] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  function switchMode(next: Mode) {
    setMode(next); setError(""); setNotice("");
    window.history.replaceState(null, "", `/auth?modo=${next}`);
  }

  function submit(formData: FormData) {
    setError(""); setNotice("");
    startTransition(async () => {
      const email = String(formData.get("email") ?? "");
      const password = String(formData.get("password") ?? "");
      if (!email.includes("@")) return setError("Ingresá un email válido.");
      if (password.length < 8) return setError("La clave tiene que tener al menos 8 caracteres.");
      const result = mode === "signup"
        ? await signup({ email, password, negocio: String(formData.get("negocio") ?? "") })
        : await login({ email, password });
      if (result?.status === 200) setNotice(result.message);
      else if (result) setError(result.message);
    });
  }

  return (
    <main className="auth-page">
      <section className="auth-story">
        <Link className="auth-back" href="/"><ArrowLeft /> Volver</Link>
        <div className="auth-story-inner">
          <div className="auth-wordmark"><MagnetLogo particles /><b>Imán Turnos</b></div>
          <p className="eyebrow">TU AGENDA, SIN HUECOS</p>
          <h1>{mode === "signup" ? "Mañana, tus clientes reservan solos." : "Qué bueno verte de nuevo."}</h1>
          <p className="auth-lead">Turnos online, clientes que vuelven y cada hueco convertido en una oportunidad.</p>
          <ul className="auth-benefits">
            <li><Check /> 14 días gratis, sin tarjeta</li>
            <li><Check /> Configuración en menos de 3 minutos</li>
            <li><Check /> Tu página con tu marca y tu color</li>
          </ul>
          <div className="auth-mini-agenda" aria-hidden="true">
            <div><time>10:00</time><span><b>Nico Fernández</b><small>✂️ Corte clásico</small></span></div>
            <div className="auth-gap"><time>11:20</time><span><b>🧲 Hueco libre</b><small>4 clientes para avisar</small></span><em>LLENAR</em></div>
            <div><time>12:00</time><span><b>Martín López</b><small>🧔 Corte + barba</small></span></div>
          </div>
        </div>
      </section>

      <section className="auth-panel">
        <div className="auth-mobile-brand"><MagnetLogo /><b>Imán Turnos</b></div>
        <div className="auth-card">
          <div className="auth-tabs" role="tablist" aria-label="Acceso">
            <button role="tab" aria-selected={mode === "signin"} className={mode === "signin" ? "active" : ""} onClick={() => switchMode("signin")}>Ingresar</button>
            <button role="tab" aria-selected={mode === "signup"} className={mode === "signup" ? "active" : ""} onClick={() => switchMode("signup")}>Crear cuenta</button>
          </div>
          <header>
            <p className="eyebrow">{mode === "signup" ? "EMPEZÁ GRATIS" : "HOLA DE NUEVO"}</p>
            <h2>{mode === "signup" ? "Abrí tu agenda" : "Entrá a tu agenda"}</h2>
            <p>{mode === "signup" ? "Nombre, email y clave. Después te guiamos." : "Usá el email con el que creaste tu cuenta."}</p>
          </header>
          <form action={submit}>
            {mode === "signup" && <label className="auth-field"><span>Nombre de tu negocio</span><div><Store /><input name="negocio" required minLength={2} autoComplete="organization" placeholder="Ej: Barbería El Roble" /></div></label>}
            <label className="auth-field"><span>Email</span><div><Mail /><input name="email" required type="email" autoComplete="email" placeholder="vos@tubarberia.com" /></div></label>
            <label className="auth-field"><span>Clave</span><div><LockKeyhole /><input name="password" required minLength={8} type={showPassword ? "text" : "password"} autoComplete={mode === "signup" ? "new-password" : "current-password"} placeholder="Mínimo 8 caracteres" /><button type="button" aria-label={showPassword ? "Ocultar clave" : "Mostrar clave"} onClick={() => setShowPassword((value) => !value)}>{showPassword ? <EyeOff /> : <Eye />}</button></div></label>
            {error && <p className="auth-message error">{error}</p>}
            {notice && <p className="auth-message success">{notice}</p>}
            <button className="auth-submit" disabled={pending}>{pending ? <><span className="auth-spinner" /> Un segundo…</> : mode === "signup" ? <>Crear mi cuenta <Scissors /></> : "Entrar a Imán"}</button>
          </form>
          <p className="auth-fineprint">{mode === "signup" ? "Al crear tu cuenta aceptás usar Imán para gestionar tu negocio. Cancelás cuando quieras." : "¿Todavía no tenés cuenta? "}{mode === "signin" && <button onClick={() => switchMode("signup")}>Probalo gratis</button>}</p>
        </div>
      </section>
    </main>
  );
}
