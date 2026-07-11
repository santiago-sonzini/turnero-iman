import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, CreditCard } from "lucide-react";
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
import { formatARS } from "@/lib/format";

interface OrderActionsProps {
  onDelete?: (order: Order) => void;
  onQuickPay?: (order: Order) => void;
}

export const createColumns = ({
  onDelete,
  onQuickPay,
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
  // {
  //   accessorKey: "id",
  //   header: ({ column }) => (
  //     <DataTableColumnHeader column={column} title="Id" />
  //   ),
  //   cell: ({ row }) => <div>
  //     <Link target="_blank" href={`/dashboard/orders/${row.getValue("id")}`} className="font-medium hover:underline">{row.getValue("id")}</Link>
  //     </div>,
    
  // },
  {
    accessorKey: "id",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="N° de pedido" />
    ),
    cell: ({ row }) => <div>
      <Link target="_blank" href={`/dashboard/orders/${row.getValue("id")}`} className="font-medium hover:underline">{row.getValue("id")}</Link>
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
      return <div>{formatARS(total)}</div>;
    },
  },
  {
    accessorKey: "percentageofPayment",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Porcentaje pagado" />
    ),
    cell: ({ row }) => {
      const percentage = Number(row.getValue("percentageofPayment") ?? 0);

      return (
        <div className="flex items-center gap-3 w-full">
          {/* Número visible */}
          <span className="text-sm font-medium w-12 text-right">
            {parseFloat(percentage.toFixed(2))}%
          </span>
  
          {/* Barra estética */}
          <div className="flex-1">
            <div className="relative h-3 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        </div>
      );
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
    id: "actions",
    cell: ({ row }) => {
      const order = row.original;
      const isPaid = (order.percentageofPayment || 0) >= 100;

      return (
        <div className="flex items-center justify-end gap-1">
          {onQuickPay && !isPaid && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 border-green-600/50 text-green-700 hover:bg-green-600 hover:text-white dark:text-green-400"
              onClick={() => onQuickPay(order)}
            >
              <CreditCard className="mr-1.5 h-3.5 w-3.5" />
              Pagar
            </Button>
          )}
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
              <DropdownMenuItem asChild>
                <Link href={`/dashboard/orders/${order.id}`} target="_blank">
                  Ver detalle
                </Link>
              </DropdownMenuItem>
              {onQuickPay && !isPaid && (
                <DropdownMenuItem onClick={() => onQuickPay(order)}>
                  Marcar como pagado
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete?.(order)}
                className="text-destructive"
              >
                Eliminar pedido
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    },
  },
];

export const columns = createColumns();
