import Products from '@/components/features/products-list/products-list'
import React from 'react'

const Page = ({ params }: { params: { slug: string } }) => {
  return (
    <Products catalog={params.slug} />
  )
}

export default Page