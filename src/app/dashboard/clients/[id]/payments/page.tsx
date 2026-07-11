import { getClientById } from "@/app/actions/users";
import { PaymentsPageTableClient } from "@/components/features/client/orders/payments-table";
import React from "react";

const Page = async ({ params }: { params: { id: string } }) => {
  const client = await getClientById(params.id);

  return (
    <PaymentsPageTableClient
      client={client.data}
      id={params.id}
    />
  );
};

export default Page;
