import { getOrderById } from '@/app/actions/orders'
import { InvoiceUpdateForm } from '@/components/features/invoices/id/update'
import { XCircle } from 'lucide-react'
import React from 'react'

export default async function Page({ params }: { params: { id: string } }) {
  const order = await getOrderById(params.id)
  return order.data ? (
    <div className="no-scrollbar h-full w-full overflow-y-auto px-1 pt-12 sm:px-4">
      <InvoiceUpdateForm initialInvoice={order.data} />
    </div>
  ) : (
    <div className="pt-24 text-center">
      <XCircle className="mx-auto mb-4 h-16 w-16 text-destructive" />
      <h2 className="mb-2 text-2xl font-bold">Factura no encontrada</h2>
      <p className="text-muted-foreground">La factura solicitada no existe.</p>
    </div>
  )
}
