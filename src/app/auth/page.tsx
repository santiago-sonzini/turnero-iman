import type { Metadata } from "next";
import { AuthScreen } from "@/components/turnos/auth-screen";

export const metadata: Metadata = { title: "Ingresá o creá tu cuenta — Imán Turnos" };

export default async function AuthPage(props: { searchParams: Promise<{ modo?: string }> }) {
  const searchParams = await props.searchParams;
  return <AuthScreen initialMode={searchParams.modo === "signup" ? "signup" : "signin"} />;
}
