"use client";
// Armador de promos segmentadas: elegís a quiénes, con qué mensaje, y salen
// los links de WhatsApp listos para mandar uno por uno. Nada es automático.
import { useMemo, useState } from "react";
import { MessageTemplate } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { armarMensaje, linkWhatsApp, VARIABLES } from "@/lib/whatsapp";
import { formatARS } from "@/lib/format";
import {
  getSegmento,
  registrarContacto,
  type ClienteSemaforo,
} from "@/app/actions/iman";
import { enviarWhatsAppDirecto } from "@/app/actions/wa-server";
import type { BusinessInfo } from "@/app/actions/business";
import { EstadoChip } from "./estado";
import { EmailPromoTab } from "./email-promo";
import { ImagenUpload } from "./imagen-upload";
import { PlantillasEditor } from "./plantillas-editor";
import {
  aSegmentoInput,
  segmentoInicial,
  SegmentoSelector,
  type SegmentoState,
} from "./segmento-selector";
import { Check, ImageIcon, Loader2, MessageCircle, Send, Users } from "lucide-react";

interface PromosProps {
  negocio: BusinessInfo;
  categorias: Array<{ id: string; name: string }>;
  productos: Array<{ id: string; name: string; price: number; images: string[]; imageUrl: string | null }>;
  plantillas: MessageTemplate[];
  waConectado: boolean;
  smtpConfigurado: boolean;
}

export function PromosBuilder({ negocio, categorias, productos, plantillas, waConectado, smtpConfigurado }: PromosProps) {
  const [segmento, setSegmento] = useState<SegmentoState>(() => segmentoInicial(categorias));
  const [plantillaId, setPlantillaId] = useState(plantillas[0]?.id ?? "");
  const [productoId, setProductoId] = useState<string>("");
  const [texto, setTexto] = useState(plantillas[0]?.text ?? "");
  const [imagenUrl, setImagenUrl] = useState<string | null>(plantillas[0]?.imageUrl ?? null);
  const [lista, setLista] = useState<ClienteSemaforo[] | null>(null);
  const [generando, setGenerando] = useState(false);
  const [enviados, setEnviados] = useState<Set<string>>(new Set());
  const [enviando, setEnviando] = useState<string | null>(null);

  const plantilla = plantillas.find((p) => p.id === plantillaId) ?? null;
  const producto = productos.find((p) => p.id === productoId) ?? null;

  const elegirPlantilla = (id: string) => {
    setPlantillaId(id);
    const p = plantillas.find((x) => x.id === id);
    if (p) {
      setTexto(p.text);
      setImagenUrl(p.imageUrl ?? null);
    }
  };

  const generar = async () => {
    setGenerando(true);
    try {
      const res = await getSegmento(aSegmentoInput(segmento));
      setLista(res);
      setEnviados(new Set());
    } finally {
      setGenerando(false);
    }
  };

  const mensajeDe = (c: ClienteSemaforo) =>
    armarMensaje(texto, {
      clienteNombre: c.name,
      negocioNombre: negocio.name,
      dias: c.dias,
      ultimaCompra: c.ultima,
      producto: producto?.name ?? null,
      precio: producto?.price ?? null,
    });

  const abrirManual = async (c: ClienteSemaforo) => {
    const mensaje = mensajeDe(c);
    window.open(linkWhatsApp(c.phone, mensaje), "_blank");
    await registrarContacto({
      clientId: c.id,
      templateId: plantilla?.id ?? null,
      templateName: plantilla?.name ?? "personalizado",
      message: mensaje,
      statusAtSend: c.estado,
      mediaUrl: imagenUrl,
    });
    setEnviados((prev) => new Set([...prev, c.id]));
  };

  // Envío directo vía el servidor de WhatsApp (open-wa): manda texto o
  // imagen + texto sin abrir WhatsApp. Registra el contacto igual.
  const enviarDirecto = async (c: ClienteSemaforo) => {
    if (!c.phone) return abrirManual(c);
    setEnviando(c.id);
    try {
      const res = await enviarWhatsAppDirecto({
        clientId: c.id,
        telefono: c.phone,
        mensaje: mensajeDe(c),
        imagenUrl,
        templateId: plantilla?.id ?? null,
        templateName: plantilla?.name ?? "personalizado",
        statusAtSend: c.estado,
      });
      if (res.status === 200) {
        setEnviados((prev) => new Set([...prev, c.id]));
      } else {
        toast({ title: "No se pudo enviar", description: res.message, variant: "destructive" });
      }
    } finally {
      setEnviando(null);
    }
  };

  const pendientes = useMemo(
    () => (lista ?? []).filter((c) => !enviados.has(c.id)).length,
    [lista, enviados],
  );

  return (
    <div className="mx-auto max-w-4xl space-y-4 pb-24">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Promos</h1>
          <p className="text-sm text-muted-foreground">
            Elegí un grupo de clientes, un mensaje, y mandalo uno por uno por WhatsApp.
          </p>
        </div>
        {waConectado && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-sem-verde-suave px-3 py-1 text-xs font-semibold text-sem-verde">
            <span className="h-2 w-2 rounded-full bg-sem-verde" />
            WhatsApp conectado
          </span>
        )}
      </div>

      <Tabs defaultValue="armar">
        <TabsList>
          <TabsTrigger value="armar">WhatsApp</TabsTrigger>
          <TabsTrigger value="email">Email</TabsTrigger>
          <TabsTrigger value="plantillas">Plantillas</TabsTrigger>
        </TabsList>

        <TabsContent value="armar" className="space-y-4">
          {/* Paso 1: segmento */}
          <div className="rounded-xl border bg-card p-4">
            <p className="mb-3 text-sm font-semibold">1 · ¿A quiénes?</p>
            <SegmentoSelector value={segmento} onChange={setSegmento} categorias={categorias} />
          </div>

          {/* Paso 2: mensaje */}
          <div className="rounded-xl border bg-card p-4">
            <p className="mb-3 text-sm font-semibold">2 · ¿Con qué mensaje?</p>
            <div className="space-y-3">
              <div className="flex flex-wrap gap-3">
                <div className="min-w-52 flex-1">
                  <Label className="text-xs text-muted-foreground">Plantilla</Label>
                  <Select value={plantillaId} onValueChange={elegirPlantilla}>
                    <SelectTrigger>
                      <SelectValue placeholder="Plantilla" />
                    </SelectTrigger>
                    <SelectContent>
                      {plantillas.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="min-w-52 flex-1">
                  <Label className="text-xs text-muted-foreground">
                    Producto para {"{producto}"} y {"{precio}"} (opcional)
                  </Label>
                  <Select
                    value={productoId || "ninguno"}
                    onValueChange={(v) => setProductoId(v === "ninguno" ? "" : v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sin producto" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ninguno">Sin producto</SelectItem>
                      {productos.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} — {formatARS(p.price)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Textarea
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                  rows={4}
                />
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Variables:{" "}
                  {VARIABLES.map((v) => (
                    <code key={v.clave} className="mr-1.5 rounded bg-muted px-1">
                      {v.clave}
                    </code>
                  ))}
                </p>
              </div>

              {/* Imagen de la promo (flyer 2x1, foto del producto, etc.) */}
              <div className="rounded-lg border bg-muted/40 p-3">
                <Label className="mb-2 flex items-center gap-1.5 text-xs font-semibold">
                  <ImageIcon className="h-3.5 w-3.5" />
                  Imagen de la promo (opcional)
                </Label>
                <div className="flex flex-wrap items-center gap-3">
                  <ImagenUpload value={imagenUrl} onChange={setImagenUrl} label="Subir flyer" />
                  {producto && (producto.images[0] ?? producto.imageUrl) && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setImagenUrl(producto.images[0] ?? producto.imageUrl)}
                    >
                      Usar foto del producto
                    </Button>
                  )}
                </div>
                {imagenUrl && !waConectado && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Por wa.me va solo el texto: adjuntá la imagen a mano en WhatsApp.
                    Con el servidor de WhatsApp conectado (ver Ajustes), la imagen
                    sale sola junto al mensaje.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Paso 3: lista */}
          <div className="rounded-xl border bg-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold">3 · Mandalos uno por uno</p>
              <Button onClick={generar} disabled={generando || !texto.trim()}>
                <Users className="mr-1.5 h-4 w-4" />
                {generando ? "Armando…" : "Armar lista"}
              </Button>
            </div>

            {lista === null && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Armá la lista para ver los clientes del grupo con su mensaje listo.
              </p>
            )}
            {lista?.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No hay clientes en ese grupo.
              </p>
            )}
            {!!lista?.length && (
              <>
                <p className="mb-2 text-sm text-muted-foreground">
                  {lista.length} clientes · {pendientes} sin mandar. Cada botón abre
                  WhatsApp con el mensaje personalizado y registra el contacto.
                </p>
                <div className="space-y-2">
                  {lista.map((c) => {
                    const enviado = enviados.has(c.id);
                    return (
                      <div
                        key={c.id}
                        className={cn(
                          "flex items-center justify-between gap-3 rounded-lg border p-3",
                          enviado && "opacity-50",
                        )}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={cn("font-medium", enviado && "line-through")}>
                              {c.name}
                            </span>
                            <EstadoChip estado={c.estado} />
                            {!c.phone && (
                              <span className="text-xs text-muted-foreground">
                                sin teléfono: elegís el contacto en WhatsApp
                              </span>
                            )}
                          </div>
                          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                            {mensajeDe(c)}
                          </p>
                        </div>
                        {enviado ? (
                          <span className="flex shrink-0 items-center gap-1 text-sm font-medium text-sem-verde">
                            <Check className="h-4 w-4" />
                            Mandado
                          </span>
                        ) : (
                          <span className="flex shrink-0 gap-1.5">
                            {waConectado && c.phone && (
                              <Button
                                size="sm"
                                className="bg-wa text-white hover:bg-wa-hover"
                                disabled={enviando === c.id}
                                onClick={() => enviarDirecto(c)}
                              >
                                {enviando === c.id ? (
                                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                                ) : (
                                  <Send className="mr-1.5 h-4 w-4" />
                                )}
                                Enviar
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant={waConectado && c.phone ? "outline" : "default"}
                              className={waConectado && c.phone ? "" : "bg-wa text-white hover:bg-wa-hover"}
                              onClick={() => abrirManual(c)}
                            >
                              <MessageCircle className="mr-1.5 h-4 w-4" />
                              Abrir
                            </Button>
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </TabsContent>

        <TabsContent value="email">
          <EmailPromoTab
            negocio={negocio}
            categorias={categorias}
            productos={productos}
            plantillas={plantillas}
            smtpConfigurado={smtpConfigurado}
          />
        </TabsContent>

        <TabsContent value="plantillas">
          <PlantillasEditor plantillas={plantillas} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
