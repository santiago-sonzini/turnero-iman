import { Building2 } from "lucide-react";
import { TenantsTable } from "@/components/admin/tenants-table";
import { listTenants } from "@/server/admin/metrics";

export default async function NegociosPage() {
  const tenants = await listTenants();
  return <main className="mx-auto max-w-[1500px] px-4 py-8 sm:px-6 lg:px-8 lg:py-10"><header className="mb-8"><p className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-[.2em] text-orange-300"><Building2 className="h-4 w-4" />Base completa</p><h1 className="text-3xl text-white">Negocios</h1><p className="mt-2 text-sm text-zinc-500">{tenants.length} cuentas registradas en Imán.</p></header><section className="rounded-2xl border border-white/10 bg-white/[.035] p-5"><TenantsTable data={tenants} /></section></main>;
}
