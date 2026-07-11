"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import Link from "next/link";
import { OrdersTable } from "./orders-table";
import { getOrders } from "@/app/actions/orders";

export default function OrdersPageTable({ id }: { id?: string}) {
  const { toast } = useToast();
  const [data, setData] = useState<any>({
    orders: [],
    pagination: {
      page: 0,
      pageSize: 10,
      totalPages: 0,
      totalCount: 0,
    },
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

  const fetchOrders = async () => {
    setLoading(true);
    const res = await getOrders(filters);
    setData(res);
    setLoading(false);
  };

  useEffect(() => {
    fetchOrders();
  }, [filters]);

  const handlePaginationChange = (page: number, pageSize: number) => {
    setFilters((prev) => ({ ...prev, page, pageSize }));
  };

  const handleSortingChange = (updatedSorting: any[]) => {
    if (updatedSorting.length > 0) {
      setFilters((prev) => ({
        ...prev,
        sortBy: updatedSorting[0].id,
        sortOrder: updatedSorting[0].desc ? "desc" : "asc",
      }));
    } else {
      setFilters((prev) => ({
        ...prev,
        sortBy: undefined,
        sortOrder: undefined,
      }));
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

  const handleEditOrder = (order: any) => {
    toast({
      title: "Editar pedido",
      description: `Editando el pedido #${order.orderNumber}`,
    });
  };

  const handleDeleteOrder = (order: any) => {
    toast({
      title: "Pedido eliminado",
      description: `Pedido #${order.orderNumber} fue eliminado correctamente.`,
    });
  };

 

  return (
    <div className="space-y-6 p-8">
      <div className="flex flex-row items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Pedidos</h1>
          <p className="text-sm text-gray-500">
            Administra tus pedidos con filtros, estados y detalles de cliente.
          </p>
        </div>

        <Link href="/dashboard/orders/create">
          <Button>Agregar pedido</Button>
        </Link>
      </div>

      <OrdersTable
        data={data} 
        handlePaginationChange={handlePaginationChange}
        handleSortingChange={handleSortingChange}
        handleFilterChange={handleFilterChange}
        onEditOrder={handleEditOrder}
        onDeleteOrder={handleDeleteOrder}
      />
    </div>
  );
}
