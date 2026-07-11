"use client"
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Trash2, Plus, Check, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from '@/components/ui/use-toast'
import { getProductsAction } from '@/app/actions/products'
import { getClientsAction } from '@/app/actions/clients'
import { createOrder } from '@/app/actions/orders'

interface Product {
  id: string
  name: string
  slug: string
  price: number
  stock: number
}

interface Client {
  id: string
  name: string
  email: string
}

interface OrderItem {
  id: string
  productId: string
  productName: string
  productSlug: string
  quantity: number
  unitPrice: number
  subtotal: number
}

interface OrderCreateFormProps {
  onSubmit?: (items: OrderItem[]) => Promise<void>
}

export function OrderCreateForm({ onSubmit }: OrderCreateFormProps) {
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [orderItems, setOrderItems] = useState<OrderItem[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleCreateOrder = async (items: any[]) => {
    try {
    
      if (!selectedClient) {
        throw new Error("No se ha seleccionado un cliente")
      }

      const res = await createOrder(selectedClient?.id, items)
      console.log("🚀 ~ handleCreateOrder ~ res:", res)


      if (res.status !== 201) {
        throw new Error("Error al crear el pedido")
      }

      toast({
        title: "Pedido creado",
        description: `El pedido ${res.data.orderNumber ?? ""} fue creado correctamente.`,
      })

      setOrderItems([])
    } catch (error: any) {
      console.error("Error creando pedido:", error)
      toast({
        title: "Error",
        description: error.message || "No se pudo crear el pedido.",
      })
      throw error
    }
  }

  const addOrderItem = () => {
    const newItem: OrderItem = {
      id: `temp-${Date.now()}`,
      productId: '',
      productName: '',
      productSlug: '',
      quantity: 1,
      unitPrice: 0,
      subtotal: 0,
    }
    setOrderItems([...orderItems, newItem])
  }

  const removeOrderItem = (id: string) => {
    setOrderItems(orderItems.filter(item => item.id !== id))
  }

  const updateOrderItem = (id: string, field: keyof OrderItem, value: any) => {
    setOrderItems(orderItems.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value }
        if (field === 'quantity') {
          updated.subtotal = updated.quantity * updated.unitPrice
        }
        return updated
      }
      return item
    }))
  }

  const selectProduct = (itemId: string, product: Product) => {
    setOrderItems(orderItems.map(item => {
      if (item.id === itemId) {
        return {
          ...item,
          productId: product.id,
          productName: product.name,
          productSlug: product.slug,
          unitPrice: product.price,
          subtotal: item.quantity * product.price,
        }
      }
      return item
    }))
  }

  const calculateTotal = () => {
    return orderItems.reduce((sum, item) => sum + item.subtotal, 0)
  }

  const handleSubmit = async () => {
    if (!selectedClient) {
      toast({
        title: "Cliente requerido",
        description: "Por favor seleccioná un cliente antes de crear el pedido.",
      })
      return
    }

    const validItems = orderItems.filter(item => item.productId && item.quantity > 0)
    
    if (validItems.length === 0) {
      toast({
        title: "Productos requeridos",
        description: "Agregá al menos un producto al pedido.",
      })
      return
    }

    setIsSubmitting(true)
    try {
      await handleCreateOrder(validItems)
    } catch (error) {
      console.error('Error creando pedido:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="w-full m-4">
      <CardHeader className="pb-3">
        <CardTitle className="text-xl">Crear nuevo pedido</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Selector de cliente */}
        <ClientSelector
          selectedClient={selectedClient}
          onSelectClient={setSelectedClient}
        />

        {/* Items del pedido */}
        <div className="space-y-2">
          {orderItems.map((item, index) => (
            <OrderItemRow
              key={item.id}
              item={item}
              index={index}
              onUpdate={updateOrderItem}
              onRemove={removeOrderItem}
              onSelectProduct={selectProduct}
            />
          ))}
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={addOrderItem}
          className="w-full h-9"
          size="sm"
        >
          <Plus className="w-4 h-4 mr-2" />
          Agregar producto
        </Button>

        {orderItems.length > 0 && (
          <div className="pt-3 border-t space-y-2">
            <div className="flex justify-between items-center text-base font-semibold">
              <span>Total:</span>
              <span>${calculateTotal().toFixed(2)}</span>
            </div>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !selectedClient}
              className="w-full h-9"
              size="sm"
            >
              {isSubmitting ? 'Creando pedido...' : 'Crear pedido'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

interface ClientSelectorProps {
  selectedClient: Client | null
  onSelectClient: (client: Client | null) => void
}

function ClientSelector({ selectedClient, onSelectClient }: ClientSelectorProps) {
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

  return (
    <div className="space-y-1">
      <Label className="text-sm font-medium">Cliente *</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
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

interface OrderItemRowProps {
  item: OrderItem
  index: number
  onUpdate: (id: string, field: keyof OrderItem, value: any) => void
  onRemove: (id: string) => void
  onSelectProduct: (itemId: string, product: Product) => void
}

function OrderItemRow({ item, index, onUpdate, onRemove, onSelectProduct }: OrderItemRowProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [openSlug, setOpenSlug] = useState(false)
  const [openName, setOpenName] = useState(false)

  const searchProducts = async (query: string, searchBy: 'slug' | 'name') => {
    if (!query || query.length < 2) {
      setProducts([])
      return
    }

    setIsLoading(true)
    try {
      const response = await getProductsAction({
        page: 0,
        pageSize: 10,
        sortBy: 'name',
        sortOrder: 'asc',
        filters: {
          slug: searchBy === 'slug' ? query : '',
          name: searchBy === 'name' ? query : '',
        },
      })
      setProducts(response.products)
    } catch (error) {
      console.error('Error buscando productos:', error)
      setProducts([])
    } finally {
      setIsLoading(false)
    }
  }

  return (
<div className="flex flex-wrap md:grid md:grid-cols-[1.5fr_2fr_1fr_1fr_1fr_1fr_auto] gap-2 p-2 border  rounded-md bg-muted/20 items-end">

{/* Código */}
<div>
  <Label className="text-xs text-muted-foreground">Código</Label>
  <Popover open={openSlug} onOpenChange={setOpenSlug}>
    <PopoverTrigger asChild>
      <Button
        variant="outline"
        role="combobox"
        aria-expanded={openSlug}
        className="w-full justify-between h-8 text-xs"
      >
        <span className="truncate">{item.productSlug || "Código..."}</span>
        <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
      </Button>
    </PopoverTrigger>
    <PopoverContent className="w-[280px] p-0">
      <Command>
        <CommandInput
          placeholder="Buscar por código..."
          onValueChange={(value) => searchProducts(value, "slug")}
        />
        <CommandList>
          <CommandEmpty>{isLoading ? "Buscando..." : "No hay productos."}</CommandEmpty>
          <CommandGroup>
            {products.map((product) => (
              <CommandItem
                key={product.id}
                value={product.slug}
                onSelect={() => {
                  onSelectProduct(item.id, product);
                  setOpenSlug(false);
                }}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    item.productId === product.id ? "opacity-100" : "opacity-0"
                  )}
                />
                <div className="flex flex-col">
                  <span className="font-medium text-sm">{product.slug}</span>
                  <span className="text-xs text-muted-foreground">{product.name}</span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </Command>
    </PopoverContent>
  </Popover>
</div>

{/* Nombre */}
<div>
  <Label className="text-xs text-muted-foreground">Nombre</Label>
  <Popover open={openName} onOpenChange={setOpenName}>
    <PopoverTrigger asChild>
      <Button
        variant="outline"
        role="combobox"
        aria-expanded={openName}
        className="w-full justify-between h-8 text-xs"
      >
        <span className="truncate">{item.productName || "Nombre..."}</span>
        <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
      </Button>
    </PopoverTrigger>
    <PopoverContent className="w-[320px] p-0">
      <Command>
        <CommandInput
          placeholder="Buscar por nombre..."
          onValueChange={(value) => searchProducts(value, "name")}
        />
        <CommandList>
          <CommandEmpty>{isLoading ? "Buscando..." : "No hay productos."}</CommandEmpty>
          <CommandGroup>
            {products.map((product) => (
              <CommandItem
                key={product.id}
                value={product.name}
                onSelect={() => {
                  onSelectProduct(item.id, product);
                  setOpenName(false);
                }}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    item.productId === product.id ? "opacity-100" : "opacity-0"
                  )}
                />
                <div className="flex flex-col">
                  <span className="font-medium text-sm">{product.name}</span>
                  <span className="text-xs text-muted-foreground">{product.slug}</span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </Command>
    </PopoverContent>
  </Popover>
</div>

{/* Precio */}
<div>
  <Label className="text-xs text-muted-foreground">Precio</Label>
  <Input
    type="number"
    value={item.unitPrice.toFixed(2)}
    disabled
    className="bg-muted h-8 text-xs"
  />
</div>

{/* Cantidad */}
<div>
  <Label className="text-xs text-muted-foreground">Cantidad</Label>
  <Input
    type="number"
    min="1"
    value={item.quantity}
    onChange={(e) =>
      onUpdate(item.id, "quantity", parseInt(e.target.value) || 1)
    }
    className="h-8 text-xs"
  />
</div>

{/* Subtotal */}
<div>
  <Label className="text-xs text-muted-foreground">Subtotal</Label>
  <div className="h-8 px-2 py-1 bg-muted rounded-md flex items-center font-medium text-xs">
    ${item.subtotal.toFixed(2)}
  </div>
</div>

{/* Stock */}
<div>
  <Label className="text-xs text-muted-foreground">Stock</Label>
  <Input type="number" value="0" disabled className="h-8 text-xs" />
</div>

{/* Eliminar */}
<div className="flex justify-end items-end h-full">
  <Button
    type="button"
    variant="ghost"
    size="default"
    onClick={() => onRemove(item.id)}
    className="text-destructive border border-destructive hover:text-white hover:bg-destructive "
  >
    Eliminar
    <Trash2 className="h-3.5 w-3.5 ml-1" />
  </Button>
</div>
</div>

  )
}
