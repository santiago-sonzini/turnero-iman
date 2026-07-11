// Webhook de Mercado Pago (Suscripciones).
// Configurar en el panel de MP → Webhooks → URL: {APP_URL}/api/mp/webhook
// con los eventos: subscription_preapproval, subscription_authorized_payment,
// payment. La "firma secreta" del panel va en MP_WEBHOOK_SECRET.
import { NextResponse, type NextRequest } from "next/server";

import { env } from "@/env";
import { procesarNotificacion, verificarFirma } from "@/server/mp/webhook";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const secreto = env.MP_WEBHOOK_SECRET;
  if (!secreto) {
    console.error("[mp] webhook recibido sin MP_WEBHOOK_SECRET configurado");
    return NextResponse.json({ error: "no configurado" }, { status: 500 });
  }

  // data.id llega por query string; el manifest de la firma usa ESE valor.
  const dataIdQuery = req.nextUrl.searchParams.get("data.id");
  const ok = verificarFirma({
    xSignature: req.headers.get("x-signature"),
    xRequestId: req.headers.get("x-request-id"),
    dataId: dataIdQuery,
    secreto,
  });
  if (!ok) {
    console.warn("[mp] webhook con firma inválida");
    return NextResponse.json({ error: "firma inválida" }, { status: 401 });
  }

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    /* algunos pings llegan sin body */
  }

  const tipo: string =
    body?.type ?? body?.topic ?? req.nextUrl.searchParams.get("type") ?? "";
  const dataId: string = String(body?.data?.id ?? dataIdQuery ?? "");

  if (!tipo || !dataId) return NextResponse.json({ ok: true });

  try {
    await procesarNotificacion(tipo, dataId);
  } catch (e) {
    // Respondemos 500 para que MP reintente (cada 15 min).
    console.error("[mp] error procesando webhook", tipo, dataId, e);
    return NextResponse.json({ error: "error interno" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
