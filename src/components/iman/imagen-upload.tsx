"use client";
// Selector de imagen chico y reutilizable (flyers de promo, plantillas).
// Sube vía uploadMediaAction: Supabase si está configurado, disco local si no.
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { uploadMediaAction } from "@/app/actions/image";
import { ImagePlus, Loader2, X } from "lucide-react";

interface ImagenUploadProps {
  value: string | null;
  onChange: (url: string | null) => void;
  label?: string;
}

export function ImagenUpload({ value, onChange, label = "Subir imagen" }: ImagenUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [subiendo, setSubiendo] = useState(false);

  const subir = async (file: File) => {
    setSubiendo(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("bucketName", "products");
      fd.append("folderName", "promos");
      const res = await uploadMediaAction(fd);
      if (res.success && res.url) {
        onChange(res.url);
      } else {
        toast({ title: "Error al subir", description: res.error, variant: "destructive" });
      }
    } finally {
      setSubiendo(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      {value ? (
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt="Imagen elegida"
            className="h-16 w-16 rounded-lg border object-cover"
          />
          <button
            type="button"
            onClick={() => onChange(null)}
            className="absolute -right-2 -top-2 rounded-full border bg-background p-0.5 shadow-sm"
            aria-label="Quitar imagen"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={subiendo}
          onClick={() => inputRef.current?.click()}
        >
          {subiendo ? (
            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
          ) : (
            <ImagePlus className="mr-1.5 h-4 w-4" />
          )}
          {subiendo ? "Subiendo…" : label}
        </Button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) subir(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}
