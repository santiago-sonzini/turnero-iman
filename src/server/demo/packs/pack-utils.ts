// Utilidades compartidas de los packs de demo: PRNG determinístico, fechas
// relativas a HOY y el generador de ventas históricas (extraído y
// parametrizado desde demo-data.ts para que funcione con cualquier rubro).
import type {
  PackProducto,
  PerfilCliente,
  ProductoTriple,
  VentaDemo,
} from "./types";

// ── PRNG con semilla (mulberry32) ───────────────────────────────────────────
export function mulberry32(seed: number) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Semilla estable a partir de un string (packId). */
export function seedDe(texto: string): number {
  let h = 2166136261;
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const DIA_MS = 24 * 60 * 60 * 1000;
const hoy = () => {
  const d = new Date();
  d.setHours(11, 0, 0, 0);
  return d;
};
export const hace = (dias: number) => new Date(hoy().getTime() - dias * DIA_MS);

// ── Construcción de productos ───────────────────────────────────────────────
// Slug con el mismo esquema histórico: demo-<categoria>-<n>.
export function construirProductos(
  triples: ProductoTriple[],
  opts: { seed: number; supplierSlugs?: Set<string> },
): PackProducto[] {
  const rand = mulberry32(opts.seed);
  const entre = (min: number, max: number) => min + rand() * (max - min);
  const entero = (min: number, max: number) => Math.round(entre(min, max));

  return triples.map(([name, price, cat], i) => {
    const slug = `demo-${cat}-${i + 1}`;
    return {
      name,
      slug,
      price,
      cost: Math.round(price / 1.45 / 10) * 10, // margen ~45% sobre costo
      stock: entero(8, 60),
      categorySlug: cat,
      catalog: cat,
      supplierLinked: opts.supplierSlugs?.has(slug) ?? false,
    };
  });
}

/** Deriva la variante mayorista de un catálogo minorista: pack xN, precio×N. */
export function mayorista(
  triples: ProductoTriple[],
  multiplo = 6,
): ProductoTriple[] {
  return triples.map(([name, price, cat]) => [
    `${name} pack x${multiplo}`,
    // Precio bulk con ~8% de descuento por volumen, redondeado a $100.
    Math.round((price * multiplo * 0.92) / 100) * 100,
    cat,
  ]);
}

// ── Generador de ventas históricas ──────────────────────────────────────────
// Igual que el generarVentasDemo() original pero parametrizado: recibe los
// clientes/productos del pack y una semilla propia (mismo pack → misma demo).
export function generarVentas(
  clientes: PerfilCliente[],
  productos: PackProducto[],
  seed: number,
): VentaDemo[] {
  const rand = mulberry32(seed);
  const entre = (min: number, max: number) => min + rand() * (max - min);
  const entero = (min: number, max: number) => Math.round(entre(min, max));
  const elegir = <T,>(arr: T[]): T => arr[Math.floor(rand() * arr.length)]!;

  const indicesPorCategoria = (slugs: string[] | undefined): number[] => {
    if (!slugs?.length) return productos.map((_, i) => i);
    const idx = productos
      .map((p, i) => (slugs.includes(p.categorySlug) ? i : -1))
      .filter((i) => i >= 0);
    return idx.length ? idx : productos.map((_, i) => i);
  };

  const diasUltimaCompra = (perfil: PerfilCliente): number => {
    const c = perfil.cicloDias;
    switch (perfil.objetivo) {
      case "activo":
        return Math.max(0, Math.round(c * entre(0.2, 0.8)));
      case "riesgo":
        return Math.max(8, Math.round(c * entre(1.5, 2.2)));
      case "dormido":
        return Math.max(21, Math.round(c * entre(2.6, 4.2)));
      case "perdido":
        return Math.max(46, Math.round(c * entre(4.8, 9)));
      default:
        return entero(10, 40);
    }
  };

  const ventas: VentaDemo[] = [];
  const HISTORIA_DIAS = 270; // ~9 meses

  clientes.forEach((perfil, clienteIdx) => {
    if (perfil.objetivo === "sin-compras") {
      // El caso "una sola compra": una venta suelta hace 10-40 días.
      if (perfil.ticket > 0) {
        ventas.push({
          clienteIdx,
          fecha: hace(entero(10, 40)),
          items: [{ productoIdx: entero(0, productos.length - 1), cantidad: 1 }],
          paymentStatus: "PAID",
        });
      }
      return;
    }

    const pool = indicesPorCategoria(perfil.categorias);
    // Productos favoritos: 70% de las compras repiten estos
    const favoritos = [elegir(pool), elegir(pool), elegir(pool)];

    let dias = diasUltimaCompra(perfil);
    while (dias <= HISTORIA_DIAS) {
      const nItems = entero(2, 4);
      const items: VentaDemo["items"] = [];
      const usados = new Set<number>();
      for (let i = 0; i < nItems; i++) {
        const productoIdx = rand() < 0.7 ? elegir(favoritos) : elegir(pool);
        if (usados.has(productoIdx)) continue;
        usados.add(productoIdx);
        const precio = productos[productoIdx]!.price;
        const objetivoLinea = (perfil.ticket * entre(0.65, 1.3)) / nItems;
        const cantidad = Math.max(1, Math.round(objetivoLinea / precio));
        items.push({ productoIdx, cantidad });
      }
      ventas.push({
        clienteIdx,
        fecha: hace(dias),
        items,
        // Un 12% de los pedidos quedan en cuenta corriente (no pagos)
        paymentStatus: rand() < 0.12 ? "PENDING" : "PAID",
      });
      dias += Math.max(2, Math.round(perfil.cicloDias * entre(0.7, 1.3)));
    }
  });

  return ventas.sort((a, b) => a.fecha.getTime() - b.fecha.getTime());
}
