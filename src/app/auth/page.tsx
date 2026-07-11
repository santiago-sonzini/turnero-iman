import type { Metadata } from "next";
import { AuthScreen } from "@/components/turnos/auth-screen";

export const metadata: Metadata = { title: "Ingresá o creá tu cuenta — Imán Turnos" };

export default function AuthPage({ searchParams }: { searchParams: { modo?: string } }) {
  return <AuthScreen initialMode={searchParams.modo === "signup" ? "signup" : "signin"} />;
}
