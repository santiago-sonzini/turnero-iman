import { getAllCategoriesAction } from '@/app/actions/categories'
import { getAllProductsAction } from '@/app/actions/products'
import CreateOfferPage from '@/components/features/offers/create'
import { ScrollArea } from '@/components/ui/scroll-area'
import React from 'react'

const Page = async () => {
    const products = await getAllProductsAction()
    const categories = await getAllCategoriesAction()
  return (
    <ScrollArea className="w-full mt-20 max-h-[90vh] overflow-y-scroll no-scrollbar">
    <CreateOfferPage products={products}  categories={categories} />

    </ScrollArea>
  )
}

export default Page