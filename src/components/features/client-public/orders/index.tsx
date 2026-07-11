"use client";

import { useState, useEffect, useCallback } from "react";
import { OrdersTable } from "./orders-table";
import Link from "next/link";
import { getOrders } from "@/app/actions/orders";
import { getClientAccountSummary } from "@/app/actions/payments";
import { formatARS } from "@/lib/format";
import { CreateOrderModal } from "@/components/features/client/orders/create-order-modal";
import { SummaryCard } from "@/components/features/client/orders/summary-card";
import { Client } from "@prisma/client";
import { CreditCard, Receipt, Wallet } from "lucide-react";

interface AccountSummary {
  totalFacturado: number;
  totalPagado: number;
  saldoPendiente: number;
  pedidos: number;
  pedidosPendientes: number;
}

export function OrdersPageTableClientPublic({
  id,
  client,
}: {
  id?: string;
  client: Client | null;
}) {
  const [data, setData] = useState<any>({
    orders: [],
    pagination: { page: 0, pageSize: 10, totalPages: 0, totalCount: 0 },
  });
  const [filters, setFilters] = useState({
    page: 0,
    pageSize: 10,
    sortBy: undefined as string | undefined,
    sortOrder: undefined as "asc" | "desc" | undefined,
    status: undefined as string | undefined,
    clientName: undefined as string | undefined,
    clientId: id as string | undefined,
  });
  const [summary, setSummary] = useState<AccountSummary | null>(null);

  const fetchOrders = useCallback(async () => {
    const res = await getOrders(filters, id);
    setData(res);
  }, [filters, id]);

  const fetchSummary = useCallback(async () => {
    if (!id) return;
    setSummary(await getClientAccountSummary(id));
  }, [id]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const refreshAll = useCallback(() => {
    fetchOrders();
    fetchSummary();
  }, [fetchOrders, fetchSummary]);

  const handlePaginationChange = (page: number, pageSize: number) =>
    setFilters((prev) => ({ ...prev, page, pageSize }));

  const handleSortingChange = (updatedSorting: any[]) => {
    if (updatedSorting.length > 0) {
      setFilters((prev) => ({
        ...prev,
        sortBy: updatedSorting[0].id,
        sortOrder: updatedSorting[0].desc ? "desc" : "asc",
      }));
    } else {
      setFilters((prev) => ({ ...prev, sortBy: undefined, sortOrder: undefined }));
    }
  };

  const handleFilterChange = (updatedFilters: any[]) => {
    const statusFilter = updatedFilters.find((f) => f.id === "status");
    setFilters((prev) => ({
      ...prev,
      status: statusFilter?.value || undefined,
      page: 0,
    }));
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5 p-3 sm:p-5">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="rounded-xl border bg-card p-5">
        <h1 className="text-2xl font-bold">Hola, {client?.name ?? "cliente"}</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Acá podés ver tus pedidos, tu saldo y armar un nuevo pedido.
        </p>
      </div>

      {/* ── Resumen ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 [&>*]:min-w-0">
        <SummaryCard
          label="Saldo pendiente"
          value={summary ? formatARS(summary.saldoPendiente) : "—"}
          icon={<Wallet className="h-4 w-4" />}
          highlight={!!summary && summary.saldoPendiente > 0}
        />
        <SummaryCard
          label="Total comprado"
          value={summary ? formatARS(summary.totalFacturado) : "—"}
          icon={<Receipt className="h-4 w-4" />}
        />
        <SummaryCard
          label="Total pagado"
          value={summary ? formatARS(summary.totalPagado) : "—"}
          icon={<CreditCard className="h-4 w-4" />}
        />
        <SummaryCard
          label="Pedidos"
          value={summary ? `${summary.pedidos}` : "—"}
          sub={summary && summary.pedidosPendientes > 0 ? `${summary.pedidosPendientes} pendientes` : undefined}
          icon={<Receipt className="h-4 w-4" />}
        />
      </div>

      {/* ── Acciones ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {id && (
          <CreateOrderModal
            clientId={id}
            clientName={client?.name}
            onCreated={refreshAll}
            trigger="card"
          />
        )}
        <Link href={`/history/${id}/payments`} className="block">
          <div className="group flex items-start justify-between rounded-lg border border-primary p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
            <div>
              <h3 className="text-base font-medium text-text">Mis pagos</h3>
              <p className="mt-1 text-sm text-text">Ver historial de pagos</p>
            </div>
            <CreditCard className="text-text opacity-40 transition-all duration-300 group-hover:translate-x-1 group-hover:opacity-60" />
          </div>
        </Link>
      </div>

      {/* ── Pedidos ────────────────────────────────────────── */}
      <div className="rounded-xl border bg-card p-4">
        <h2 className="mb-3 text-lg font-semibold">Mis pedidos</h2>
        <div className="relative w-full overflow-x-auto">
          <OrdersTable
            data={data}
            handlePaginationChange={handlePaginationChange}
            handleSortingChange={handleSortingChange}
            handleFilterChange={handleFilterChange}
          />
        </div>
      </div>
    </div>
  );
}
