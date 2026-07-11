import { getClientById } from "@/app/actions/users";
import { getClientAccount } from "@/app/actions/clients";
import { OrdersPageTableClientPublic } from "@/components/features/client-public/orders";
import { CuentaNoHabilitada } from "@/components/features/client-public/account-gate";
import { DEMO_MODE } from "@/server/db";
import React from "react";

const Page = async ({ params }: { params: { id: string } }) => {
  const [client, account] = await Promise.all([
    getClientById(params.id),
    getClientAccount(params.id),
  ]);

  // Solo accede el cliente con una cuenta habilitada desde el dashboard.
  // En modo demo se permite el acceso para poder probar la página.
  if (!DEMO_MODE && !account.enabled) {
    return <CuentaNoHabilitada />;
  }

  return (
    <div className="no-scrollbar h-full w-full overflow-y-auto overflow-x-hidden px-0 pb-4 sm:px-4">
      <div className="w-full">
        <OrdersPageTableClientPublic client={client.data} id={params.id} />
      </div>
    </div>
  );
};

export default Page;
