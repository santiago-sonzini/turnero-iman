import React, { useState, useEffect } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { searchOrders } from '@/app/actions/orders';
import { formatARS } from '@/lib/format';
import type { Client, Order } from '@prisma/client';

const formatDate = (date: Date) => {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear()).slice(-2);
  return `${day}/${month}/${year}`;
};

// Solo interesan las órdenes con saldo pendiente; el saldo se deriva del % pagado.
const soloPendientes = (orders: Order[]) =>
  orders.filter((o) => (o.percentageofPayment ?? 0) < 100);

const saldoDe = (o: Order) =>
  Number(o.total) * (1 - (o.percentageofPayment ?? 0) / 100);

interface Props {
  selectedOrders: Order[];
  setSelectedOrders: React.Dispatch<React.SetStateAction<Order[]>>;
  client: Client;
}

export default function OrderMultiCombobox({ selectedOrders, setSelectedOrders, client }: Props) {
  const [open, setOpen] = useState<boolean>(false);
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Carga inicial: todas las órdenes pendientes del cliente (query vacía = todas).
  useEffect(() => {
    searchOrders('', client.id).then((res) => {
      if (res?.success) setAllOrders(soloPendientes((res.data as Order[]) ?? []));
    });
  }, [client.id]);

  useEffect(() => {
    async function fetchOrders() {
      if (!searchQuery.trim()) {
        setFilteredOrders(allOrders);
        return;
      }

      const query = searchQuery.toLowerCase().trim();
      const res = await searchOrders(query, client.id);
      if (!res) return;

      const fetched = soloPendientes((res.data as Order[]) ?? []);

      if (fetched.length === 0) {
        setFilteredOrders([]);
        return;
      }

      setFilteredOrders(
        fetched.filter((order) => {
          const orderNumber = order.orderNumber.toLowerCase();
          const dateFormatted = formatDate(order.createdAt);
          return orderNumber.includes(query) || dateFormatted.includes(query);
        })
      );
    }

    fetchOrders();
  }, [searchQuery, allOrders, client]);



  const toggleOrder = (order: Order) => {
    setSelectedOrders((prev: Order[]) => {
      const isSelected = prev.some((o) => o.id === order.id);
      return isSelected ? prev.filter((o) => o.id !== order.id) : [...prev, order];
    });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between h-9"
        >
          <span className="truncate text-sm">
            {selectedOrders.length === 0
              ? 'Seleccionar pedidos...'
              : `${selectedOrders.length} pedido${selectedOrders.length !== 1 ? 's' : ''} seleccionado${
                  selectedOrders.length !== 1 ? 's' : ''
                }`}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="w-full p-0"
        align="start"
        style={{ width: 'var(--radix-popover-trigger-width)' }}
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Buscar por número o fecha..."
            value={searchQuery}
            onValueChange={setSearchQuery}
          />

          <CommandEmpty>No se encontraron pedidos.</CommandEmpty>

          <CommandGroup className="max-h-[300px] overflow-auto">
            {filteredOrders.map((order) => {
              const isSelected = selectedOrders.some((o) => o.id === order.id);
              return (
                <CommandItem
                  key={order.id}
                  value={order.id}
                  onSelect={() => toggleOrder(order)}
                  className="flex items-center justify-between py-2"
                >
                  <div className="flex items-center gap-2 flex-1">
                    <Check className={`h-4 w-4 ${isSelected ? 'opacity-100' : 'opacity-0'}`} />
                    <div className="flex flex-col gap-0.5 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{order.orderNumber}</span>
                        <Badge
                          variant={
                            order.status === 'COMPLETED'
                              ? 'default'
                              : order.status === 'PENDING'
                              ? 'secondary'
                              : 'destructive'
                          }
                          className="text-xs h-5"
                        >
                          {order.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span>{formatDate(order.createdAt)}</span>
                        <span>·</span>
                        <span className="font-medium">
                          saldo {formatARS(saldoDe(order))}
                        </span>
                      </div>
                    </div>
                  </div>
                </CommandItem>
              );
            })}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}