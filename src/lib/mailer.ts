"use server";
import nodemailer from "nodemailer";

/** ¿Hay SMTP configurado? (sin esto, los envíos se saltean en silencio). */
export async function emailConfigurado(): Promise<boolean> {
  return !!(process.env.SMTP_USER && process.env.SMTP_PASS);
}

function transporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp-relay.brevo.com",
    port: Number(process.env.SMTP_PORT || 587),
    secure: false, // 587 = STARTTLS
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

/**
 * Envía un email. El `from` sale de SMTP_FROM (remitente VERIFICADO en el
 * proveedor; Brevo rechaza remitentes sin verificar). Si falta, usa SMTP_USER.
 */
export async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
  if (!(await emailConfigurado())) throw new Error("SMTP no configurado");
  const from = process.env.SMTP_FROM || process.env.SMTP_USER!;
  const fromName = process.env.SMTP_FROM_NAME || "Imán Turnos";
  await transporter().sendMail({ from: `"${fromName}" <${from}>`, to, subject, html });
}
