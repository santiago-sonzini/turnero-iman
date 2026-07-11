"use client";

import { useState } from "react";
import { DataTable } from "@/components/ui/data-table";
import { ColumnFiltersState, SortingState } from "@tanstack/react-table";
import { createColumns } from "./columns";
import { Product } from "@prisma/client";

interface ProductTableProps {
  data: {
    products: Product[];
    pagination: {
      page: number;
      pageSize: number;
      totalPages: number;
    };
  };
  loading: boolean;
  handlePaginationChange: (page: number, pageSize: number) => void;
  handleSortingChange: (sorting: SortingState) => void;
  handleFilterChange: (filters: ColumnFiltersState) => void;
  onEditProduct?: (product: Product) => void;
  onDeleteProduct?: (product: Product) => void;
}

export function ProductTable({
  loading,
  data,
  handlePaginationChange,
  handleSortingChange,
  handleFilterChange,
  onEditProduct,
  onDeleteProduct,
}: ProductTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [filters, setFilters] = useState<ColumnFiltersState>([]);

  const tableColumns = createColumns({
    onEdit: onEditProduct,
    onDelete: onDeleteProduct,
  });

  // Adaptar el callback al tipo esperado por DataTable
  const handleClientSortingChange = (updatedSorting: SortingState) => {
    setSorting(updatedSorting);
    handleSortingChange(updatedSorting);
  };

  const handleClientFilterChange = (updatedFilters: ColumnFiltersState) => {
    setFilters(updatedFilters);
    handleFilterChange(updatedFilters);
  };

  return (
    <DataTable
      loading={loading}
      columns={tableColumns}
      data={data?.products ?? []}
      searchKey="name"
      onPaginationChange={handlePaginationChange}
      onSortingChange={handleClientSortingChange}
      onFilterChange={handleClientFilterChange}
      serverSide
      pagination={{
        pageIndex: data?.pagination.page?? 0,
        pageSize: data?.pagination.pageSize?? 0,
        pageCount: data?.pagination.totalPages ?? 0,
      }}
    />
  );
}
