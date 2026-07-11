import { getOrderById } from '@/app/actions/orders'
import OrderDetailPage from '@/components/features/orders/id/page'
import { XCircle } from 'lucide-react'
import React from 'react'

export default async function Page  ({ params }: { params: { id: string } })  {
  const order = await getOrderById(params.id)
  console.log("🚀 ~ Page ~ order:", order)
  return (
      order.data ? <OrderDetailPage order={order.data} /> : <div className="min-h-screen bg-gradient-to-br  flex items-center justify-center">
      <div className="text-center">
        <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Pedido no encontrado</h2>
        <p className="text-gray-600">La orden solicitada no existe.</p>
      </div>
    </div>
  )
}
