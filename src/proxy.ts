import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

import { env } from "@/env";

// Supabase refreshes its session in server components. Public booking and MP
// webhooks intentionally bypass owner authentication.
export async function proxy(request: NextRequest) {
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) return NextResponse.next();

  let response = NextResponse.next({ request });
  const supabase = createServerClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
      },
    },
  });
  // getUser valida el JWT y permite que Supabase rote cookies vencidas.
  await supabase.auth.getUser();
  return response;
}

export const config = { matcher: ["/app/:path*", "/onboarding/:path*", "/suscripcion/:path*", "/admin/:path*"] };
