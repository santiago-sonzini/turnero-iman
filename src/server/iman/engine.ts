// Motor Imán: clasificación de clientes según su propio ciclo de compra y
// atribución de recuperos. Portado 1:1 del prototipo (landings/iman).
//
// Funciones puras: reciben filas planas (cliente, venta, contacto) y no
// consultan la base. Ese límite es deliberado — en el futuro white-label la
// misma lógica corre sobre datos de cualquier negocio sin tocar este archivo.

export type EstadoCliente = "activo" | "riesgo" | "dormido" | "perdido";

export interface VentaRow {
  clienteId: string;
  fecha: Date;
  monto: number;
}

export interface ContactoRow {
  id: string;
  clienteId: string;
  fecha: Date;
  estadoEntonces: string;
}

export interface ClienteStats {
  ultima: Date | null;      // última compra
  dias: number | null;      // días desde la última compra
  ciclo: number;            // ciclo habitual en días (mediana de intervalos)
  cicloEstimado: boolean;   // true = poco historial, se usó el ciclo global
  compras: number;
  total: number;
  promedio: number;
  estado: EstadoCliente;
  ratio: number | null;     // dias / ciclo
}

export const CICLO_DEFECTO = 30;
export const VENTANA_RECUPERO = 60; // días post-contacto para atribuir compra

// Umbral por ratio (días sin comprar / ciclo propio) con piso en días para
// que un cliente de ciclo corto no caiga a "perdido" en dos semanas.
const UMBRALES: Array<{ estado: EstadoCliente; ratio: number; pisoDias: number }> = [
  { estado: "perdido", ratio: 4.5, pisoDias: 45 },
  { estado: "dormido", ratio: 2.4, pisoDias: 20 },
  { estado: "riesgo", ratio: 1.4, pisoDias: 7 },
];

const DIA_MS = 24 * 60 * 60 * 1000;

function mediana(nums: number[]): number | null {
  if (!nums.length) return null;
  const s = [...nums].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
}

function soloFecha(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function diasEntre(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / DIA_MS);
}

export function clasificar(dias: number | null, ciclo: number): EstadoCliente {
  if (dias == null) return "dormido"; // sin compras registradas
  const ratio = dias / ciclo;
  for (const u of UMBRALES) {
    if (ratio >= u.ratio && dias >= u.pisoDias) return u.estado;
  }
  return "activo";
}

export function calcularStats(
  clienteIds: string[],
  ventas: VentaRow[],
  hoy: Date = new Date()
): Map<string, ClienteStats> {
  // Agrupar ventas por cliente
  const porCliente = new Map<string, VentaRow[]>();
  for (const v of ventas) {
    if (!porCliente.has(v.clienteId)) porCliente.set(v.clienteId, []);
    porCliente.get(v.clienteId)!.push(v);
  }

  // Ciclo propio de cada cliente: mediana de intervalos entre días DISTINTOS
  // de compra (dos ventas el mismo día no cuentan como intervalo).
  const ciclosPropios: number[] = [];
  const cicloDe = new Map<string, number | null>();
  for (const [id, vs] of porCliente) {
    const fechas = [...new Set(vs.map((v) => soloFecha(v.fecha)))].sort();
    const intervalos: number[] = [];
    for (let i = 1; i < fechas.length; i++) {
      const d = diasEntre(new Date(fechas[i - 1]!), new Date(fechas[i]!));
      if (d > 0) intervalos.push(d);
    }
    const ciclo = mediana(intervalos);
    cicloDe.set(id, ciclo);
    if (ciclo != null) ciclosPropios.push(ciclo);
  }
  const cicloGlobal = mediana(ciclosPropios) ?? CICLO_DEFECTO;

  const stats = new Map<string, ClienteStats>();
  for (const id of clienteIds) {
    const vs = porCliente.get(id) ?? [];
    if (vs.length === 0) {
      stats.set(id, {
        ultima: null,
        dias: null,
        ciclo: cicloGlobal,
        cicloEstimado: true,
        compras: 0,
        total: 0,
        promedio: 0,
        estado: "dormido",
        ratio: null,
      });
      continue;
    }
    const ultima = vs.reduce((a, v) => (v.fecha > a ? v.fecha : a), vs[0]!.fecha);
    const dias = Math.max(0, diasEntre(ultima, hoy));
    const cicloPropio = cicloDe.get(id) ?? null;
    const ciclo = cicloPropio ?? cicloGlobal;
    const total = vs.reduce((a, v) => a + (v.monto || 0), 0);
    stats.set(id, {
      ultima,
      dias,
      ciclo: Math.round(ciclo),
      cicloEstimado: cicloPropio == null,
      compras: vs.length,
      total,
      promedio: total / vs.length,
      estado: clasificar(dias, ciclo),
      ratio: dias / ciclo,
    });
  }
  return stats;
}

// ── Recuperos ───────────────────────────────────────────────────────────────
// Regla exacta: un contacto hecho cuando el cliente NO estaba activo, seguido
// de al menos una compra dentro de los VENTANA_RECUPERO días. Se suman todas
// las compras de esa ventana.

export interface Recupero {
  clienteId: string;
  contactoId: string;
  contactoFecha: Date;
  ventaFecha: Date;
  monto: number;
}

export function calcularRecuperos(contactos: ContactoRow[], ventas: VentaRow[]) {
  const ventasPorCliente = new Map<string, VentaRow[]>();
  for (const v of ventas) {
    if (!ventasPorCliente.has(v.clienteId)) ventasPorCliente.set(v.clienteId, []);
    ventasPorCliente.get(v.clienteId)!.push(v);
  }
  for (const vs of ventasPorCliente.values()) {
    vs.sort((a, b) => a.fecha.getTime() - b.fecha.getTime());
  }

  const recuperos: Recupero[] = [];
  const porContacto = new Map<string, Recupero>();
  for (const c of contactos) {
    if (c.estadoEntonces === "activo") continue;
    const vs = ventasPorCliente.get(c.clienteId) ?? [];
    const limite = new Date(c.fecha.getTime() + VENTANA_RECUPERO * DIA_MS);
    const post = vs.filter((v) => v.fecha > c.fecha && v.fecha <= limite);
    if (post.length) {
      const r: Recupero = {
        clienteId: c.clienteId,
        contactoId: c.id,
        contactoFecha: c.fecha,
        ventaFecha: post[0]!.fecha,
        monto: post.reduce((a, v) => a + (v.monto || 0), 0),
      };
      recuperos.push(r);
      porContacto.set(c.id, r);
    }
  }
  return { recuperos, porContacto };
}

export function resumenMetricas(contactos: ContactoRow[], ventas: VentaRow[]) {
  const { recuperos, porContacto } = calcularRecuperos(contactos, ventas);
  const clientesRecuperados = new Set(recuperos.map((r) => r.clienteId));
  const montoRecuperado = recuperos.reduce((a, r) => a + r.monto, 0);

  const contactosNoActivos = contactos.filter((c) => c.estadoEntonces !== "activo");
  const clientesContactadosNoActivos = new Set(contactosNoActivos.map((c) => c.clienteId));

  return {
    recuperos,
    porContacto,
    clientesRecuperados: clientesRecuperados.size,
    montoRecuperado,
    totalContactos: contactos.length,
    clientesContactados: new Set(contactos.map((c) => c.clienteId)).size,
    tasaRecupero: clientesContactadosNoActivos.size
      ? clientesRecuperados.size / clientesContactadosNoActivos.size
      : null,
  };
}
