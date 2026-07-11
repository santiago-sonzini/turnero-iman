import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal } from "lucide-react";
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
import { Order } from "@prisma/client";
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";
import Link from "next/link";

interface OrderActionsProps {
  onEdit?: (order: Order) => void;
  onDelete?: (order: Order) => void;
}

export const createColumns = ({
  onEdit,
  onDelete,
}: OrderActionsProps = {}): ColumnDef<Order>[] => [
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
    accessorKey: "orderNumber",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="N° de pedido" />
    ),
    cell: ({ row }) => <div>
      <Link target="_blank" href={`/dashboard/orders/${row.getValue("id")}`} className="font-medium hover:underline">{row.getValue("orderNumber")}</Link>
    </div>,
  },
  {
    accessorKey: "status",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Estado" />
    ),
    cell: ({ row }) => {
      const status = row.getValue("status") as string;
      const color =
        status === "PENDING"
          ? "text-yellow-600"
          : status === "COMPLETED"
          ? "text-green-600"
          : status === "CANCELLED"
          ? "text-red-600"
          : "text-gray-700";

      return <div className={`font-semibold ${color}`}>{status}</div>;
    },
  },
  {
    accessorKey: "total",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Total" />
    ),
    cell: ({ row }) => {
      const total = Number(row.getValue("total"));
      return <div>${total.toFixed(2)}</div>;
    },
  },
  {
    accessorKey: "percentageofPayment",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Porcentaje pagado" />
    ),
    cell: ({ row }) => {
      const percentage: number = row.getValue("percentageofPayment");
      return <div>{percentage}%</div>;
    },
  },
  {
    accessorKey: "paymentStatus",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Estado de pago" />
    ),
    cell: ({ row }) => {
      const paymentStatus = row.getValue("paymentStatus") as string;
      const color =
        paymentStatus === "PENDING"
          ? "text-yellow-600"
          : paymentStatus === "PAID"
          ? "text-green-600"
          : paymentStatus === "FAILED"
          ? "text-red-600"
          : "text-gray-700";

      return <div className={`font-semibold ${color}`}>{paymentStatus}</div>;
    },
  },
  {
    accessorKey: "createdAt",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Creado el" />
    ),
    cell: ({ row }) => {
      const date = new Date(row.getValue("createdAt"));
      return <div>{date.toLocaleDateString()}</div>;
    },
  },
  {
    accessorKey: "id",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Id" />
    ),
    cell: ({ row }) => <div>
      <Link target="_blank" href={`/dashboard/orders/${row.getValue("id")}`} className="font-medium hover:underline">{row.getValue("id")}</Link>
    </div>,
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const order = row.original;

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
              onClick={() => navigator.clipboard.writeText(order.id)}
            >
              Copiar ID del pedido
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onEdit?.(order)}>
              Editar pedido
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onDelete?.(order)}
              className="text-destructive"
            >
              Eliminar pedido
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];

export const columns = createColumns();
