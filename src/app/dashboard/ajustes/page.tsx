"use server"
import { getBusinessProfile } from "@/app/actions/business";
import { getWaEstado } from "@/app/actions/wa-server";
import { getPartnerConfig } from "@/app/actions/partner";
import { AjustesForm } from "@/components/iman/ajustes-form";
import { PartnerConfigSection } from "@/components/iman/partner-config";
import { DEMO_MODE } from "@/server/db";
import { getDemoPackInfo } from "@/server/demo/current";

export default async function Page() {
  const [negocio, waEstado, partnerConfig, demoPack] = await Promise.all([
    getBusinessProfile(),
    getWaEstado(),
    getPartnerConfig(),
    getDemoPackInfo(),
  ]);

  return (
    <div className="no-scrollbar h-full w-full overflow-y-auto">
      <div className="mx-auto max-w-2xl space-y-4 pb-24">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Ajustes</h1>
          <p className="text-sm text-muted-foreground">
            Los datos de tu negocio salen en los mensajes de WhatsApp
            (variable {"{negocio}"}) y en los comprobantes impresos.
          </p>
        </div>

        {DEMO_MODE && (
          <div className="rounded-xl border border-sem-amarillo bg-sem-amarillo-suave p-3 text-sm">
            <strong>Modo demo:</strong> estás viendo datos de ejemplo de un
            negocio ficticio ({demoPack?.tipoLabel.toLowerCase()} ·{" "}
            {demoPack?.rubroLabel.toLowerCase()}), sin base de datos conectada.
            Podés cambiar de tipo/rubro desde el menú del perfil. Todo se
            guarda localmente y se resetea con{" "}
            <code className="rounded bg-white/60 px-1 dark:bg-background/60">npm run demo:reset</code>.
          </div>
        )}

        <AjustesForm negocio={negocio} />

        <PartnerConfigSection config={partnerConfig} features={demoPack?.features} />

        {/* Servidor de WhatsApp (opcional) */}
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="font-semibold">Servidor de WhatsApp (opcional)</p>
            {waEstado.conectado ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-sem-verde-suave px-3 py-1 text-xs font-semibold text-sem-verde">
                <span className="h-2 w-2 rounded-full bg-sem-verde" />
                Conectado
              </span>
            ) : waEstado.configurado ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-sem-amarillo-suave px-3 py-1 text-xs font-semibold text-sem-amarillo">
                <span className="h-2 w-2 rounded-full bg-sem-amarillo" />
                Configurado, sin conexión
              </span>
            ) : (
              <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
                No configurado
              </span>
            )}
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Sin servidor, los mensajes salen por links wa.me (abrís WhatsApp y
            mandás vos). Con el servidor corriendo podés además{" "}
            <strong>enviar directo desde acá</strong>, incluso con imagen
            (flyers, promos 2x1). Es un proceso aparte que mantiene tu sesión
            de WhatsApp viva — necesita una compu o servidor prendido, no
            funciona en serverless.
          </p>
          <ol className="mt-2 list-inside list-decimal space-y-1 text-sm text-muted-foreground">
            <li>
              <code className="rounded bg-muted px-1">cd wa-server && npm install && npm start</code>
            </li>
            <li>
              Abrí <code className="rounded bg-muted px-1">http://localhost:8321/qr</code> en el
              navegador y escaneá el QR con el WhatsApp del negocio (Dispositivos vinculados).
            </li>
            <li>
              En el <code className="rounded bg-muted px-1">.env</code> de la app:{" "}
              <code className="rounded bg-muted px-1">WA_SERVER_URL=http://localhost:8321</code> y reiniciá.
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
}
