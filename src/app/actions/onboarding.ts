"use server";
// Flujo de onboarding: valor ANTES del precio. Cada paso persiste en
// tenant.onboardingStep (retomable) y emite un FunnelEvent (medible).
import { db } from "@/server/db";
import { getCurrentTenant } from "@/server/tenant-context";
import { track } from "@/server/track";
import { importarVentas, getClientesSemaforo, type FilaImport } from "./iman";
import { getBusinessProfile } from "./business";
import { armarMensaje, linkWhatsApp, primerNombre } from "@/lib/whatsapp";

export type PasoOnboarding = "importar" | "revelacion" | "plan" | "listo";

export async function marcarPaso(paso: PasoOnboarding): Promise<void> {
  const tenant = await getCurrentTenant();
  await db.tenant.update({
    where: { id: tenant.id },
    data: { onboardingStep: paso },
  });
}

/** Import del onboarding: importa, marca el paso y registra el evento. */
export async function importarVentasOnboarding(filas: FilaImport[]) {
  const res = await importarVentas(filas);
  if (res.status === 200) {
    await track("datos_importados", {
      filas: filas.length,
      errores: res.errores?.length ?? 0,
    });
    await marcarPaso("revelacion");
  }
  return res;
}

// Datos de ejemplo para el que quiere mirar antes de subir lo suyo. El camino
// principal es la data real; esto es el "skippable-friendly".
export async function usarDatosEjemplo() {
  const hoy = Date.now();
  const dia = 86_400_000;
  const f = (haceDias: number) => {
    const d = new Date(hoy - haceDias * dia);
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
  };
  const filas: FilaImport[] = [
    // Activos: compran seguido
    { cliente: "Kiosco La Esquina", fecha: f(6), monto: 48_000 },
    { cliente: "Kiosco La Esquina", fecha: f(20), monto: 51_500 },
    { cliente: "Kiosco La Esquina", fecha: f(34), monto: 45_000 },
    { cliente: "Almacén Don Cacho", fecha: f(3), monto: 112_500 },
    { cliente: "Almacén Don Cacho", fecha: f(17), monto: 98_000 },
    { cliente: "Almacén Don Cacho", fecha: f(31), monto: 120_000 },
    { cliente: "Despensa Mari", fecha: f(9), monto: 36_000 },
    { cliente: "Despensa Mari", fecha: f(23), monto: 33_500 },
    // En riesgo: se están enfriando
    { cliente: "Súper El Trébol", fecha: f(38), monto: 154_000 },
    { cliente: "Súper El Trébol", fecha: f(52), monto: 149_000 },
    { cliente: "Súper El Trébol", fecha: f(66), monto: 160_000 },
    { cliente: "Granja San José", fecha: f(41), monto: 87_000 },
    { cliente: "Granja San José", fecha: f(62), monto: 92_000 },
    // Dormidos
    { cliente: "Bar La Estación", fecha: f(75), monto: 66_000 },
    { cliente: "Bar La Estación", fecha: f(95), monto: 71_000 },
    { cliente: "Rotisería Norte", fecha: f(88), monto: 54_000 },
    { cliente: "Rotisería Norte", fecha: f(110), monto: 49_000 },
    // Perdidos
    { cliente: "Panadería Central", fecha: f(140), monto: 44_000 },
    { cliente: "Panadería Central", fecha: f(170), monto: 39_000 },
    { cliente: "Ferretería Ruiz", fecha: f(160), monto: 128_000 },
  ];
  const res = await importarVentas(filas);
  if (res.status === 200) {
    await track("datos_ejemplo_usados", { filas: filas.length });
    await marcarPaso("revelacion");
  }
  return res;
}

export interface Revelacion {
  totalClientes: number;
  activos: number;
  enRiesgo: number;
  dormidos: number;
  perdidos: number;
  /** plata que representan los clientes que se están yendo */
  plataEnJuego: number;
  topClientes: Array<{ name: string; total: number; compras: number }>;
  /** primer mensaje listo para mandar */
  whatsapp: {
    cliente: string;
    estado: string;
    dias: number | null;
    mensaje: string;
    link: string | null;
  } | null;
}

/**
 * El "aha": corre el motor sobre los datos recién importados y arma el
 * resultado que se muestra ANTES de la pantalla de precios.
 */
export async function getRevelacion(): Promise<Revelacion> {
  const [clientes, negocio, tenant] = await Promise.all([
    getClientesSemaforo(),
    getBusinessProfile(),
    getCurrentTenant(),
  ]);

  const por = (e: string) => clientes.filter((c) => c.estado === e);
  const enRiesgo = por("riesgo");
  const dormidos = por("dormido");
  const perdidos = por("perdido");

  // Plata en juego: total histórico de los clientes no-activos con historia.
  const plataEnJuego = [...enRiesgo, ...dormidos]
    .reduce((a, c) => a + c.total, 0);

  const topClientes = [...clientes]
    .sort((a, b) => b.total - a.total)
    .slice(0, 10)
    .map((c) => ({ name: c.name, total: c.total, compras: c.compras }));

  // Primer WhatsApp listo: el cliente en riesgo/dormido con más historia.
  const candidato =
    [...enRiesgo, ...dormidos].sort((a, b) => b.total - a.total)[0] ?? null;
  let whatsapp: Revelacion["whatsapp"] = null;
  if (candidato) {
    const texto = armarMensaje(
      "Hola {nombre}! Te escribo de {negocio}. Hace {dias} días que no nos hacés un pedido y no queríamos que te quedes sin nada 😊 ¿Te armo el pedido de siempre?",
      {
        clienteNombre: primerNombre(candidato.name),
        negocioNombre: negocio.name,
        dias: candidato.dias,
      }
    );
    whatsapp = {
      cliente: candidato.name,
      estado: candidato.estado,
      dias: candidato.dias,
      mensaje: texto,
      link: candidato.phone ? linkWhatsApp(candidato.phone, texto) : null,
    };
  }

  const revelacion: Revelacion = {
    totalClientes: clientes.length,
    activos: por("activo").length,
    enRiesgo: enRiesgo.length,
    dormidos: dormidos.length,
    perdidos: perdidos.length,
    plataEnJuego,
    topClientes,
    whatsapp,
  };

  // Snapshot para la pantalla de precios (recomendación contextual) y para
  // no duplicar el evento si recarga.
  if (!tenant.revealSnapshot) {
    await track("resultado_revelado", {
      enRiesgo: revelacion.enRiesgo,
      dormidos: revelacion.dormidos,
      clientes: revelacion.totalClientes,
    });
  }
  await db.tenant.update({
    where: { id: tenant.id },
    data: {
      revealSnapshot: revelacion as any,
      onboardingStep: "revelacion",
    },
  });

  return revelacion;
}
