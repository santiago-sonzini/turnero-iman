"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import Link from "next/link";
import { OrdersTable } from "./orders-table";
import { getOrders, deleteOrderAction } from "@/app/actions/orders";
import {
  quickPayOrder,
  getClientAccountSummary,
} from "@/app/actions/payments";
import { SummaryCard } from "./summary-card";
import {
  createClientAccount,
  getClientAccount,
} from "@/app/actions/clients";
import { formatARS } from "@/lib/format";
import { ClientForm } from "@/components/features/client/client-form";
import { CreateOrderModal } from "./create-order-modal";
import PaymentSidePanel from "../../payments/create-payment-modal";
import { Client, Order } from "@prisma/client";
import {
  Check,
  Copy,
  CreditCard,
  ExternalLink,
  Link2,
  Pencil,
  Receipt,
  UserPlus,
  Wallet,
} from "lucide-react";

interface AccountSummary {
  totalFacturado: number;
  totalPagado: number;
  saldoPendiente: number;
  pedidos: number;
  pedidosPendientes: number;
}

export function OrdersPageTableClient({
  id,
  client,
}: {
  id?: string;
  client: Client | null;
}) {
  const { toast } = useToast();
  const router = useRouter();

  const [data, setData] = useState<any>({
    orders: [],
    pagination: { page: 0, pageSize: 10, totalPages: 0, totalCount: 0 },
  });
  const [loading, setLoading] = useState(true);
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
  const [editOpen, setEditOpen] = useState(false);
  const [account, setAccount] = useState<{ enabled: boolean } | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    const res = await getOrders(filters, id);
    setData(res);
    setLoading(false);
  }, [filters, id]);

  const fetchSummary = useCallback(async () => {
    if (!id) return;
    const [s, a] = await Promise.all([
      getClientAccountSummary(id),
      getClientAccount(id),
    ]);
    setSummary(s);
    setAccount({ enabled: a.enabled });
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
    const clientFilter = updatedFilters.find((f) => f.id === "clientName");
    setFilters((prev) => ({
      ...prev,
      status: statusFilter?.value || undefined,
      clientName: clientFilter?.value || undefined,
      page: 0,
    }));
  };

  const handleQuickPay = async (order: Order) => {
    const res = await quickPayOrder(order.id);
    toast({
      title: res.status === 200 ? "Pago registrado" : "Error",
      description: res.message,
    });
    if (res.status === 200) refreshAll();
  };

  const handleDeleteOrder = async (order: Order) => {
    const res = await deleteOrderAction(order.id);
    toast({
      title: res.success ? "Pedido eliminado" : "Error",
      description: res.success
        ? `El pedido ${order.orderNumber} fue eliminado.`
        : res.error ?? "No se pudo eliminar el pedido.",
    });
    if (res.success) refreshAll();
  };

  const handleCreateAccount = async () => {
    if (!id) return;
    const res = await createClientAccount(id);
    toast({ title: res.status === 200 ? "Cuenta habilitada" : "Error", description: res.message });
    if (res.status === 200) setAccount({ enabled: true });
  };

  const publicUrl = id
    ? (typeof window !== "undefined" ? window.location.origin : "") + `/history/${id}`
    : "";

  const copyPublicLink = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    toast({ title: "Link copiado", description: "Se copió el link de la página del cliente." });
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5 p-3 sm:p-5">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 rounded-xl border bg-card p-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="truncate text-2xl font-bold">{client?.name ?? "Cliente"}</h1>
            <Link target="_blank" href={`/history/${id}`} title="Ver página pública">
              <ExternalLink className="h-4 w-4 text-muted-foreground hover:text-foreground" />
            </Link>
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {client?.phone ? `${client.phone} · ` : ""}
            {client?.email || "Sin email"}
            {client?.adress ? ` · ${client.adress}` : ""}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" className="h-9" onClick={() => setEditOpen(true)}>
            <Pencil className="mr-1.5 h-3.5 w-3.5" />
            Editar
          </Button>

          {id && (
            <CreateOrderModal
              clientId={id}
              clientName={client?.name}
              onCreated={refreshAll}
            />
          )}

          {client && (
            <PaymentSidePanel client={client} update={refreshAll} triggerType="action" />
          )}
        </div>
      </div>

      {/* ── Resumen de cuenta ──────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 [&>*]:min-w-0">
        <SummaryCard
          label="Saldo pendiente"
          value={summary ? formatARS(summary.saldoPendiente) : "—"}
          icon={<Wallet className="h-4 w-4" />}
          highlight={!!summary && summary.saldoPendiente > 0}
        />
        <SummaryCard
          label="Total facturado"
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

      {/* ── Cuenta pública del cliente ─────────────────────── */}
      <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link2 className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">Página del cliente</p>
            <p className="text-xs text-muted-foreground">
              {account?.enabled
                ? "Cuenta habilitada. Compartí el link para que el cliente vea sus pedidos y pagos."
                : "Creá una cuenta para que el cliente pueda acceder a su página."}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {account?.enabled ? (
            <>
              <Button variant="outline" size="sm" className="h-9" onClick={copyPublicLink}>
                {copied ? <Check className="mr-1.5 h-3.5 w-3.5" /> : <Copy className="mr-1.5 h-3.5 w-3.5" />}
                {copied ? "Copiado" : "Copiar link"}
              </Button>
              <Link href={`/history/${id}`} target="_blank">
                <Button size="sm" className="h-9">
                  <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                  Abrir
                </Button>
              </Link>
            </>
          ) : (
            <Button size="sm" className="h-9" onClick={handleCreateAccount}>
              <UserPlus className="mr-1.5 h-3.5 w-3.5" />
              Crear cuenta
            </Button>
          )}
        </div>
      </div>

      {/* ── Pedidos ────────────────────────────────────────── */}
      <div className="rounded-xl border bg-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Pedidos y facturas</h2>
        </div>
        <div className="relative w-full overflow-x-auto">
          <OrdersTable
            data={data}
            handlePaginationChange={handlePaginationChange}
            handleSortingChange={handleSortingChange}
            handleFilterChange={handleFilterChange}
            onQuickPay={handleQuickPay}
            onDeleteOrder={handleDeleteOrder}
          />
        </div>
      </div>

      {/* Modal de edición de cliente */}
      {client && (
        <ClientForm
          open={editOpen}
          onOpenChange={setEditOpen}
          initialData={client}
          onSuccess={() => {
            toast({ title: "Cliente actualizado" });
            router.refresh();
            fetchSummary();
          }}
        />
      )}
    </div>
  );
}
