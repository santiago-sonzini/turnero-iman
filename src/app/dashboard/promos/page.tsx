"use server"
import { PromosBuilder } from "@/components/iman/promos";
import { getContextoPromos } from "@/app/actions/iman";
import { getWaEstado } from "@/app/actions/wa-server";
import { getEmailEstado } from "@/app/actions/email-promo";

export default async function Page() {
  const [{ negocio, categorias, productos, plantillas }, waEstado, emailEstado] = await Promise.all([
    getContextoPromos(),
    getWaEstado(),
    getEmailEstado(),
  ]);

  return (
    <div className="no-scrollbar h-full w-full overflow-y-auto">
      <PromosBuilder
        negocio={negocio}
        categorias={categorias}
        productos={productos}
        plantillas={plantillas}
        waConectado={waEstado.conectado}
        smtpConfigurado={emailEstado.configurado}
      />
    </div>
  );
}
