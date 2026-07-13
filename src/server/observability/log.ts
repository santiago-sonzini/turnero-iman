import "server-only";

import type { Prisma } from "@prisma/client";
import { systemDb } from "@/server/db";

const textOf = (error: unknown) => error instanceof Error ? error.message : String(error);

export async function logEmail(input: {
  tenantId?: string | null;
  template: string;
  to: string;
  ok: boolean;
  error?: string | null;
}): Promise<void> {
  try {
    await systemDb.emailLog.create({ data: { ...input, tenantId: input.tenantId ?? null } });
  } catch (error) {
    console.error("[observability] no se pudo registrar email", error);
  }
}

export async function logError(
  scope: string,
  error: unknown,
  meta?: Record<string, unknown>,
  tenantId?: string | null,
): Promise<void> {
  try {
    await systemDb.errorLog.create({
      data: {
        scope,
        message: textOf(error).slice(0, 4_000),
        stack: error instanceof Error ? error.stack?.slice(0, 20_000) : null,
        tenantId: tenantId ?? null,
        meta: meta ? (meta as Prisma.InputJsonValue) : undefined,
      },
    });
  } catch (writeError) {
    console.error("[observability] no se pudo registrar error", writeError);
  }
}

export function errorMessage(error: unknown): string {
  return textOf(error).slice(0, 2_000);
}
