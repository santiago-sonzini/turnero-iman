"use client";

import { useState } from "react";
import { ChevronsUpDown, Check, UserPlus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

import { cn } from "@/lib/utils";
import { Client, PaymentStatus } from "@prisma/client";
import { createClient, getClientsAction } from "@/app/actions/clients";
import { toast } from "@/components/ui/use-toast";
import { LoadingSpinner } from "@/components/ui/loading";
interface ClientSelectorProps {
  iva: boolean;
  setIva: (iva: boolean) => void;
  discount: number;
  setDiscount: (discount: number) => void;
  paymentStatus: PaymentStatus;
  setPaymentStatus: (paymentStatus: PaymentStatus) => void;
  selectedClient: Client | null;
  onSelectClient: (client: Client | null) => void;
  showCreateForm: boolean;
  onToggleCreateForm: () => void;
}



function ClientSelectorAccordion({
  iva,
  setIva,
  discount,
  setDiscount,
  paymentStatus,
  setPaymentStatus,
  selectedClient,
  onSelectClient,
  showCreateForm,
  onToggleCreateForm,
}: ClientSelectorProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [open, setOpen] = useState(false);

  // crear cliente
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const searchClients = async (query: string) => {
    if (!query || query.length < 2) {
      setClients([]);
      return;
    }

    setIsLoading(true);
    try {
      const response = await getClientsAction({
        page: 0,
        pageSize: 10,
        sortBy: "name",
        sortOrder: "asc",
        filters: { name: query, phone: "" },
      });

      setClients(response.clients);
    } catch (error) {
      console.error("Error buscando clientes:", error);
      setClients([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateClient = async () => {
    if (!newName.trim()) {
      toast({
        title: "Nombre requerido",
        description: "Ingresá un nombre para el cliente.",
      });
      return;
    }

    setIsCreating(true);

    try {
      const res = await createClient({
        name: newName.trim(),
        email: newEmail.trim() || undefined,
        phone: newPhone.trim() || undefined,
        discount: discount,
      });

      if (res.status === 200 && res.data) {
        onSelectClient(res.data);

        setNewName("");
        setNewEmail("");
        setNewPhone("");

        toast({
          title: "Cliente creado",
          description: `${res.data.name} fue creado y seleccionado.`,
        });
      } else {
        toast({
          title: "Error",
          description: res.message || "No se pudo crear el cliente.",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo crear el cliente.",
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Accordion type="single" collapsible defaultValue="client" className="w-full">
      <AccordionItem value="client" className="rounded-md border px-3">
        <AccordionTrigger className="py-2 hover:no-underline">
          <div className="flex w-full items-center justify-between pr-2">
            <div className="flex items-center gap-2 text-sm font-medium">

              {selectedClient && (
                <span className="truncate font-normal text-muted-foreground">
                  {selectedClient.name}
                </span>
              )}

              {!selectedClient && <span className="text-destructive">Cliente *</span>}
            </div>

            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onToggleCreateForm();
              }}
              className="inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium text-foreground transition-colors hover:bg-muted"
            >
              {showCreateForm ? (
                <>
                  <X className="h-3.5 w-3.5" />
                  Cancelar
                </>
              ) : (
                <>
                  <UserPlus className="h-3.5 w-3.5" />
                  Nuevo cliente
                </>
              )}
            </span>
          </div>
        </AccordionTrigger>

        <AccordionContent className="pt-2">
          <div className="w-full space-y-1">
            {showCreateForm ? (
              <div className="space-y-2 rounded-md border bg-muted/20 p-3">
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      Nombre *
                    </Label>
                    <Input
                      className="h-8 text-xs"
                      placeholder="Juan García"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                    />
                  </div>

                  <div>
                    <Label className="text-xs text-muted-foreground">
                      Email
                    </Label>
                    <Input
                      className="h-8 text-xs"
                      placeholder="juan@mail.com"
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                    />
                  </div>

                  <div>
                    <Label className="text-xs text-muted-foreground">
                      Teléfono
                    </Label>
                    <Input
                      className="h-8 text-xs"
                      placeholder="3512345678"
                      value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value)}
                    />
                  </div>
                </div>

                <Button
                  type="button"
                  size="sm"
                  className="h-8 w-full text-xs"
                  disabled={isCreating || !newName.trim()}
                  onClick={handleCreateClient}
                >
                  {isCreating ? <LoadingSpinner /> : "Crear cliente"}
                </Button>
              </div>
            ) : (
              <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="h-9 w-full justify-between text-sm"
                  >
                    {selectedClient ? (
                      <span className="truncate">
                        {selectedClient.name}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">
                        Seleccionar cliente...
                      </span>
                    )}

                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>

                <PopoverContent className="w-[400px] p-0">
                  <Command>
                    <CommandInput
                      placeholder="Buscar por nombre o correo..."
                      onValueChange={searchClients}
                    />

                    <CommandList>
                      <CommandEmpty>
                        {isLoading
                          ? "Buscando..."
                          : "No se encontraron clientes."}
                      </CommandEmpty>

                      <CommandGroup>
                        {clients.map((client) => (
                          <CommandItem
                            key={client.id}
                            value={client.name}
                            onSelect={() => {
                              onSelectClient(client);
                              setOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedClient?.id === client.id
                                  ? "opacity-100"
                                  : "opacity-0"
                              )}
                            />

                            <div className="flex flex-col">
                              <span className="text-sm font-medium">
                                {client.name}
                              </span>

                              <span className="text-xs text-muted-foreground">
                                {client.email}
                              </span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            )}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <div className="flex flex-col pt-2">
                <Label className="text-xs text-muted-foreground">IVA</Label>

                <Select
                  value={iva ? "true" : "false"}
                  onValueChange={(e) => setIva(e === "true")}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="IVA" />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="true">Sí</SelectItem>
                    <SelectItem value="false">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">
                  Descuento
                </Label>

                <Input
  type="number"
  min={0}
  max={100}
  value={discount === 0 ? "" : discount}
  onChange={(e) => {
    const value = e.target.value;

    if (value === "") {
      setDiscount(0);
      return;
    }

    setDiscount(parseInt(value));
  }}
  placeholder="Descuento"
  className="w-full"
/>
              </div>

              <div>
                <Label className="w-full text-xs text-muted-foreground">
                  Pago
                </Label>

                <Select
                  value={paymentStatus}
                  onValueChange={(e) =>
                    setPaymentStatus(e as PaymentStatus)
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Pago" />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value={PaymentStatus.PAID}>
                      Pago
                    </SelectItem>

                    <SelectItem value={PaymentStatus.PENDING}>
                      No pago
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

export default ClientSelectorAccordion;