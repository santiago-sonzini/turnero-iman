"use client";
// Diálogo de contacto por WhatsApp: elegís plantilla, el mensaje se arma con
// los datos del cliente, lo editás si querés y se abre wa.me. Nada se manda
// solo. Al abrir el link, el contacto queda registrado para medir recuperos.
import { useEffect, useMemo, useState } from "react";
import { MessageTemplate } from "@prisma/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";
import { armarMensaje, linkWhatsApp } from "@/lib/whatsapp";
import { actualizarTelefono, registrarContacto, type ClienteSemaforo } from "@/app/actions/iman";
import { enviarWhatsAppDirecto } from "@/app/actions/wa-server";
import { Loader2, MessageCircle, Phone, Send } from "lucide-react";

const ESTADO_LABEL: Record<string, string> = {
  activo: "Activo",
  riesgo: "En riesgo",
  dormido: "Dormido",
  perdido: "Perdido",
};

interface WhatsAppDialogProps {
  cliente: ClienteSemaforo | null;
  plantillas: MessageTemplate[];
  negocioNombre: string;
  producto?: { nombre: string; precio: number } | null;
  plantillaInicialId?: string;
  waConectado?: boolean;
  onClose: () => void;
  onEnviado?: (clienteId: string) => void;
}

export function WhatsAppDialog({
  cliente,
  plantillas,
  negocioNombre,
  producto,
  plantillaInicialId,
  waConectado = false,
  onClose,
  onEnviado,
}: WhatsAppDialogProps) {
  const [plantillaId, setPlantillaId] = useState<string>("");
  const [mensaje, setMensaje] = useState("");
  const [telefonoNuevo, setTelefonoNuevo] = useState("");
  const [telefono, setTelefono] = useState<string | null>(null);
  const [guardandoTel, setGuardandoTel] = useState(false);
  const [abriendo, setAbriendo] = useState(false);
  const [enviandoDirecto, setEnviandoDirecto] = useState(false);

  const plantilla = useMemo(
    () => plantillas.find((p) => p.id === plantillaId) ?? null,
    [plantillas, plantillaId],
  );

  // Al abrir con otro cliente: resetear plantilla, teléfono y mensaje
  useEffect(() => {
    if (!cliente) return;
    setTelefono(cliente.phone);
    setTelefonoNuevo("");
    const inicial = plantillaInicialId ?? sugerirPlantilla(cliente, plantillas);
    setPlantillaId(inicial);
  }, [cliente?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Rearmar el mensaje cuando cambia la plantilla (editable después)
  useEffect(() => {
    if (!cliente || !plantilla) return;
    setMensaje(
      armarMensaje(plantilla.text, {
        clienteNombre: cliente.name,
        negocioNombre,
        dias: cliente.dias,
        ultimaCompra: cliente.ultima,
        producto: producto?.nombre ?? null,
        precio: producto?.precio ?? null,
      }),
    );
  }, [plantilla?.id, cliente?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!cliente) return null;

  const guardarTelefono = async () => {
    setGuardandoTel(true);
    const res = await actualizarTelefono(cliente.id, telefonoNuevo);
    setGuardandoTel(false);
    if (res.status === 200 && res.data) {
      setTelefono(res.data);
      toast({ title: "Teléfono guardado", description: `${cliente.name}: ${res.data}` });
    } else {
      toast({ title: "Error", description: res.message, variant: "destructive" });
    }
  };

  const abrirWhatsApp = async () => {
    setAbriendo(true);
    try {
      window.open(linkWhatsApp(telefono, mensaje), "_blank");
      await registrarContacto({
        clientId: cliente.id,
        templateId: plantilla?.id ?? null,
        templateName: plantilla?.name ?? "personalizado",
        message: mensaje,
        statusAtSend: cliente.estado,
        mediaUrl: plantilla?.imageUrl ?? null,
      });
      toast({
        title: "Contacto registrado",
        description: `${cliente.name} · ${plantilla?.name ?? "personalizado"}. El contacto quedó registrado.`,
      });
      onEnviado?.(cliente.id);
      onClose();
    } finally {
      setAbriendo(false);
    }
  };

  // Envío directo vía el servidor de WhatsApp (open-wa), con imagen si la
  // plantilla tiene flyer. Solo aparece si el servidor está conectado.
  const enviarDirecto = async () => {
    if (!telefono) return;
    setEnviandoDirecto(true);
    try {
      const res = await enviarWhatsAppDirecto({
        clientId: cliente.id,
        telefono,
        mensaje,
        imagenUrl: plantilla?.imageUrl ?? null,
        templateId: plantilla?.id ?? null,
        templateName: plantilla?.name ?? "personalizado",
        statusAtSend: cliente.estado,
      });
      if (res.status === 200) {
        toast({
          title: "Mensaje enviado",
          description: `${cliente.name} · ${plantilla?.name ?? "personalizado"}. El contacto quedó registrado.`,
        });
        onEnviado?.(cliente.id);
        onClose();
      } else {
        toast({ title: "No se pudo enviar", description: res.message, variant: "destructive" });
      }
    } finally {
      setEnviandoDirecto(false);
    }
  };

  return (
    <Dialog open={!!cliente} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[92vh] w-[95vw] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-wa" />
            Escribirle a {cliente.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {ESTADO_LABEL[cliente.estado]}
            {cliente.dias != null && <> · hace {cliente.dias} días que no compra</>}
            {cliente.ultimoContacto && (
              <> · ya contactado el {new Date(cliente.ultimoContacto.fecha).toLocaleDateString("es-AR")}</>
            )}
          </p>

          <div>
            <Label className="text-xs text-muted-foreground">Plantilla</Label>
            <Select value={plantillaId} onValueChange={setPlantillaId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Elegí una plantilla" />
              </SelectTrigger>
              <SelectContent>
                {plantillas.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                    {p.situation ? ` — ${p.situation}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">
              Mensaje (editalo como quieras antes de mandar)
            </Label>
            <Textarea
              value={mensaje}
              onChange={(e) => setMensaje(e.target.value)}
              rows={5}
              className="text-base"
            />
          </div>

          {!telefono && (
            <div className="rounded-lg border border-sem-amarillo bg-sem-amarillo-suave p-3">
              <p className="mb-2 text-sm font-medium">
                Este cliente no tiene teléfono cargado.
              </p>
              <div className="flex gap-2">
                <Input
                  placeholder="Ej: 11 5550 1234"
                  value={telefonoNuevo}
                  onChange={(e) => setTelefonoNuevo(e.target.value)}
                  className="bg-white dark:bg-background"
                />
                <Button
                  variant="outline"
                  onClick={guardarTelefono}
                  disabled={guardandoTel || !telefonoNuevo.trim()}
                >
                  <Phone className="mr-1 h-4 w-4" />
                  Guardar
                </Button>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Sin teléfono, WhatsApp se abre igual y elegís el contacto a mano.
              </p>
            </div>
          )}

          {plantilla?.imageUrl && (
            <div className="flex items-center gap-3 rounded-lg border bg-muted/40 p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={plantilla.imageUrl}
                alt="Imagen de la plantilla"
                className="h-14 w-14 rounded-md border object-cover"
              />
              <p className="text-xs text-muted-foreground">
                {waConectado
                  ? "Esta imagen sale junto al mensaje."
                  : "Por wa.me va solo el texto: adjuntá la imagen a mano."}
              </p>
            </div>
          )}

          <div className="space-y-2">
            {waConectado && telefono && (
              <Button
                onClick={enviarDirecto}
                disabled={enviandoDirecto || !mensaje.trim()}
                className="w-full bg-wa text-white hover:bg-wa-hover"
                size="lg"
              >
                {enviandoDirecto ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <Send className="mr-2 h-5 w-5" />
                )}
                Enviar ahora por WhatsApp
              </Button>
            )}
            <Button
              onClick={abrirWhatsApp}
              disabled={abriendo || !mensaje.trim()}
              variant={waConectado && telefono ? "outline" : "default"}
              className={
                waConectado && telefono
                  ? "w-full"
                  : "w-full bg-wa text-white hover:bg-wa-hover"
              }
              size="lg"
            >
              <MessageCircle className="mr-2 h-5 w-5" />
              Abrir WhatsApp con el mensaje listo
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// La plantilla sugerida depende del estado del cliente.
function sugerirPlantilla(cliente: ClienteSemaforo, plantillas: MessageTemplate[]): string {
  const porNombre = (frag: string) =>
    plantillas.find((p) => p.name.toLowerCase().includes(frag))?.id;
  if (cliente.estado === "dormido" || cliente.estado === "perdido") {
    return porNombre("reactiv") ?? plantillas[0]?.id ?? "";
  }
  if (cliente.estado === "riesgo") {
    return porNombre("reactiv") ?? porNombre("oferta") ?? plantillas[0]?.id ?? "";
  }
  return porNombre("seguimiento") ?? plantillas[0]?.id ?? "";
}
