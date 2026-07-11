"use client";

// Página pública "Mis pagos": historial read-only del cliente con su saldo.
// Sin creación, edición ni borrado de pagos — eso vive solo en el dashboard.
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, CreditCard, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { getPayments, getClientAccountSummary } from "@/app/actions/payments";
import { formatARS } from "@/lib/format";
import { SummaryCard } from "@/components/features/client/orders/summary-card";
import { paymentColumns } from "./columns";
import { Client, Payment } from "@prisma/client";

interface AccountSummary {
  totalFacturado: number;
  totalPagado: number;
  saldoPendiente: number;
  pedidos: number;
  pedidosPendientes: number;
}

export function PaymentsPublic({
  id,
  client,
}: {
  id?: string;
  client: Client | null;
}) {
  const [data, setData] = useState<{
    payments: Payment[];
    pagination: {
      page: number;
      pageSize: number;
      totalPages: number;
      totalCount: number;
    };
  }>({
    payments: [],
    pagination: { page: 0, pageSize: 10, totalPages: 0, totalCount: 0 },
  });
  const [summary, setSummary] = useState<AccountSummary | null>(null);
  const [filters, setFilters] = useState({ page: 0, pageSize: 10 });

  const fetchAll = useCallback(async () => {
    if (!id) return;
    const [res, s] = await Promise.all([
      getPayments({ ...filters, clientId: id }, id),
      getClientAccountSummary(id),
    ]);
    setData(res);
    setSummary(s);
  }, [filters, id]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handlePaginationChange = (page: number, pageSize: number) =>
    setFilters({ page, pageSize });

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5 p-3 sm:p-5">
      {/* ── Header ───────────────────────────────────────── */}
      <div className="flex flex-col gap-3 rounded-xl border bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Mis pagos</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Historial de pagos de {client?.name ?? "tu cuenta"}.
          </p>
        </div>
        <Link href={`/history/${id}`}>
          <Button variant="outline" size="sm" className="h-9">
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
            Volver a mis pedidos
          </Button>
        </Link>
      </div>

      {/* ── Resumen ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 [&>*]:min-w-0">
        <SummaryCard
          label="Saldo pendiente"
          value={summary ? formatARS(summary.saldoPendiente) : "—"}
          icon={<Wallet className="h-4 w-4" />}
          highlight={!!summary && summary.saldoPendiente > 0}
        />
        <SummaryCard
          label="Total pagado"
          value={summary ? formatARS(summary.totalPagado) : "—"}
          icon={<CreditCard className="h-4 w-4" />}
        />
      </div>

      {/* ── Historial ────────────────────────────────────── */}
      <div className="rounded-xl border bg-card p-4">
        <h2 className="mb-3 text-lg font-semibold">Historial</h2>
        <div className="relative w-full overflow-x-auto">
          <DataTable
            columns={paymentColumns}
            data={data.payments}
            onPaginationChange={handlePaginationChange}
            serverSide={true}
            pagination={{
              pageIndex: data.pagination.page,
              pageSize: data.pagination.pageSize,
              pageCount: data.pagination.totalPages,
            }}
          />
        </div>
      </div>
    </div>
  );
}
