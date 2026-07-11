// Columnas de pedidos para la página PÚBLICA del cliente: solo lectura,
// sin acciones ni links al dashboard, con etiquetas en español.
import { ColumnDef } from "@tanstack/react-table";
import { Order } from "@prisma/client";
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";
import { formatARS } from "@/lib/format";

const ESTADO: Record<string, { label: string; className: string }> = {
  PENDING: { label: "Pendiente", className: "text-yellow-600" },
  PROCESSING: { label: "En proceso", className: "text-blue-600" },
  COMPLETED: { label: "Completado", className: "text-green-600" },
  CANCELLED: { label: "Cancelado", className: "text-red-600" },
  REFUNDED: { label: "Reembolsado", className: "text-gray-600" },
};

const ESTADO_PAGO: Record<string, { label: string; className: string }> = {
  PENDING: { label: "Pendiente", className: "text-yellow-600" },
  PAID: { label: "Pagado", className: "text-green-600" },
  FAILED: { label: "Falló", className: "text-red-600" },
  REFUNDED: { label: "Reembolsado", className: "text-gray-600" },
};

export const columns: ColumnDef<Order>[] = [
  {
    accessorKey: "orderNumber",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="N° de pedido" />
    ),
    cell: ({ row }) => (
      <div className="font-medium">{row.getValue("orderNumber")}</div>
    ),
  },
  {
    accessorKey: "status",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Estado" />
    ),
    cell: ({ row }) => {
      const status = row.getValue("status") as string;
      const info = ESTADO[status] ?? { label: status, className: "text-gray-700" };
      return <div className={`font-semibold ${info.className}`}>{info.label}</div>;
    },
  },
  {
    accessorKey: "total",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Total" />
    ),
    cell: ({ row }) => {
      const total = Number(row.getValue("total"));
      return <div className="tabular-nums">{formatARS(total)}</div>;
    },
  },
  {
    accessorKey: "percentageofPayment",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Pagado" />
    ),
    cell: ({ row }) => {
      const percentage = Number(row.getValue("percentageofPayment") ?? 0);

      return (
        <div className="flex w-full items-center gap-3">
          <span className="w-12 text-right text-sm font-medium">
            {parseFloat(percentage.toFixed(2))}%
          </span>
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
      const info = ESTADO_PAGO[paymentStatus] ?? {
        label: paymentStatus,
        className: "text-gray-700",
      };
      return <div className={`font-semibold ${info.className}`}>{info.label}</div>;
    },
  },
  {
    accessorKey: "createdAt",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Fecha" />
    ),
    cell: ({ row }) => {
      const date = new Date(row.getValue("createdAt"));
      return <div>{date.toLocaleDateString()}</div>;
    },
  },
];
