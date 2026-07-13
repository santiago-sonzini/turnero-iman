"use server";

import { logError } from "@/server/observability/log";
import { consumeRateLimit, requestFingerprint } from "@/server/rate-limit";

export async function reportClientError(message: string, stack?: string): Promise<void> {
  const fingerprint = await requestFingerprint();
  if (!(await consumeRateLimit({ scope: "client-error", subject: fingerprint, limit: 10, windowMs: 60_000 }))) return;
  const safeMessage = String(message).slice(0, 2_000);
  const safeStack = stack ? String(stack).slice(0, 10_000) : undefined;
  await logError("app", new Error(safeMessage), safeStack ? { clientStack: safeStack } : undefined);
}
