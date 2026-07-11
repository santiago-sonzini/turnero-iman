import { getClientsAction } from "@/app/actions/clients"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { Client } from "@prisma/client"
import { Check, ChevronsUpDown } from "lucide-react"
import { useEffect, useState } from "react"

interface ClientSelectorProps {
    selectedClient: Client | null
    onSelectClient: (client: Client | null) => void
    disabled?: boolean
  }
  
export function ClientSelector({ selectedClient, onSelectClient, disabled }: ClientSelectorProps) {
    const [clients, setClients] = useState<Client[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [open, setOpen] = useState(false)
  
    const searchClients = async (query: string) => {
      if (!query || query.length < 2) {
        setClients([])
        return
      }
      
      setIsLoading(true)
      try {
        const response = await getClientsAction({
          page: 0,
          pageSize: 10,
          sortBy: 'name',
          sortOrder: 'asc',
          filters: {
            name: query,
            phone: '',
          },
        })
        setClients(response.clients)
      } catch (error) {
        console.error('Error buscando clientes:', error)
        setClients([])
      } finally {
        setIsLoading(false)
      }
    }

    useEffect(() => {
      if (selectedClient) {
        onSelectClient(selectedClient)
      }
    }, [])
  
    return (
      <div className="space-y-1">
        <Label className="text-sm font-medium">Cliente *</Label>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              disabled={disabled}
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-full justify-between h-9 text-sm"
            >
              {selectedClient ? (
                <span className="truncate">{selectedClient.name}</span>
              ) : (
                <span className="text-muted-foreground">Seleccionar cliente...</span>
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
                  {isLoading ? 'Buscando...' : 'No se encontraron clientes.'}
                </CommandEmpty>
                <CommandGroup>
                  {clients.map((client) => (
                    <CommandItem
                      key={client.id}
                      value={client.name}
                      onSelect={() => {
                        onSelectClient(client)
                        setOpen(false)
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selectedClient?.id === client.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div className="flex flex-col">
                        <span className="font-medium text-sm">{client.name}</span>
                        <span className="text-xs text-muted-foreground">{client.email}</span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
    )
  }