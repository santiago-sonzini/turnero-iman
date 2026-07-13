import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { headers } from "next/headers";

import { env } from "@/env";
import { systemDb } from "./db";

function digest(value: string): string {
  if (env.NODE_ENV === "production" && !env.RATE_LIMIT_SALT) {
    throw new Error("RATE_LIMIT_SALT es obligatorio en producción");
  }
  return createHash("sha256")
    .update(`${env.RATE_LIMIT_SALT ?? "iman-local"}:${value}`)
    .digest("hex");
}

export async function requestFingerprint(): Promise<string> {
  const requestHeaders = await headers();
  const forwarded =
    requestHeaders.get("x-vercel-forwarded-for") ??
    requestHeaders.get("x-forwarded-for") ??
    requestHeaders.get("x-real-ip") ??
    "unknown";
  const ip = forwarded.split(",")[0]?.trim() || "unknown";
  return digest(ip);
}

export async function consumeRateLimit(params: {
  scope: string;
  subject: string;
  limit: number;
  windowMs: number;
}): Promise<boolean> {
  const key = digest(`${params.scope}:${params.subject}`);
  const now = new Date();
  const nextReset = new Date(now.getTime() + params.windowMs);

  // Un único UPSERT evita que dos requests concurrentes lean el mismo count y
  // atraviesen el límite. Si ya se agotó la ventana, WHERE impide el UPDATE y
  // RETURNING queda vacío.
  const rows = await systemDb.$queryRaw<Array<{ count: number }>>(Prisma.sql`
    INSERT INTO "RateLimitBucket" ("key", "count", "resetAt", "updatedAt")
    VALUES (${key}, 1, ${nextReset}, ${now})
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE
        WHEN "RateLimitBucket"."resetAt" <= ${now} THEN 1
        ELSE "RateLimitBucket"."count" + 1
      END,
      "resetAt" = CASE
        WHEN "RateLimitBucket"."resetAt" <= ${now} THEN ${nextReset}
        ELSE "RateLimitBucket"."resetAt"
      END,
      "updatedAt" = ${now}
    WHERE "RateLimitBucket"."resetAt" <= ${now}
       OR "RateLimitBucket"."count" < ${params.limit}
    RETURNING "count"
  `);

  // Limpieza probabilística y acotada de identificadores ya vencidos.
  if (key.startsWith("00")) {
    await systemDb.rateLimitBucket.deleteMany({
      where: { resetAt: { lt: new Date(now.getTime() - 86_400_000) } },
    });
  }
  return rows.length === 1;
}
