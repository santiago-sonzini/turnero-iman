"use server";

// Cambia el pack de demo activo (cookie) desde el switcher del perfil.
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import {
  DEMO_PACK_COOKIE,
  esRubro,
  esTipo,
  packIdDe,
} from "@/server/demo/packs/ids";
import { DEMO_MODE } from "@/server/db";

export async function setDemoPack(tipo: string, rubro: string) {
  if (!DEMO_MODE) return { status: 400, message: "No disponible fuera del modo demo" };
  if (!esTipo(tipo) || !esRubro(rubro)) {
    return { status: 400, message: "Pack inválido" };
  }

  cookies().set(DEMO_PACK_COOKIE, packIdDe(tipo, rubro), {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });

  revalidatePath("/", "layout");
  return { status: 200, message: "Pack actualizado" };
}
