"use client";
// Import de ventas históricas desde CSV/Excel (pegado o archivo).
// Columnas: cliente, fecha (dd/mm/aaaa), monto[, telefono]. Con esto el motor
// arranca con historia real sin cargar venta por venta.
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { importarVentas } from "@/app/actions/iman";
import { parseCSV } from "@/lib/import-parse";
import { Upload } from "lucide-react";

export function ImportDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [texto, setTexto] = useState("");
  const [importando, setImportando] = useState(false);

  const filas = parseCSV(texto);

  const importar = async () => {
    setImportando(true);
    const res = await importarVentas(filas);
    setImportando(false);
    if (res.status === 200) {
      toast({
        title: "Ventas importadas",
        description: `${res.message}${res.errores?.length ? ` ${res.errores.length} filas con errores.` : ""}`,
      });
      setTexto("");
      onOpenChange(false);
      router.refresh();
    } else {
      toast({ title: "Error", description: res.message, variant: "destructive" });
    }
  };

  const leerArchivo = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => setTexto(String(reader.result ?? ""));
    reader.readAsText(file);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] w-[95vw] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Importar ventas históricas
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Pegá acá tus ventas (desde Excel se copia y pega directo) o subí un
            CSV. Una fila por venta:{" "}
            <code className="rounded bg-muted px-1">cliente, fecha, monto</code>{" "}
            — la fecha en dd/mm/aaaa. Si el cliente no existe, se crea.
          </p>

          <input
            type="file"
            accept=".csv,.txt"
            onChange={(e) => e.target.files?.[0] && leerArchivo(e.target.files[0])}
            className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary-foreground"
          />

          <Textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            rows={8}
            placeholder={"Kiosco La Esquina, 15/03/2026, 45000\nAlmacén Don Cacho, 20/03/2026, 112500"}
            className="font-mono text-xs"
          />

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {filas.length > 0
                ? `${filas.length} ventas listas para importar`
                : "Sin filas válidas todavía"}
            </span>
            <Button onClick={importar} disabled={!filas.length || importando}>
              {importando ? "Importando…" : `Importar ${filas.length || ""}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
