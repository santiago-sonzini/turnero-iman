"use client";

import { useState } from "react";
import { DataTable } from "@/components/ui/data-table";
import { ColumnFiltersState, SortingState } from "@tanstack/react-table";
import { createColumns } from "./columns";
import { Client } from "@prisma/client";

interface ClientsTableProps {
  data: {
    clients: Client[];
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
  onEditClient?: (client: Client) => void;
  onDeleteClient?: (client: Client) => void;
}

export function ClientsTable({
  data,
  loading,
  handlePaginationChange,
  handleSortingChange,
  handleFilterChange,
  onEditClient,
  onDeleteClient,
}: ClientsTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [filters, setFilters] = useState<ColumnFiltersState>([]);

  const tableColumns = createColumns({
    onEdit: onEditClient,
    onDelete: onDeleteClient,
  });

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
      data={data?.clients ?? []}
      searchKey="name"
      serverSide
      onPaginationChange={handlePaginationChange}
      onSortingChange={handleClientSortingChange}
      onFilterChange={handleClientFilterChange}
      
      pagination={{
        pageIndex: data?.pagination.page ?? 0,
        pageSize: data?.pagination.pageSize ?? 10,
        pageCount: data?.pagination.totalPages ?? 0,
      }}
    />
  );
}
