import { InvoiceCreateForm } from '@/components/features/invoices/create'
import React from 'react'

const Page = () => {
  return (
    <div className="no-scrollbar h-full w-full overflow-y-auto px-1 pt-12 sm:px-4">
      <InvoiceCreateForm />
    </div>
  )
}

export default Page
