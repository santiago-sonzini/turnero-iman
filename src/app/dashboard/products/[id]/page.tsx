import { getProductById } from '@/app/actions/products'
import ProductDetail from '@/components/features/products-list/product-detail'
import React from 'react'

const Page =  async ({ params }: { params: { id: string } }) => {
  const { id } = params
    const res = await getProductById(id)

  return (
    <ProductDetail product={res.data ?? null}/>
  )
}

export default Page