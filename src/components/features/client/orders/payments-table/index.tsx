"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

// COMPONENTES
import { PaymentsTable } from "./table";
import { getPayments, deletePayment } from "@/app/actions/payments";
import PaymentCard from "@/components/features/payments/create-payment-card";

// TIPOS
import { Client, Payment } from "@prisma/client";

export function PaymentsPageTableClient({
  id,
  client,
}: {
  id?: string;
  client: Client | null;
}) {
  const { toast } = useToast();

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

  const [filters, setFilters] = useState({
    page: 0,
    pageSize: 10,
    sortBy: undefined as string | undefined,
    sortOrder: undefined as "asc" | "desc" | undefined,
    paymentMethod: undefined as string | undefined,
    clientId: id,
  });

  const fetchPayments = useCallback(async () => {
    const res = await getPayments(filters, id);
    setData(res);
  }, [filters, id]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

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
    const methodFilter = updatedFilters.find((f) => f.id === "paymentMethod");
    setFilters((prev) => ({
      ...prev,
      paymentMethod: methodFilter?.value || undefined,
      page: 0,
    }));
  };

  const handleDeletePayment = async (payment: Payment) => {
    const res = await deletePayment(payment.id);
    toast({
      title: res.status === 200 ? "Pago eliminado" : "Error",
      description: res.message,
    });
    if (res.status === 200) fetchPayments();
  };

  return (
    <div className="no-scrollbar h-full w-full overflow-y-auto overflow-x-hidden px-3 py-4 sm:px-0 sm:py-8">
      <div className="mx-auto w-full max-w-5xl space-y-5">
        {/* ── Header ───────────────────────────────────────── */}
        <div className="flex flex-col gap-3 rounded-xl border bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Pagos</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {client?.name ?? "Cliente"} · registrá pagos y revertí los que
              estén mal cargados.
            </p>
          </div>
          <Link href={`/dashboard/clients/${id}`}>
            <Button variant="outline" size="sm" className="h-9">
              <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
              Volver al cliente
            </Button>
          </Link>
        </div>

        {/* ── Registrar pago ───────────────────────────────── */}
        {client && <PaymentCard update={fetchPayments} client={client} />}

        {/* ── Historial ────────────────────────────────────── */}
        <div className="rounded-xl border bg-card p-4">
          <h2 className="mb-3 text-lg font-semibold">Historial de pagos</h2>
          <div className="relative w-full overflow-x-auto">
            <PaymentsTable
              data={data}
              handlePaginationChange={handlePaginationChange}
              handleSortingChange={handleSortingChange}
              handleFilterChange={handleFilterChange}
              onDeletePayment={handleDeletePayment}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
