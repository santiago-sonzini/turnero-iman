"use client";
// Editor de plantillas de WhatsApp por situación, con variables.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { MessageTemplate } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { borrarPlantilla, guardarPlantilla } from "@/app/actions/iman";
import { VARIABLES } from "@/lib/whatsapp";
import { ImagenUpload } from "./imagen-upload";
import { Pencil, Plus, Trash2 } from "lucide-react";

export function PlantillasEditor({ plantillas }: { plantillas: MessageTemplate[] }) {
  const router = useRouter();
  const [editando, setEditando] = useState<string | "nueva" | null>(null);

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Un mensaje por situación. Las variables{" "}
        {VARIABLES.map((v) => (
          <code key={v.clave} className="mr-1 rounded bg-muted px-1 text-xs">
            {v.clave}
          </code>
        ))}
        se completan solas con los datos de cada cliente.
      </p>

      {plantillas.map((p) =>
        editando === p.id ? (
          <PlantillaForm
            key={p.id}
            inicial={p}
            onDone={() => {
              setEditando(null);
              router.refresh();
            }}
            onCancel={() => setEditando(null)}
          />
        ) : (
          <div key={p.id} className="rounded-xl border bg-card p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex min-w-0 gap-3">
                {p.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.imageUrl}
                    alt=""
                    className="h-14 w-14 shrink-0 rounded-lg border object-cover"
                  />
                )}
                <div className="min-w-0">
                  <p className="font-semibold">{p.name}</p>
                  {p.situation && (
                    <p className="text-xs text-muted-foreground">{p.situation}</p>
                  )}
                  <p className="mt-2 whitespace-pre-wrap text-sm text-foreground/85">{p.text}</p>
                </div>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button variant="ghost" size="icon" onClick={() => setEditando(p.id)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive"
                  onClick={async () => {
                    await borrarPlantilla(p.id);
                    toast({ title: "Plantilla borrada", description: p.name });
                    router.refresh();
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        ),
      )}

      {editando === "nueva" ? (
        <PlantillaForm
          onDone={() => {
            setEditando(null);
            router.refresh();
          }}
          onCancel={() => setEditando(null)}
        />
      ) : (
        <Button variant="outline" onClick={() => setEditando("nueva")}>
          <Plus className="mr-1.5 h-4 w-4" />
          Nueva plantilla
        </Button>
      )}
    </div>
  );
}

function PlantillaForm({
  inicial,
  onDone,
  onCancel,
}: {
  inicial?: MessageTemplate;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(inicial?.name ?? "");
  const [situation, setSituation] = useState(inicial?.situation ?? "");
  const [text, setText] = useState(inicial?.text ?? "Hola {nombre}! Te escribo de {negocio}. ");
  const [imageUrl, setImageUrl] = useState<string | null>(inicial?.imageUrl ?? null);
  const [guardando, setGuardando] = useState(false);

  const guardar = async () => {
    setGuardando(true);
    const res = await guardarPlantilla({ id: inicial?.id, name, situation, text, imageUrl });
    setGuardando(false);
    if (res.status === 200) {
      toast({ title: inicial ? "Plantilla actualizada" : "Plantilla creada", description: name });
      onDone();
    } else {
      toast({ title: "Error", description: res.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-3 rounded-xl border-2 border-foreground/20 bg-card p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label className="text-xs text-muted-foreground">Nombre</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Reactivación" />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">¿Para qué situación?</Label>
          <Input
            value={situation}
            onChange={(e) => setSituation(e.target.value)}
            placeholder="Para clientes dormidos o perdidos"
          />
        </div>
      </div>
      <div>
        <Label className="text-xs text-muted-foreground">Mensaje</Label>
        <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={4} />
      </div>
      <div>
        <Label className="text-xs text-muted-foreground">
          Imagen (opcional — ej: flyer de un 2x1; va junto al mensaje)
        </Label>
        <div className="mt-1">
          <ImagenUpload value={imageUrl} onChange={setImageUrl} label="Subir flyer" />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button onClick={guardar} disabled={guardando || !name.trim() || !text.trim()}>
          {guardando ? "Guardando…" : "Guardar"}
        </Button>
      </div>
    </div>
  );
}
