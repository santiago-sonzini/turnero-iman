import Header from '@/components/layout/header';
import HeaderPublic from '@/components/layout/header-public';
import Sidebar from '@/components/layout/sidebar';
import getUserServer from '@/lib/user';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Administracion',
  description: 'Turnero dashboard',
};

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const res = await getUserServer();
  return (
    <div className="h-screen max-h-screen flex flex-col overflow-hidden">
      {/* Fixed Header */}
      <HeaderPublic user={res?.userDb ?? null} />


      {/* Main area (fills the rest of the screen) */}
      <div className="flex flex-1 overflow-hidden">
        {/* Fixed Sidebar */}

        {/* Scrollable main content. pt-16 reserva la altura del header fijo
            público (h-14 = 56px) + un respiro. */}
        <main className="flex-1 h-screen max-h-screen overflow-y-hidden pt-16">
          {children}
        </main>
      </div>
    </div>
  );
}
