import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";

import { env } from "@/env";
import { systemDb } from "@/server/db";
import { reconciliarTenantMercadoPago } from "@/server/mp/reconcile";

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
  const tenants = await systemDb.tenant.findMany({
    where: {
      plan: { not: null },
      mpPayerEmail: { not: null },
      planStatus: { in: ["ONBOARDING", "TRIALING", "ACTIVE", "PAST_DUE"] },
    },
    select: { id: true },
    orderBy: { updatedAt: "asc" },
    take: 100,
  });
  const results: Record<string, string> = {};
  for (const tenant of tenants) {
    try {
      results[tenant.id] = (await reconciliarTenantMercadoPago(tenant.id)).status;
    } catch (error) {
      console.error("[mp] reconciliación automática falló", tenant.id, error);
      results[tenant.id] = "error";
    }
  }
  return NextResponse.json({ ok: true, processed: tenants.length, results });
}
