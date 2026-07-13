import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3, Building2, ExternalLink } from "lucide-react";

import { MagnetLogo } from "@/components/turnos/magnet-logo";
import { requireFounder } from "@/server/admin/guard";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Founder cockpit", robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireFounder();
  return <div className="admin-shell min-h-screen bg-[#09090b] text-zinc-100">
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-white/10 bg-[#09090b]/95 p-5 backdrop-blur-xl lg:flex lg:flex-col">
      <Link href="/admin" className="flex items-center gap-3"><MagnetLogo /><span><b className="block font-display text-lg">Imán</b><small className="text-[10px] font-black uppercase tracking-[.2em] text-orange-300">Founder OS</small></span></Link>
      <nav className="mt-10 space-y-1 text-sm"><Link href="/admin" className="flex items-center gap-3 rounded-xl bg-white/[.06] px-3 py-2.5 text-zinc-100"><BarChart3 className="h-4 w-4 text-orange-300" />Overview</Link><Link href="/admin/negocios" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-zinc-400 hover:bg-white/[.04] hover:text-zinc-100"><Building2 className="h-4 w-4" />Negocios</Link></nav>
      <Link href="/app" className="mt-auto flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2.5 text-sm text-zinc-500 hover:text-zinc-200">Panel del negocio <ExternalLink className="ml-auto h-4 w-4" /></Link>
    </aside>
    <header className="sticky top-0 z-20 flex items-center border-b border-white/10 bg-[#09090b]/85 px-4 py-3 backdrop-blur-xl lg:hidden"><Link href="/admin" className="flex items-center gap-2"><MagnetLogo /><b>Founder OS</b></Link><Link href="/admin/negocios" className="ml-auto text-xs text-zinc-400">Negocios</Link></header>
    <div className="lg:pl-64">{children}</div>
  </div>;
}
