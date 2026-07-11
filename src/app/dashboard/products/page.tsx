import ProductsDashboard from '@/components/features/products-list-dashboard/products-list'
import { getDemoPackInfo } from '@/server/demo/current'
import React from 'react'

const Page = async () => {
  const demoPack = await getDemoPackInfo()
  return (
    <ProductsDashboard features={demoPack?.features} />
  )
}

export default Page
