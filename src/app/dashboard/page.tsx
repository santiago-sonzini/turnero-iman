"use server"
// Pantalla principal de Imán: el semáforo de clientes.
import { SemaforoClientes } from "@/components/iman/semaforo";
import {
  getClientesSemaforo,
  getContextoPromos,
  getSugerenciasFusion,
} from "../actions/iman";
import { getWaEstado } from "../actions/wa-server";
import { getDemoPackInfo } from "@/server/demo/current";

export default async function Page() {
  const [clientes, fusiones, contexto, waEstado, demoPack] = await Promise.all([
    getClientesSemaforo(),
    getSugerenciasFusion(),
    getContextoPromos(),
    getWaEstado(),
    getDemoPackInfo(),
  ]);

  return (
    <div className="no-scrollbar h-full w-full overflow-y-auto">
      <SemaforoClientes
        clientes={clientes}
        fusiones={fusiones}
        negocioNombre={contexto.negocio.name}
        plantillas={contexto.plantillas}
        waConectado={waEstado.conectado}
        titulo={demoPack?.labels.clientes}
      />
    </div>
  );
}
