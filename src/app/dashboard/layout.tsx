import Header from '@/components/layout/header';
import Sidebar from '@/components/layout/sidebar';
import getUserServer from '@/lib/user';
import { ThemeAccent } from '@/components/iman/theme-accent';
import { SubscriptionBanner } from '@/components/layout/subscription-banner';
import { getDemoPackInfo } from '@/server/demo/current';
import { getCurrentTenant } from '@/server/tenant-context';
import { accesoDe, PLANES } from '@/server/plans';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Administracion',
  description: 'Turnero dashboard',
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const res = await getUserServer();
  if (res?.userDb?.role !== "ADMIN") {
    redirect("/auth");
  }

  // ── Gate de suscripción ───────────────────────────────────────────────────
  // onboarding sin terminar → al onboarding; bloqueado (trial vencido, pago
  // caído fuera de gracia, cancelado) → a /suscripcion. Los datos no se tocan.
  const tenant = await getCurrentTenant();
  const acceso = accesoDe(tenant);
  if (acceso.estado === "onboarding") redirect("/onboarding");
  if (acceso.estado === "bloqueado") redirect("/suscripcion");

  // Features del plan → el sidebar esconde lo que el plan no incluye.
  const features = tenant.plan
    ? [...PLANES[tenant.plan].features, ...(tenant.addons ?? [])]
    : [];

  const demoPack = await getDemoPackInfo();
  const conBanner =
    acceso.estado === "gracia" ||
    (acceso.estado === "pleno" && acceso.diasTrial != null);

  return (
    <div className="h-screen max-h-screen flex flex-col overflow-hidden">
      <ThemeAccent />
      {/* Fixed Header */}
      <Header user={res.userDb} features={features} />
      <SubscriptionBanner acceso={acceso as any} />

      {/* Main area (fills the rest of the screen) */}
      <div className="flex flex-1 overflow-hidden">
        {/* Fixed Sidebar */}
        <Sidebar labelClientes={demoPack?.labels.clientes} features={features} />

        {/* Scrollable main content. pt-20 reserva la altura del header fijo
            (h-16 = 64px) + un respiro, así ninguna página queda tapada. */}
        <main
          className={`flex-1 h-screen max-h-screen overflow-y-hidden px-8 pb-8 ${conBanner ? 'pt-28' : 'pt-20'}`}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
