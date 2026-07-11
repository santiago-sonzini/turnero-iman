'use client';
import { signOut } from '@/app/actions/auth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { User } from '@prisma/client';
import Link from 'next/link';
import { DemoPackSwitcher } from './demo-pack-switcher';
import type { DemoPackInfo } from '@/server/demo/packs/types';

export function UserNav({
  user,
  demoPack,
}: {
  user: User;
  // En modo demo, el header del dashboard pasa el pack activo para mostrar
  // el switcher tipo/rubro dentro del dropdown.
  demoPack?: DemoPackInfo | null;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarImage alt={user?.name ?? ''} />
            <AvatarFallback>{user.name?.[0]}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user.name}</p>
            {demoPack && (
              <p className="text-xs text-muted-foreground">
                {demoPack.tipoLabel} · {demoPack.rubroLabel}
              </p>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {demoPack && <DemoPackSwitcher pack={demoPack} />}
        <DropdownMenuItem asChild>
          <Link href="/suscripcion">Mi suscripción</Link>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => signOut()}>
          Cerrar sesión
          <DropdownMenuShortcut>⇧⌘Q</DropdownMenuShortcut>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
