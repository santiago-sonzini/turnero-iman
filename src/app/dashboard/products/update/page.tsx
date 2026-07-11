import { getAllProductsAction } from '@/app/actions/products'
import PriceComparator from '@/components/features/update-products/page'
import { ScrollArea } from '@/components/ui/scroll-area'
import React from 'react'

const page = async () => {
    const products = await getAllProductsAction()
    console.log("🚀 ~ page ~ products:", products)
  return (
    <ScrollArea>
      <PriceComparator products={products} />
    </ScrollArea>
  )
}

export default page