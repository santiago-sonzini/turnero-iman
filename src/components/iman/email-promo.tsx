"use client";
// Email marketing por segmento: mismo esquema que WhatsApp. Sin SMTP, cada
// botón abre tu cliente de correo (mailto:) con asunto y mensaje listos; con
// SMTP configurado se envía directo (con imagen). Todo queda registrado.
import { useMemo, useState } from "react";
import { MessageTemplate } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { armarMensaje, VARIABLES } from "@/lib/whatsapp";
import { formatARS } from "@/lib/format";
import { getSegmento, type ClienteSemaforo } from "@/app/actions/iman";
import { enviarEmailPromo, registrarContactoEmail } from "@/app/actions/email-promo";
import type { BusinessInfo } from "@/app/actions/business";
import { EstadoChip } from "./estado";
import { ImagenUpload } from "./imagen-upload";
import {
  aSegmentoInput,
  segmentoInicial,
  SegmentoSelector,
  type SegmentoState,
} from "./segmento-selector";
import { Check, ImageIcon, Loader2, Mail, Send, Users } from "lucide-react";

interface EmailPromoProps {
  negocio: BusinessInfo;
  categorias: Array<{ id: string; name: string }>;
  productos: Array<{ id: string; name: string; price: number; images: string[]; imageUrl: string | null }>;
  plantillas: MessageTemplate[];
  smtpConfigurado: boolean;
}

export function EmailPromoTab({
  negocio,
  categorias,
  productos,
  plantillas,
  smtpConfigurado,
}: EmailPromoProps) {
  const [segmento, setSegmento] = useState<SegmentoState>(() => segmentoInicial(categorias));
  const [plantillaId, setPlantillaId] = useState(plantillas[0]?.id ?? "");
  const [productoId, setProductoId] = useState<string>("");
  const [asunto, setAsunto] = useState(`Novedades de ${negocio.name}`);
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

  const abrirMailto = async (c: ClienteSemaforo) => {
    const mensaje = mensajeDe(c);
    const href = `mailto:${encodeURIComponent(c.email ?? "")}?subject=${encodeURIComponent(
      asunto,
    )}&body=${encodeURIComponent(mensaje)}`;
    window.open(href, "_blank");
    await registrarContactoEmail({
      clientId: c.id,
      asunto,
      mensaje,
      imagenUrl,
      templateId: plantilla?.id ?? null,
      templateName: plantilla?.name ?? "personalizado",
      statusAtSend: c.estado,
    });
    setEnviados((prev) => new Set([...prev, c.id]));
  };

  const enviarDirecto = async (c: ClienteSemaforo) => {
    if (!c.email) return;
    setEnviando(c.id);
    try {
      const res = await enviarEmailPromo({
        clientId: c.id,
        email: c.email,
        asunto,
        mensaje: mensajeDe(c),
        imagenUrl,
        templateId: plantilla?.id ?? null,
        templateName: plantilla?.name ?? "personalizado",
        statusAtSend: c.estado,
        negocioNombre: negocio.name,
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

  const conEmail = useMemo(() => (lista ?? []).filter((c) => c.email).length, [lista]);

  return (
    <div className="space-y-4">
      {/* Paso 1 */}
      <div className="rounded-xl border bg-card p-4">
        <p className="mb-3 text-sm font-semibold">1 · ¿A quiénes?</p>
        <SegmentoSelector value={segmento} onChange={setSegmento} categorias={categorias} />
      </div>

      {/* Paso 2 */}
      <div className="rounded-xl border bg-card p-4">
        <p className="mb-3 text-sm font-semibold">2 · ¿Con qué email?</p>
        <div className="space-y-3">
          <div>
            <Label className="text-xs text-muted-foreground">Asunto</Label>
            <Input value={asunto} onChange={(e) => setAsunto(e.target.value)} />
          </div>

          <div className="flex flex-wrap gap-3">
            <div className="min-w-52 flex-1">
              <Label className="text-xs text-muted-foreground">Plantilla (mismo texto que WhatsApp)</Label>
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
            <Textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={4} />
            <p className="mt-1.5 text-xs text-muted-foreground">
              Variables:{" "}
              {VARIABLES.map((v) => (
                <code key={v.clave} className="mr-1.5 rounded bg-muted px-1">
                  {v.clave}
                </code>
              ))}
            </p>
          </div>

          <div className="rounded-lg border bg-muted/40 p-3">
            <Label className="mb-2 flex items-center gap-1.5 text-xs font-semibold">
              <ImageIcon className="h-3.5 w-3.5" />
              Imagen del email (opcional)
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
            {imagenUrl && !smtpConfigurado && (
              <p className="mt-2 text-xs text-muted-foreground">
                Por mailto: va solo el texto — adjuntá la imagen a mano. Con SMTP
                configurado (ver .env) la imagen sale dentro del email.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Paso 3 */}
      <div className="rounded-xl border bg-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold">3 · Mandalos uno por uno</p>
          <Button onClick={generar} disabled={generando || !texto.trim() || !asunto.trim()}>
            <Users className="mr-1.5 h-4 w-4" />
            {generando ? "Armando…" : "Armar lista"}
          </Button>
        </div>

        {lista === null && (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Armá la lista para ver los clientes del grupo con su email listo.
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
              {lista.length} clientes · {conEmail} con email cargado.
              {smtpConfigurado
                ? " «Enviar» manda directo desde la app."
                : " Cada botón abre tu correo con el email listo."}
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
                        {c.email ? (
                          <span className="text-xs text-muted-foreground">{c.email}</span>
                        ) : (
                          <span className="text-xs text-sem-amarillo">sin email cargado</span>
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
                    ) : c.email ? (
                      <span className="flex shrink-0 gap-1.5">
                        {smtpConfigurado && (
                          <Button
                            size="sm"
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
                          variant={smtpConfigurado ? "outline" : "default"}
                          onClick={() => abrirMailto(c)}
                        >
                          <Mail className="mr-1.5 h-4 w-4" />
                          Abrir
                        </Button>
                      </span>
                    ) : (
                      <span className="shrink-0 text-xs text-muted-foreground">
                        cargalo en su ficha
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
