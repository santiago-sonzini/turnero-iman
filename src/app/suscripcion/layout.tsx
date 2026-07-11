import { redirect } from "next/navigation";
import getUserServer from "@/lib/user";
import { MagnetLogo } from "@/components/turnos/magnet-logo";
export default async function SubscriptionLayout({children}:{children:React.ReactNode}){const user=await getUserServer();if(!user?.userDb)redirect("/auth");return <div className="booking-page"><header className="booking-brand"><MagnetLogo/><div><b>Imán Turnos</b><small>Suscripción segura con Mercado Pago</small></div></header>{children}</div>}
