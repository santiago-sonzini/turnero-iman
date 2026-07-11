import React from "react";
import { ColumnFiltersState, SortingState } from "@tanstack/react-table";
import { Order } from "@prisma/client";
import { createColumns } from "./columns";
import { DataTable } from "@/components/ui/data-table";

interface OrdersTableProps {
  data: {
    orders: Order[];
    pagination: {
      page: number;
      pageSize: number;
      totalPages: number;
    };
  };
  handlePaginationChange: (page: number, pageSize: number) => void;
  handleSortingChange: (sorting: SortingState) => void;
  handleFilterChange: (filters: ColumnFiltersState) => void;
  onEditOrder?: (order: Order) => void;
  onDeleteOrder?: (order: Order) => void;
}

export function OrdersTable({
  data,
  handlePaginationChange,
  handleSortingChange,
  handleFilterChange,
  onEditOrder,
  onDeleteOrder,
}: OrdersTableProps) {
  // Crear columnas específicas para pedidos
  const tableColumns = createColumns({
    onEdit: onEditOrder,
    onDelete: onDeleteOrder,
  });

  return (
    <DataTable
      columns={tableColumns}
      data={data.orders}
      searchKey="clientId"
      onPaginationChange={handlePaginationChange}
      onSortingChange={handleSortingChange}
      onFilterChange={handleFilterChange}
      serverSide={true}
      pagination={{
        pageIndex: data.pagination.page,
        pageSize: data.pagination.pageSize,
        pageCount: data.pagination.totalPages,
      }}
    />
  );
}
