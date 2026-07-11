import ThemeToggle from '@/components/layout/ThemeToggle/theme-toggle';
import { cn } from '@/lib/utils';
import { MobileSidebar } from './mobile-sidebar';
import { UserNav } from './user-nav';
import Link from 'next/link';
import { User } from '@prisma/client';
import { ImanWordmark } from '@/components/iman/logo';
import { getBusinessProfile } from '@/app/actions/business';
import { getDemoPackInfo } from '@/server/demo/current';

export default async function Header({
  user,
  features,
}: {
  user: User | null;
  features?: string[];
}) {
  const [negocio, demoPack] = await Promise.all([
    getBusinessProfile(),
    getDemoPackInfo(),
  ]);
  return (
    <div className="supports-backdrop-blur:bg-background/60 fixed left-0 right-0 top-0 z-20 border-b bg-background/95 backdrop-blur">
      <nav className="flex h-16 items-center justify-between px-4">
        <div className="hidden items-center gap-3 lg:flex">
          <Link href="/dashboard">
            <ImanWordmark className="text-lg" />
          </Link>
          <span className="text-sm text-muted-foreground">
            · {negocio.name}
          </span>
        </div>
        <div className={cn('flex items-center gap-2 lg:!hidden')}>
          <MobileSidebar
            labelClientes={demoPack?.labels.clientes}
            features={features}
          />
          <Link href="/dashboard">
            <ImanWordmark className="text-base" />
          </Link>
        </div>

        <div className="flex items-center gap-2">
         { user && <UserNav user={user} demoPack={demoPack} />}
          <ThemeToggle />
        </div>
      </nav>
    </div>
  );
}
