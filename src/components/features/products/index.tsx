"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { ProductForm } from "./product-form";
import { ProductTable } from "./product-table";
import { Product } from "@prisma/client";
import { getProductsAction } from "@/app/actions/products"; // tu Server Action
import Link from "next/link";

export default function ProductPage() {
  const { toast } = useToast();

  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const [data, setData] = useState<any>({ products: [], pagination: { page: 0, pageSize: 10, totalPages: 0 } });
  const [isLoading, setIsLoading] = useState(false);

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [sortBy, setSortBy] = useState<string | undefined>();
  const [sortOrder, setSortOrder] = useState<"asc" | "desc" | undefined>();
  const [filters, setFilters] = useState({
    name: "",
    category: "",
  });
  // 🕒 Nuevo estado para debounce
  const [debouncedFilters, setDebouncedFilters] = useState(filters);
  const [refreshKey, setRefreshKey] = useState(0);

  // 🧠 Aplica debounce de 500ms
  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedFilters(filters);
    }, 750); // cambia el delay si querés hacerlo más o menos sensible

    return () => clearTimeout(timeout);
  }, [filters]);

  useEffect(() => {
    setIsLoading(true);
    const loadProducts = async () => {
      try {
        const res = await getProductsAction({
          page,
          pageSize,
          sortBy,
          sortOrder,
          filters: debouncedFilters,
        });
        console.log("🚀 ~ loadProducts ~ res:", res);
        setData(res);
      } catch (error) {
        toast({
          title: "Error",
          description: "No se pudieron cargar los productos.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadProducts();
  }, [page, pageSize, sortBy, sortOrder, debouncedFilters, toast, refreshKey]);
  // 📑 Paginación
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
    const categoryFilter = updatedFilters.find((f) => f.id === "category");
    const statusFilter = updatedFilters.find((f) => f.id === "status");

    setFilters({
      name: nameFilter?.value || "",
      category: categoryFilter?.value || "",
    });
    setPage(0);
  };

  // ✏️ Editar
  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setIsAddProductOpen(true);
  };

  // ❌ Eliminar
  const handleDeleteProduct = (product: Product) => {
    toast({
      title: "Producto eliminado",
      description: `${product.name} fue eliminado correctamente.`,
    });
    setRefreshKey((prev) => prev + 1);
  };

  useEffect(() => {
    if (!setIsAddProductOpen) {
      setEditingProduct(null);
    }
  }, [setIsAddProductOpen]);

  return (
    <div className="space-y-6 p-8 mt-10 h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Productos</h1>
          <p className="text-sm text-gray-500">
            Administra el inventario de tus productos con filtros y
            ordenamientos avanzados.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/products" className="block">
            <Button variant="outline">
              Ver lista
            </Button>
          </Link>
          <Button
            onClick={() => {
              setEditingProduct(null);
              setIsAddProductOpen(true);
            }}
          >
            Agregar producto
          </Button>
        </div>
      </div>

      <div className="h-[80vh] overflow-y-scroll">
        {/* Tabla */}
        <ProductTable
          loading={isLoading}
          data={data}
          handlePaginationChange={handlePaginationChange}
          handleSortingChange={handleSortingChange}
          handleFilterChange={handleFilterChange}
          onEditProduct={handleEditProduct}
          onDeleteProduct={handleDeleteProduct}
        />
      </div>

      {/* Formulario */}
      <ProductForm

        open={isAddProductOpen}
        onOpenChange={setIsAddProductOpen}
        initialData={undefined}

        onSuccess={(product: Product) => {
          toast({
            title: editingProduct
              ? "Producto actualizado"
              : "Producto agregado",
            description: `${product.name} fue ${editingProduct ? "actualizado" : "agregado"
              } correctamente.`,
          });
          setRefreshKey((prev) => prev + 1);
        }}
      />
    </div>
  );
}
