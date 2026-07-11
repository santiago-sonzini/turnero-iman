import ThemeToggle from '@/components/layout/ThemeToggle/theme-toggle';
import { cn } from '@/lib/utils';
import { MobileSidebar } from './mobile-sidebar';
import { UserNav } from './user-nav';
import Link from 'next/link';
import CartIcon from '../features/products-list/cart-icon';
import { User } from '@prisma/client';

export default function HeaderPublic({ user }: { user: User | null }) {
  return (
    <div className="supports-backdrop-blur:bg-background/60 fixed left-0 right-0 top-0 z-20 border-b bg-background/95 backdrop-blur">
      <nav className="flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <Link
            href={'/products'}
            target="_blank"
          >
            <img
              src="/favicon.png"
              alt="Logo"
              className="h-8 w-auto"
            />
          </Link>
          <h2 className='text-xl font-semibold'>
            Productos
          </h2>
        </div>

       

        <div className="flex items-center gap-4">
          { user && <UserNav user={user} />}
          {/* <CartIcon /> */}
          <ThemeToggle />
        </div>
      </nav>
    </div>
  );
}
