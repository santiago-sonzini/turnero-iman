"use client";

import React, { useMemo } from "react";
import { DataTable } from "@/components/ui/data-table";
import { ColumnFiltersState, SortingState } from "@tanstack/react-table";
import { Payment } from "@prisma/client";
import { createPaymentColumns } from "./columns";

interface PaymentsTableProps {
  data: {
    payments: Payment[];
    pagination: {
      page: number;
      pageSize: number;
      totalPages: number;
    };
  };
  handlePaginationChange: (page: number, pageSize: number) => void;
  handleSortingChange: (sorting: SortingState) => void;
  handleFilterChange: (filters: ColumnFiltersState) => void;
  onDeletePayment?: (payment: Payment) => void;
}

export function PaymentsTable({
  data,
  handlePaginationChange,
  handleSortingChange,
  handleFilterChange,
  onDeletePayment,
}: PaymentsTableProps) {

  // Columnas memoizadas
  const tableColumns = useMemo(
    () =>
      createPaymentColumns({
        onDelete: onDeletePayment,
      }),
    [onDeletePayment]
  );

  return (
    <DataTable
      columns={tableColumns}
      data={data.payments}
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
