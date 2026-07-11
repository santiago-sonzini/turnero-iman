import { getClientById } from "@/app/actions/users";
import { getClientAccount } from "@/app/actions/clients";
import { PaymentsPublic } from "@/components/features/client-public/orders/payments-table";
import { CuentaNoHabilitada } from "@/components/features/client-public/account-gate";
import { DEMO_MODE } from "@/server/db";
import React from "react";

const Page = async ({ params }: { params: { id: string } }) => {
  const [client, account] = await Promise.all([
    getClientById(params.id),
    getClientAccount(params.id),
  ]);

  // Mismo gate que /history/[id]: solo con cuenta habilitada (o modo demo).
  if (!DEMO_MODE && !account.enabled) {
    return <CuentaNoHabilitada />;
  }

  return (
    <div className="no-scrollbar h-full w-full overflow-y-auto overflow-x-hidden px-0 pb-4 sm:px-4">
      <PaymentsPublic client={client.data} id={params.id} />
    </div>
  );
};

export default Page;
