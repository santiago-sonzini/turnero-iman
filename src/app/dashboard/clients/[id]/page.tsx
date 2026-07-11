import { getClientById } from "@/app/actions/users";
import { getClienteIntel, getPlantillas } from "@/app/actions/iman";
import { getBusinessProfile } from "@/app/actions/business";
import { getWaEstado } from "@/app/actions/wa-server";
import { ClienteIntelCard } from "@/components/iman/cliente-intel-card";
import { OrdersPageTableClient } from "@/components/features/client/orders";
import React from "react";

const Page = async ({ params }: { params: { id: string } }) => {
  const [client, intel, plantillas, negocio, waEstado] = await Promise.all([
    getClientById(params.id),
    getClienteIntel(params.id),
    getPlantillas(),
    getBusinessProfile(),
    getWaEstado(),
  ]);

  return (
    <div className="no-scrollbar h-full w-full overflow-y-auto overflow-x-hidden px-3 pb-4 sm:px-0 sm:pb-10">
      {intel && (
        <ClienteIntelCard
          intel={intel}
          plantillas={plantillas}
          negocioNombre={negocio.name}
          waConectado={waEstado.conectado}
        />
      )}
      <div className="w-full">
        <OrdersPageTableClient client={client.data} id={params.id} />
      </div>
    </div>
  );
};

export default Page;
