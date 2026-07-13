import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacidad — Imán Turnos",
  description: "Cómo Imán Turnos trata los datos de negocios y clientes.",
};

export default function PrivacyPage() {
  return <main className="docs-page">
    <Link className="bk-volver" href="/">← Volver</Link>
    <p className="eyebrow">PRIVACIDAD</p>
    <h1>Cómo cuidamos tus datos</h1>
    <p className="docs-lead">Imán Turnos trata únicamente los datos necesarios para administrar agendas, reservas, comunicaciones y suscripciones.</p>
    <h2>Qué datos usamos</h2>
    <p>Datos de la cuenta y el negocio; servicios, horarios y agenda; nombre, teléfono y email opcional de clientes; estado de suscripción y registros técnicos de seguridad.</p>
    <h2>Para qué</h2>
    <p>Para prestar el servicio, confirmar reservas, enviar comunicaciones solicitadas, prevenir abuso, gestionar pagos y brindar soporte.</p>
    <h2>Proveedores</h2>
    <p>Podemos usar Supabase para autenticación y base de datos, Mercado Pago para suscripciones, el proveedor SMTP configurado para emails y, solo con aceptación explícita, el worker de WhatsApp. No vendemos datos personales.</p>
    <h2>Promociones</h2>
    <p>Son opt-in: una reserva no habilita promociones por defecto. El consentimiento puede retirarse contactando al negocio.</p>
    <h2>Acceso y eliminación</h2>
    <p>El dueño del negocio puede solicitar exportación, corrección o eliminación de sus datos y los de sus clientes escribiendo al canal de soporte publicado en la aplicación.</p>
    <p className="ayuda">Última actualización: 12 de julio de 2026.</p>
  </main>;
}
