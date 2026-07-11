import { getAllProductsAction } from '@/app/actions/products'
import CatalogGenerator from '@/components/features/catalog/page'
import ProductsDashboard from '@/components/features/products-list-dashboard/products-list'
import Products from '@/components/features/products-list/products-list'
import React from 'react'

const Page = async () => {
    const products = await getAllProductsAction()
    return (
        <CatalogGenerator products={products} />
    )
}

export default Page