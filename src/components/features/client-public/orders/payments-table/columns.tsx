// Columnas de pagos para la página PÚBLICA del cliente: solo lectura,
// sin links al dashboard ni acciones de edición/borrado.
import { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";
import { Payment } from "@prisma/client";
import { formatARS } from "@/lib/format";

const METODO_LABEL: Record<string, string> = {
  cash: "Efectivo",
  efectivo: "Efectivo",
  transferencia: "Transferencia",
  tarjeta: "Tarjeta",
  otro: "Otro",
};

export const paymentColumns: ColumnDef<Payment>[] = [
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
  {
    accessorKey: "paymentMethod",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Método" />
    ),
    cell: ({ row }) => {
      const method = row.getValue("paymentMethod") as string;
      return <div>{METODO_LABEL[method] ?? method}</div>;
    },
  },
  {
    accessorKey: "amount",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Monto" />
    ),
    cell: ({ row }) => {
      const amount = Number(row.getValue("amount"));
      return (
        <div className="font-medium tabular-nums">{formatARS(amount)}</div>
      );
    },
  },
];
