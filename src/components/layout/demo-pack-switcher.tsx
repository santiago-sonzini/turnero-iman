"use client";

// Switcher del pack de demo (tipo × rubro) para el dropdown del perfil.
// Dos grupos tipo select; al elegir se fija la cookie y se refresca todo.
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import {
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { setDemoPack } from "@/app/actions/demo";
import { RUBROS, TIPOS } from "@/server/demo/packs/ids";
import type { DemoPackInfo } from "@/server/demo/packs/types";

export function DemoPackSwitcher({ pack }: { pack: DemoPackInfo }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const cambiar = (tipo: string, rubro: string) => {
    startTransition(async () => {
      await setDemoPack(tipo, rubro);
      router.refresh();
    });
  };

  return (
    <div className={pending ? "pointer-events-none opacity-60" : undefined}>
      <DropdownMenuLabel className="pb-0 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        Demo · Tipo
      </DropdownMenuLabel>
      <DropdownMenuRadioGroup
        value={pack.tipo}
        onValueChange={(v) => cambiar(v, pack.rubro)}
      >
        {TIPOS.map((t) => (
          <DropdownMenuRadioItem
            key={t.id}
            value={t.id}
            // No cerrar el menú: se suele cambiar tipo y rubro juntos.
            onSelect={(e) => e.preventDefault()}
          >
            {t.label}
          </DropdownMenuRadioItem>
        ))}
      </DropdownMenuRadioGroup>

      <DropdownMenuLabel className="pb-0 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        Demo · Rubro
      </DropdownMenuLabel>
      <DropdownMenuRadioGroup
        value={pack.rubro}
        onValueChange={(v) => cambiar(pack.tipo, v)}
      >
        {RUBROS.map((r) => (
          <DropdownMenuRadioItem
            key={r.id}
            value={r.id}
            onSelect={(e) => e.preventDefault()}
          >
            {r.label}
          </DropdownMenuRadioItem>
        ))}
      </DropdownMenuRadioGroup>
      <DropdownMenuSeparator />
    </div>
  );
}
