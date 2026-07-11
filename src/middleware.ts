import { NextResponse, type NextRequest } from "next/server";

// Supabase refreshes its session in server components. Public booking and MP
// webhooks intentionally bypass owner authentication.
export function middleware(_request: NextRequest) {
  return NextResponse.next();
}

export const config = { matcher: ["/app/:path*", "/onboarding/:path*", "/suscripcion/:path*"] };
