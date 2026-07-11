'use client';
import { DashboardNav } from '@/components/dashboard-nav';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { navItems } from '@/constants/data';
import { MenuIcon } from 'lucide-react';
import { useState } from 'react';

// import { Playlist } from "../data/playlists";

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Vocabulario del pack de demo: "Clientes" | "Comercios". */
  labelClientes?: string;
  /** Features habilitadas por el plan del tenant (ver src/server/plans.ts). */
  features?: string[];
}

export function MobileSidebar({ className, labelClientes, features }: SidebarProps) {
  const [open, setOpen] = useState(false);
  const items = navItems
    .filter((it) => !it.feature || !features || features.includes(it.feature))
    .map((it) =>
      labelClientes && it.title === 'Clientes' ? { ...it, title: labelClientes } : it
    );
  return (
    <>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <MenuIcon />
        </SheetTrigger>
        <SheetContent side="left" className="!px-0">
          <div className="space-y-4 py-4">
            <div className="px-3 py-2">
              <h2 className="mb-2 px-4 text-lg font-semibold text-primary tracking-tight">
                Imán
              </h2>
              <div className="space-y-1">
                <DashboardNav
                  items={items}
                  isMobileNav={true}
                  setOpen={setOpen}
                />
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
