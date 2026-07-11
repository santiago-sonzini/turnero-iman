'use client';
import React, { useEffect, useState } from 'react';
import { DashboardNav } from '@/components/dashboard-nav';
import { navItems } from '@/constants/data';
import { cn } from '@/lib/utils';
import { ChevronLeft } from 'lucide-react';
import { useSidebar } from '@/hooks/useSidebar';

type SidebarProps = {
  className?: string;
  /** Vocabulario del pack de demo: "Clientes" | "Comercios". */
  labelClientes?: string;
  /** Features habilitadas por el plan del tenant (ver src/server/plans.ts). */
  features?: string[];
};

export default function Sidebar({ className, labelClientes, features }: SidebarProps) {
  const { isMinimized, toggle, } = useSidebar();
  const [status, setStatus] = useState(false);

  const handleToggle = () => {
    if (status) {
      setStatus(false);
      toggle();
    } else {
      setStatus(true);
      toggle()
    }
  };

  useEffect(() => {
    if (!isMinimized) {
      setTimeout(() => {
        if (!isMinimized) {
          toggle()
          setStatus(false)
        }
      }, 5000);

    }
  }, [isMinimized]);
  return (
    <nav
      className={cn(
        `relative hidden h-screen flex-none border-r z-10 pt-20 md:block`,
        status && 'duration-500',
        !isMinimized ? 'w-72' : 'w-[72px]',
        className
      )}
    >
      <ChevronLeft
        className={cn(
          'absolute -right-3 top-20 cursor-pointer rounded-full border bg-background text-3xl text-foreground',
          isMinimized && 'rotate-180'
        )}
        onClick={handleToggle}
      />
      <div className="space-y-4 py-4">
        <div className="px-3 py-2">
          <div className="mt-3 space-y-1">
            <DashboardNav
              items={navItems
                .filter(
                  (it) => !it.feature || !features || features.includes(it.feature)
                )
                .map((it) =>
                  labelClientes && it.title === 'Clientes'
                    ? { ...it, title: labelClientes }
                    : it
                )}
            />
          </div>
        </div>
      </div>
    </nav>
  );
}
