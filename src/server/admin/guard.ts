import "server-only";

import { cache } from "react";
import { notFound, redirect } from "next/navigation";

import { env } from "@/env";
import getUserServer from "@/lib/user";
import { DEMO_MODE } from "@/server/db";

const FOUNDER_EMAIL = "santisonzini1234@gmail.com";

export function isFounderEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const allow = new Set(
    (env.ADMIN_EMAILS ?? FOUNDER_EMAIL)
      .split(",")
      .map((allowedEmail) => allowedEmail.trim().toLowerCase())
      .filter(Boolean),
  );
  return allow.has(email.trim().toLowerCase());
}

export const requireFounder = cache(async () => {
  const session = await getUserServer();
  if (DEMO_MODE) return session;
  if (!session?.user) redirect("/auth?next=/admin");
  if (!isFounderEmail(session.user.email)) notFound();
  return session;
});
