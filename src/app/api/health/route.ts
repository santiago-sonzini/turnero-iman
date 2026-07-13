import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";

import { env } from "@/env";
import { recordHealthSample } from "@/server/observability/health";
import { logError } from "@/server/observability/log";

export const dynamic = "force-dynamic";

function authorized(req: NextRequest): boolean {
  const received = req.headers.get("authorization") ?? "";
  const expected = env.CRON_SECRET ? `Bearer ${env.CRON_SECRET}` : "";
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  return !!expected && a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const services = await recordHealthSample();
    return NextResponse.json({ ok: services.every((service) => service.ok), services });
  } catch (error) {
    await logError("health_cron", error);
    return NextResponse.json({ error: "health check failed" }, { status: 500 });
  }
}
