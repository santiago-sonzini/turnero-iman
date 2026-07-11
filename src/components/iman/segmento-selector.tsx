"use client";
// Selector de segmento compartido por las promos de WhatsApp y de email.
// Los números se guardan como texto para que el input se pueda borrar
// mientras escribís; el default se aplica recién al armar la lista.
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SegmentoInput } from "@/app/actions/iman";

export interface SegmentoState {
  tipo: "top" | "categoria" | "inactivos";
  topN: string;
  categoriaId: string;
  dias: string;
}

export function segmentoInicial(categorias: Array<{ id: string }>): SegmentoState {
  return { tipo: "top", topN: "10", categoriaId: categorias[0]?.id ?? "", dias: "30" };
}

// Convierte el estado del selector en el input del server action,
// aplicando defaults si el usuario dejó el campo vacío.
export function aSegmentoInput(s: SegmentoState): SegmentoInput {
  if (s.tipo === "top") return { tipo: "top", cantidad: Math.max(1, parseInt(s.topN) || 10) };
  if (s.tipo === "inactivos") return { tipo: "inactivos", dias: Math.max(1, parseInt(s.dias) || 30) };
  return { tipo: "categoria", categoriaId: s.categoriaId };
}

interface SegmentoSelectorProps {
  value: SegmentoState;
  onChange: (s: SegmentoState) => void;
  categorias: Array<{ id: string; name: string }>;
}

export function SegmentoSelector({ value, onChange, categorias }: SegmentoSelectorProps) {
  const set = (patch: Partial<SegmentoState>) => onChange({ ...value, ...patch });
  // Filtra a dígitos y sincroniza el DOM: si el valor filtrado es igual al
  // estado actual, React no re-renderiza y la letra quedaría visible.
  const numerico = (e: React.ChangeEvent<HTMLInputElement>): string => {
    const v = e.target.value.replace(/\D/g, "");
    e.target.value = v;
    return v;
  };

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="min-w-52">
        <Label className="text-xs text-muted-foreground">Grupo</Label>
        <Select
          value={value.tipo}
          onValueChange={(v) => set({ tipo: v as SegmentoState["tipo"] })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="top">Mejores clientes</SelectItem>
            <SelectItem value="categoria">Compradores de una categoría</SelectItem>
            <SelectItem value="inactivos">Inactivos hace más de N días</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {value.tipo === "top" && (
        <div className="w-28">
          <Label className="text-xs text-muted-foreground">Cuántos</Label>
          <Input
            type="text"
            inputMode="numeric"
            placeholder="10"
            value={value.topN}
            onChange={(e) => set({ topN: numerico(e) })}
          />
        </div>
      )}
      {value.tipo === "categoria" && (
        <div className="min-w-44">
          <Label className="text-xs text-muted-foreground">Categoría</Label>
          <Select value={value.categoriaId} onValueChange={(v) => set({ categoriaId: v })}>
            <SelectTrigger>
              <SelectValue placeholder="Categoría" />
            </SelectTrigger>
            <SelectContent>
              {categorias.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      {value.tipo === "inactivos" && (
        <div className="w-28">
          <Label className="text-xs text-muted-foreground">Días</Label>
          <Input
            type="text"
            inputMode="numeric"
            placeholder="30"
            value={value.dias}
            onChange={(e) => set({ dias: numerico(e) })}
          />
        </div>
      )}
    </div>
  );
}
