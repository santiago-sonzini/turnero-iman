// Resolución del pack de demo activo para el request actual (cookie).
// No importa db.ts (evita ciclo): decide "modo demo" directo desde env.
import { cookies } from "next/headers";
import { env } from "@/env";
import {
  DEFAULT_PACK_ID,
  DEMO_PACK_COOKIE,
  parsePackId,
} from "./packs/ids";
import { packInfoDe } from "./packs";
import type { DemoPackInfo } from "./packs/types";

const esDemo = () => !env.DATABASE_URL;

/**
 * Pack activo según la cookie del request. Fuera de un request (o cookie
 * inválida) cae al pack default. Seguro de llamar desde el proxy de db.
 */
export function getDemoPackId(): string {
  if (!esDemo()) return DEFAULT_PACK_ID;
  try {
    const raw = cookies().get(DEMO_PACK_COOKIE)?.value;
    return parsePackId(raw) ? raw! : DEFAULT_PACK_ID;
  } catch {
    // cookies() fuera de scope de request (build, scripts) → default.
    return DEFAULT_PACK_ID;
  }
}

/** Info del pack para gates/vocabulario. `null` cuando NO es modo demo. */
export async function getDemoPackInfo(): Promise<DemoPackInfo | null> {
  if (!esDemo()) return null;
  return packInfoDe(getDemoPackId());
}
