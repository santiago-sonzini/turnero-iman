// Webhook de Mercado Pago (Suscripciones).
// Configurar en el panel de MP → Webhooks → URL: {APP_URL}/api/mp/webhook
// con los eventos: subscription_preapproval, subscription_authorized_payment,
// payment. La "firma secreta" del panel va en MP_WEBHOOK_SECRET.
import { NextResponse, type NextRequest } from "next/server";
import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { z } from "zod";

import { env } from "@/env";
import { procesarNotificacion, verificarFirma } from "@/server/mp/webhook";
import { systemDb } from "@/server/db";
import { logError } from "@/server/observability/log";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const secreto = env.MP_WEBHOOK_SECRET;
  if (!secreto) {
    console.error("[mp] webhook recibido sin MP_WEBHOOK_SECRET configurado");
    await logError("mp_webhook", new Error("MP_WEBHOOK_SECRET no configurado"));
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

  let rawBody: unknown = {};
  try {
    rawBody = await req.json();
  } catch {
    /* algunos pings llegan sin body */
  }

  const parsed = z.object({
    type: z.string().optional(),
    topic: z.string().optional(),
    data: z.object({ id: z.union([z.string(), z.number()]) }).optional(),
  }).passthrough().safeParse(rawBody);
  const body = parsed.success ? parsed.data : {};
  const tipo = body.type ?? body.topic ?? req.nextUrl.searchParams.get("type") ?? "";
  const bodyDataId = body.data?.id === undefined ? "" : String(body.data.id);
  const dataId = bodyDataId || dataIdQuery || "";

  // La firma ata data.id de la query. El body no puede cambiar el recurso que
  // se procesa conservando una firma válida capturada de otro evento.
  if (bodyDataId && dataIdQuery && bodyDataId !== dataIdQuery) {
    return NextResponse.json({ error: "data.id inconsistente" }, { status: 400 });
  }

  if (!tipo || !dataId) return NextResponse.json({ ok: true });

  const requestId = req.headers.get("x-request-id") ?? "";
  const eventId = createHash("sha256").update(`${requestId}:${tipo}:${dataId}`).digest("hex");
  const existing = await systemDb.webhookEvent.findUnique({ where: { id: eventId } });
  if (existing?.processedAt) return NextResponse.json({ ok: true, duplicate: true });
  if (existing && existing.createdAt > new Date(Date.now() - 5 * 60_000)) {
    return NextResponse.json({ ok: true, processing: true });
  }
  if (!existing) {
    try {
      await systemDb.webhookEvent.create({ data: { id: eventId, type: tipo, dataId } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        return NextResponse.json({ ok: true, processing: true });
      }
      throw error;
    }
  }

  try {
    await procesarNotificacion(tipo, dataId);
  } catch (e) {
    // Respondemos 500 para que MP reintente (cada 15 min).
    console.error("[mp] error procesando webhook", tipo, dataId, e);
    await logError("mp_webhook", e, { tipo, dataId });
    return NextResponse.json({ error: "error interno" }, { status: 500 });
  }

  await systemDb.webhookEvent.update({ where: { id: eventId }, data: { processedAt: new Date() } });

  return NextResponse.json({ ok: true });
}
