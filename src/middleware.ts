// Selección de pack de demo por URL: /?tipo=comercio&rubro=petshop fija la
// cookie y redirige a la URL limpia. Permite mandar links directos a un pack.
// Con DATABASE_URL (deploy real, no demo) es un passthrough total.
import { NextResponse, type NextRequest } from "next/server";
import {
  DEFAULT_RUBRO,
  DEFAULT_TIPO,
  DEMO_PACK_COOKIE,
  esRubro,
  esTipo,
  packIdDe,
  parsePackId,
} from "@/server/demo/packs/ids";

export function middleware(req: NextRequest) {
  // No-demo → nada que hacer.
  if (process.env.DATABASE_URL) return NextResponse.next();

  const url = req.nextUrl;
  const tipoParam = url.searchParams.get("tipo");
  const rubroParam = url.searchParams.get("rubro");
  if (!tipoParam && !rubroParam) return NextResponse.next();

  // Completar lo que falte con la cookie actual (o defaults).
  const actual = parsePackId(req.cookies.get(DEMO_PACK_COOKIE)?.value);
  const tipo = esTipo(tipoParam)
    ? tipoParam
    : actual?.tipo ?? DEFAULT_TIPO;
  const rubro = esRubro(rubroParam)
    ? rubroParam
    : actual?.rubro ?? DEFAULT_RUBRO;

  const limpia = url.clone();
  limpia.searchParams.delete("tipo");
  limpia.searchParams.delete("rubro");

  const res = NextResponse.redirect(limpia);
  res.cookies.set(DEMO_PACK_COOKIE, packIdDe(tipo, rubro), {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  return res;
}

export const config = {
  // Todo menos assets/estáticos; api queda afuera para no interferir.
  matcher: ["/((?!_next|api|favicon|demo|uploads|.*\\..*).*)"],
};
