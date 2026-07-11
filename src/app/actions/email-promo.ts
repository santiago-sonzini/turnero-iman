"use server"
// Email marketing con la misma filosofía que WhatsApp: nada se manda solo
// sin que lo pidas. Siempre está el mailto: (abre tu cliente de correo con
// todo prefilled); con SMTP configurado (SMTP_USER/SMTP_PASS) se puede
// además enviar directo desde acá. Todo contacto queda registrado.
import { headers } from "next/headers"
import { env } from "@/env"
import { db } from "@/server/db"
import { revalidatePath } from "next/cache"
import { sendEmail } from "@/lib/mailer"

export interface EmailEstado {
  configurado: boolean
}

export async function getEmailEstado(): Promise<EmailEstado> {
  return { configurado: !!(env.SMTP_USER && env.SMTP_PASS) }
}

function absoluta(url: string | null | undefined): string | undefined {
  if (!url) return undefined
  if (/^https?:\/\//i.test(url)) return url
  const h = headers()
  const proto = h.get("x-forwarded-proto") ?? "http"
  const host = h.get("host") ?? "localhost:3000"
  return `${proto}://${host}${url.startsWith("/") ? url : `/${url}`}`
}

function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
}

export async function enviarEmailPromo(input: {
  clientId: string
  email: string
  asunto: string
  mensaje: string
  imagenUrl?: string | null
  templateId?: string | null
  templateName: string
  statusAtSend: string
  negocioNombre: string
}) {
  if (!env.SMTP_USER || !env.SMTP_PASS) {
    return { status: 400, message: "SMTP no configurado (SMTP_USER / SMTP_PASS)." }
  }
  if (!input.email || !input.asunto.trim() || !input.mensaje.trim()) {
    return { status: 400, message: "Faltan email, asunto o mensaje." }
  }

  const imagen = absoluta(input.imagenUrl)
  const html = `
    <div style="font-family: -apple-system, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; color: #221d16;">
      ${imagen ? `<img src="${imagen}" alt="" style="width: 100%; border-radius: 12px; margin-bottom: 16px;" />` : ""}
      <p style="font-size: 16px; line-height: 1.6; white-space: pre-wrap;">${escapeHtml(input.mensaje)}</p>
      <p style="font-size: 13px; color: #6f665a; margin-top: 24px;">${escapeHtml(input.negocioNombre)}</p>
    </div>
  `

  try {
    await sendEmail({ to: input.email, subject: input.asunto, html })
  } catch (e: any) {
    return { status: 502, message: `No se pudo enviar el email: ${e?.message ?? e}` }
  }

  await db.contactLog.create({
    data: {
      clientId: input.clientId,
      templateId: input.templateId ?? null,
      templateName: input.templateName || "personalizado",
      message: `[${input.asunto}] ${input.mensaje}`,
      statusAtSend: input.statusAtSend,
      channel: "email",
      mediaUrl: input.imagenUrl ?? null,
    },
  })
  revalidatePath("/dashboard")
  return { status: 200, message: "Email enviado y contacto registrado." }
}

// Registro del contacto cuando se usa mailto: (el envío lo hace tu cliente
// de correo, acá solo queda asentado).
export async function registrarContactoEmail(input: {
  clientId: string
  asunto: string
  mensaje: string
  imagenUrl?: string | null
  templateId?: string | null
  templateName: string
  statusAtSend: string
}) {
  await db.contactLog.create({
    data: {
      clientId: input.clientId,
      templateId: input.templateId ?? null,
      templateName: input.templateName || "personalizado",
      message: `[${input.asunto}] ${input.mensaje}`,
      statusAtSend: input.statusAtSend,
      channel: "email-mailto",
      mediaUrl: input.imagenUrl ?? null,
    },
  })
  revalidatePath("/dashboard")
  return { status: 200 }
}
