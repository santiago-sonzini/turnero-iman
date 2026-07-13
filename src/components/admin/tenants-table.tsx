"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { ExternalLink, Eye } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import { formatoArs } from "@/server/plans";

export type TenantRow = { id: string; name: string; slug: string; plan: string | null; planStatus: string; access: string; mrrArs: number; createdAt: string; appointments: number; clients: number; mpPayerEmail: string | null };
const columns: ColumnDef<TenantRow>[] = [
  { accessorKey: "name", header: "Negocio", cell: ({ row }) => <Link href={`/admin/negocios/${row.original.slug}`} className="group block"><b className="block text-zinc-100 group-hover:text-orange-300">{row.original.name}</b><small className="text-zinc-600">/{row.original.slug}</small></Link> },
  { accessorKey: "planStatus", header: "Estado", cell: ({ row }) => <span className="rounded-full border border-white/10 bg-white/[.05] px-2.5 py-1 text-xs text-zinc-300">{row.original.planStatus}</span> },
  { accessorKey: "plan", header: "Plan", cell: ({ row }) => row.original.plan?.replace("_", " ") ?? "—" },
  { accessorKey: "mrrArs", header: "MRR", cell: ({ row }) => <span className="font-mono">{formatoArs(row.original.mrrArs)}</span> },
  { accessorKey: "clients", header: "Clientes" },
  { accessorKey: "appointments", header: "Turnos" },
  { id: "open", header: "", cell: ({ row }) => <span className="flex items-center justify-end gap-1"><Link href={`/admin/negocios/${row.original.slug}`} aria-label={`Ver detalle de ${row.original.name}`} title="Ver detalle" className="inline-flex rounded-lg p-2 text-orange-300 hover:bg-orange-400/10"><Eye className="h-4 w-4" /></Link><Link href={`/${row.original.slug}/turnos`} target="_blank" aria-label={`Abrir agenda pública de ${row.original.name}`} title="Abrir agenda pública" className="inline-flex rounded-lg p-2 text-zinc-500 hover:bg-white/[.05] hover:text-zinc-200"><ExternalLink className="h-4 w-4" /></Link></span> },
];
export function TenantsTable({ data }: { data: TenantRow[] }) { return <DataTable columns={columns} data={data} searchKey="name" />; }
