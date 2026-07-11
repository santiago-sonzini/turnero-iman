"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { ClientForm } from "./client-form";
import { ClientsTable } from "./clients-table";
import { Client } from "@prisma/client";
import { deleteClient, getClientsAction } from "@/app/actions/clients";

export default function ClientPage() {
  const { toast } = useToast();

  const [isAddClientOpen, setIsAddClientOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  const [data, setData] = useState<any>({
    clients: [],
    pagination: { page: 0, pageSize: 10, totalPages: 0 },
  });

  const [isLoading, setIsLoading] = useState(false);

  // 🔢 Paginación
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  // ↕️ Sorting
  const [sortBy, setSortBy] = useState<string | undefined>();
  const [sortOrder, setSortOrder] = useState<"asc" | "desc" | undefined>();

  // 🔎 Filtros
  const [filters, setFilters] = useState({
    name: "",
    phone: "",
  });

  // ⏳ Debounce para filtros
  const [debouncedFilters, setDebouncedFilters] = useState(filters);
  const [refreshKey, setRefreshKey] = useState(0);
  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedFilters(filters);
    }, 750);

    return () => clearTimeout(timeout);
  }, [filters]);

  // 🔄 Cargar clientes cuando cambien los parámetros
  useEffect(() => {
    setIsLoading(true);

    const loadClients = async () => {
      try {
        const res = await getClientsAction({
          page,
          pageSize,
          sortBy,
          sortOrder,
          filters: debouncedFilters,
        });

        console.log("🚀 ~ loadClients ~ res:", res);

        setData(res);
      } catch (error) {
        toast({
          title: "Error",
          description: "No se pudieron cargar los clientes.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadClients();
  }, [page, pageSize, sortBy, sortOrder, debouncedFilters, refreshKey]);

  // 📄 Paginación
  const handlePaginationChange = (newPage: number, newPageSize: number) => {
    setPage(newPage);
    setPageSize(newPageSize);
  };

  // ↕️ Ordenamiento
  const handleSortingChange = (updatedSorting: any[]) => {
    if (updatedSorting.length > 0) {
      setSortBy(updatedSorting[0].id);
      setSortOrder(updatedSorting[0].desc ? "desc" : "asc");
    } else {
      setSortBy(undefined);
      setSortOrder(undefined);
    }
  };

  // 🔍 Filtros
  const handleFilterChange = (updatedFilters: any[]) => {
    const nameFilter = updatedFilters.find((f) => f.id === "name");
    const phoneFilter = updatedFilters.find((f) => f.id === "phone");

    setFilters({
      name: nameFilter?.value || "",
      phone: phoneFilter?.value || "",
    });

    setPage(0); // reset page cuando filtrás
  };

  // ✏️ Editar
  const handleEditClient = (client: Client) => {
    console.log("🚀 ~ handleEditClient ~ client:", client)
    
    setEditingClient(client);
    setIsAddClientOpen(true);
  };

  // ❌ Eliminar — lo dejás igual o lo adaptás
  const handleDeleteClient = async (client: Client) => {
    try {
      const res = await deleteClient(client.id);
      if (!(res.status === 200)) throw new Error("Error al eliminar cliente");

      toast({
        title: "Cliente eliminado",
        description: `${client.name} fue eliminado correctamente.`,
      });

      // Recargar tabla
      setPage(0);
      setRefreshKey((prev) => prev + 1); // 🔥 fuerza recarga SIEMPRE

    } catch (err) {
      toast({
        title: "Error",
        description: "No se pudo eliminar el cliente.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6 p-8 h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Clientes</h1>
          <p className="text-sm text-gray-500">
            Administra tus clientes con filtros y ordenamientos avanzados.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingClient(null);
            setIsAddClientOpen(true);
          }}
        >
          Agregar cliente
        </Button>
      </div>

      <div className="h-[80vh] overflow-y-scroll">
        {/* Tabla */}
        <ClientsTable
          loading={isLoading}
          data={data}
          handlePaginationChange={handlePaginationChange}
          handleSortingChange={handleSortingChange}
          handleFilterChange={handleFilterChange}
          onEditClient={handleEditClient}
          onDeleteClient={handleDeleteClient}
        />
      </div>

      {/* Formulario */}
      <ClientForm
        open={isAddClientOpen}
        onOpenChange={setIsAddClientOpen}
        initialData={editingClient || undefined}
        onSuccess={(client: Client) => {
          toast({
            title: editingClient ? "Cliente actualizado" : "Cliente agregado",
            description: `${client.name} fue ${
              editingClient ? "actualizado" : "agregado"
            } correctamente.`,
          });
          setRefreshKey((prev) => prev + 1); // 🔥 fuerza recarga SIEMPRE
          setPage(0); // recargar tabla
        }}
      />
    </div>
  );
}
