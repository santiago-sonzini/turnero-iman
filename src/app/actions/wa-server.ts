"use server"
// Integración OPCIONAL con el servidor de WhatsApp (wa-server/, open-wa).
// Si WA_SERVER_URL no está configurada, nada de esto se usa y la app sigue
// funcionando con links wa.me. El envío directo también registra el contacto.
import { headers } from "next/headers"
import { env } from "@/env"
import { db } from "@/server/db"
import { revalidatePath } from "next/cache"

export interface WaEstado {
  configurado: boolean
  conectado: boolean
}

function authHeaders(): Record<string, string> {
  return env.WA_SERVER_TOKEN
    ? { Authorization: `Bearer ${env.WA_SERVER_TOKEN}` }
    : {}
}

// Cache corto del estado: si el servidor está configurado pero caído, no
// queremos sumar el timeout a cada carga de página.
const estadoCache = { valor: null as WaEstado | null, hasta: 0 }

export async function getWaEstado(): Promise<WaEstado> {
  if (!env.WA_SERVER_URL) return { configurado: false, conectado: false }
  if (estadoCache.valor && Date.now() < estadoCache.hasta) return estadoCache.valor
  let estado: WaEstado
  try {
    const res = await fetch(`${env.WA_SERVER_URL}/estado`, {
      headers: authHeaders(),
      signal: AbortSignal.timeout(1500),
      cache: "no-store",
    })
    const data = res.ok ? ((await res.json()) as { conectado?: boolean }) : {}
    estado = { configurado: true, conectado: !!data.conectado }
  } catch {
    estado = { configurado: true, conectado: false }
  }
  estadoCache.valor = estado
  estadoCache.hasta = Date.now() + 15_000
  return estado
}

// Convierte rutas locales (/uploads/…, /demo/…) en URL absoluta para que el
// wa-server pueda descargar la imagen. Si el wa-server corre en otra máquina,
// este host tiene que ser alcanzable desde ahí.
function absoluta(url: string | null | undefined): string | undefined {
  if (!url) return undefined
  if (/^https?:\/\//i.test(url)) return url
  const h = headers()
  const proto = h.get("x-forwarded-proto") ?? "http"
  const host = h.get("host") ?? "localhost:3000"
  return `${proto}://${host}${url.startsWith("/") ? url : `/${url}`}`
}

export async function enviarWhatsAppDirecto(input: {
  clientId: string
  telefono: string
  mensaje: string
  imagenUrl?: string | null
  templateId?: string | null
  templateName: string
  statusAtSend: string
}) {
  if (!env.WA_SERVER_URL) {
    return { status: 400, message: "El servidor de WhatsApp no está configurado." }
  }
  try {
    const res = await fetch(`${env.WA_SERVER_URL}/enviar`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({
        telefono: input.telefono,
        mensaje: input.mensaje,
        imagenUrl: absoluta(input.imagenUrl),
      }),
      signal: AbortSignal.timeout(30000),
    })
    const data = (await res.json().catch(() => ({}))) as { error?: string }
    if (!res.ok) {
      return { status: res.status, message: data.error ?? "No se pudo enviar." }
    }

    await db.contactLog.create({
      data: {
        clientId: input.clientId,
        templateId: input.templateId ?? null,
        templateName: input.templateName || "personalizado",
        message: input.mensaje,
        statusAtSend: input.statusAtSend,
        channel: "whatsapp-server",
        mediaUrl: input.imagenUrl ?? null,
      },
    })
    revalidatePath("/dashboard")
    revalidatePath("/dashboard/resultados")
    return { status: 200, message: "Mensaje enviado y contacto registrado." }
  } catch (e: any) {
    const timeout = e?.name === "TimeoutError" || e?.name === "AbortError"
    return {
      status: 502,
      message: timeout
        ? "El servidor de WhatsApp no respondió a tiempo."
        : "No se pudo hablar con el servidor de WhatsApp.",
    }
  }
}
