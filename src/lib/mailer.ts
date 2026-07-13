"use server";
import nodemailer from "nodemailer";
import { logEmail, errorMessage } from "@/server/observability/log";

/** ¿Hay SMTP configurado? (sin esto, los envíos se saltean en silencio). */
export async function emailConfigurado(): Promise<boolean> {
  return !!(process.env.SMTP_USER && process.env.SMTP_PASS);
}

function transporter() {
  const port = Number(process.env.SMTP_PORT || 587);
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp-relay.brevo.com",
    port,
    secure: port === 465,
    requireTLS: port !== 465,
    connectionTimeout: 8_000,
    socketTimeout: 15_000,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

export async function verifyEmail(): Promise<void> {
  if (!(await emailConfigurado())) throw new Error("no configurado");
  await transporter().verify();
}

/**
 * Envía un email. El `from` sale de SMTP_FROM (remitente VERIFICADO en el
 * proveedor; Brevo rechaza remitentes sin verificar). Si falta, usa SMTP_USER.
 */
export async function sendEmail({ to, subject, html, template = "sin_clasificar", tenantId }: {
  to: string; subject: string; html: string; template?: string; tenantId?: string | null;
}) {
  try {
    if (!(await emailConfigurado())) throw new Error("SMTP no configurado");
    const from = process.env.SMTP_FROM || process.env.SMTP_USER!;
    const fromName = process.env.SMTP_FROM_NAME || "Imán Turnos";
    await transporter().sendMail({ from: `"${fromName}" <${from}>`, to, subject, html });
    await logEmail({ tenantId, template, to, ok: true });
  } catch (error) {
    await logEmail({ tenantId, template, to, ok: false, error: errorMessage(error) });
    await logErrorForMailer(error, tenantId, template);
    throw error;
  }
}

async function logErrorForMailer(error: unknown, tenantId?: string | null, template?: string) {
  const { logError } = await import("@/server/observability/log");
  await logError("email", error, { template }, tenantId);
}
