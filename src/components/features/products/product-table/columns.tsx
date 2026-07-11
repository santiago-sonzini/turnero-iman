import { ColumnDef } from "@tanstack/react-table";
import { ArrowDown, ArrowUp, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Product } from "@prisma/client";
import { ProductModal } from "../product-detail";

interface ProductActionsProps {
  onEdit?: (product: Product) => void;
  onDelete?: (product: Product) => void;
}

export const createColumns = ({
  onEdit,
  onDelete,
}: ProductActionsProps = {}): ColumnDef<Product>[] => [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Seleccionar todo"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Seleccionar fila"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "slug",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Codigo" />
    ),
    cell: ({ row }) => <div>{row.getValue("slug")}</div>,
  },
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Nombre" />
    ),
    cell: ({ row }) =><div>
       <ProductModal product={row.original} />
    </div>,
  },
  {
    accessorKey: "category",
    header: ({ column }) => (
      <DataTableColumnHeader   column={{...column}} title="Categoría" />
    ),
    enableSorting: false,
    cell: ({ row }) => {
      const categoryId = row.getValue("categoryId") as string;
      const category = row.getValue("category") as string;
      console.log("🚀 ~ category:", category)
      if (!category) return null;
  
      // Calcular caracter del medio y longitud
      const middleIndex = Math.floor(category.length / 2);
      const middleChar = category[middleIndex]?.toLowerCase();
      const len = category.length;
  
      // Paleta extendida de colores (más de 10)
      const colorStyles = [
        "bg-red-100 text-red-800",
        "bg-orange-100 text-orange-800",
        "bg-amber-100 text-amber-800",
        "bg-yellow-100 text-yellow-800",
        "bg-lime-100 text-lime-800",
        "bg-green-100 text-green-800",
        "bg-emerald-100 text-emerald-800",
        "bg-teal-100 text-teal-800",
        "bg-cyan-100 text-cyan-800",
        "bg-sky-100 text-sky-800",
        "bg-blue-100 text-blue-800",
        "bg-indigo-100 text-indigo-800",
        "bg-violet-100 text-violet-800",
        "bg-purple-100 text-purple-800",
        "bg-fuchsia-100 text-fuchsia-800",
        "bg-pink-100 text-pink-800",
        "bg-rose-100 text-rose-800",
        "bg-gray-100 text-gray-800",
      ];
  
      // Elegir color de forma determinista
      const code = middleChar?.charCodeAt(0);
      const colorClass = colorStyles[(code ?? 0 + len) % colorStyles.length];
  
      return (
        <Badge
          className={cn(
            "capitalize font-medium border-none shadow-sm",
            colorClass
          )}
        >
          {category}
        </Badge>
      );
    },
  },
  {
    accessorKey: "price",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Precio" />
    ),
    cell: ({ row }) => {
      const price = parseFloat(row.getValue("price"));
      const formatted = new Intl.NumberFormat("es-AR", {
        style: "currency",
        currency: "ARS",
      }).format(price);

      return <div className="text-right font-medium">{formatted}</div>;
    },
  },
  {
    accessorKey: "cost",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Costo" />
    ),
    cell: ({ row }) => {
      const price = parseFloat(row.getValue("cost"));
      const formatted = new Intl.NumberFormat("es-AR", {
        style: "currency",
        currency: "ARS",
      }).format(price);

      return <div className="text-right font-medium">{formatted}</div>;
    },
  },
  {
    accessorKey: "cost",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Ganancia" />
    ),
    cell: ({ row }) => {
      const profit = parseFloat(row.getValue("price")) - parseFloat(row.getValue("cost")) 
      const formatted = new Intl.NumberFormat("es-AR", {
        style: "currency",
        currency: "ARS",
      }).format(profit);

      return <Badge className="text-right font-medium text-white">{formatted}</Badge>;
    },
  },
  {
    accessorKey: "stock",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Stock" />
    ),
    cell: ({ row }) => (
      <div className="text-center">{row.getValue("stock")}</div>
    ),
  },

  {
    accessorKey: "status",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Estado" />
    ),
    cell: ({ row }) => {
      const status = row.getValue("status") as string;

      return (
        <div className="flex justify-center">
          <Badge
            className="text-white"
            variant={
              status === "in_stock"
                ? "default"
                : status === "low_stock"
                  ? "secondary"
                  : "destructive"
            }
          >
            {status === "in_stock"
              ? "En stock"
              : status === "low_stock"
                ? "Stock bajo"
                : "Sin stock"}
          </Badge>
        </div>
      );
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  },

  
  {
    accessorKey: "createdAt",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Fecha de creación" />
    ),
    cell: ({ row }) => {
      const date = new Date(row.getValue("createdAt"));
      return <div>{date.toLocaleDateString()}</div>;
    },
  },
  
  {
    id: "actions",
    cell: ({ row }) => {
      const product = row.original;

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Abrir menú</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Acciones</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => navigator.clipboard.writeText(product.id)}
            >
              Copiar ID del producto
            </DropdownMenuItem>
            
            <DropdownMenuSeparator />
            <DropdownMenuItem>Ver detalles</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onEdit?.(product)}>
              Editar producto
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onDelete?.(product)}
              className="text-destructive"
            >
              Eliminar producto
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
  // {
  //   accessorKey: "id",
  //   header: ({ column }) => (
  //     <DataTableColumnHeader column={column} title="ID del producto" />
  //   ),
  //   cell: ({ row }) => <div className="font-medium">{row.getValue("id")}</div>,
  // },
];

// Export default columns for backward compatibility
export const columns = createColumns();
