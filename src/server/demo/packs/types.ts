// Tipos del sistema de packs de demo (tipo de negocio × rubro).
import type { DemoTipo, DemoRubro } from "./ids";

export type Objetivo = "activo" | "riesgo" | "dormido" | "perdido" | "sin-compras";

// Mismo shape que usaba demo-data.ts: es lo que hace funcionar el semáforo
// (activos / en riesgo / dormidos / perdidos) en cualquier rubro.
export interface PerfilCliente {
  name: string;
  phone: string | null;
  email?: string;
  cicloDias: number;
  ticket: number;
  objetivo: Objetivo;
  categorias?: string[];
  notas?: string;
}

export interface PackCategoria {
  name: string;
  slug: string;
}

export interface PackProducto {
  name: string;
  slug: string;
  price: number;
  cost: number;
  stock: number;
  categorySlug: string;
  catalog: string;
  supplierLinked: boolean;
}

export interface PackNegocio {
  name: string;
  phone: string;
  cuit: string;
  address: string;
  partnerToken: string | null;
  shareStockEnabled: boolean;
  sharePricelistEnabled: boolean;
  supplierUrl: string | null;
}

export interface PackPlantilla {
  name: string;
  situation: string;
  text: string;
  imageUrl?: string;
  isDefault?: boolean;
}

export interface PackContacto {
  clienteNombre: string;
  plantilla: string;
  statusAtSend: string;
  haceDias: number;
  mensaje: string;
}

export interface PackVentaRecupero {
  clienteNombre: string;
  haceDias: number;
  items: Array<{ productoIdx: number; cantidad: number }>;
}

export interface PackOferta {
  name: string;
  description: string;
  discountValue: number;
  scope: "PRODUCTS" | "CATEGORY";
  productSlugs?: string[];
  categorySlug?: string;
  dias: number;
}

export interface VentaDemo {
  clienteIdx: number;
  fecha: Date;
  items: Array<{ productoIdx: number; cantidad: number }>;
  paymentStatus: "PAID" | "PENDING";
}

export interface DemoPackLabels {
  /** Plural visible en sidebar/títulos: "Clientes" | "Comercios". */
  clientes: string;
  clienteSingular: string;
}

export interface DemoPackFeatures {
  /** Distribuidora: compartir lista de precios/stock con comercios. */
  compartirPartner: boolean;
  /** Distribuidora: márgenes/aumentos en masa sobre el catálogo. */
  margenesMasa: boolean;
  /** Comercio: conectar proveedor y actualizar precios desde su lista. */
  conexionProveedor: boolean;
}

export interface DemoPack {
  id: string;
  tipo: DemoTipo;
  rubro: DemoRubro;
  negocio: PackNegocio;
  categorias: PackCategoria[];
  productos: PackProducto[];
  clientes: PerfilCliente[];
  ventas: VentaDemo[];
  plantillas: PackPlantilla[];
  ofertas: PackOferta[];
  contactos: PackContacto[];
  ventaRecupero: PackVentaRecupero | null;
  labels: DemoPackLabels;
  features: DemoPackFeatures;
}

// Lo que consumen layouts/páginas para gates y vocabulario (sin datos pesados).
export interface DemoPackInfo {
  id: string;
  tipo: DemoTipo;
  rubro: DemoRubro;
  tipoLabel: string;
  rubroLabel: string;
  labels: DemoPackLabels;
  features: DemoPackFeatures;
}

// ── Definición por rubro (lo que autorea cada archivo en rubros/) ──────────
// Productos en forma MINORISTA [nombre, precio, catSlug]; la variante
// distribuidora se deriva con `mayorista()` salvo override explícito.
export type ProductoTriple = [string, number, string];

export interface RubroDef {
  id: DemoRubro;
  categorias: PackCategoria[];
  productos: ProductoTriple[];
  /** Override bulk explícito (p.ej. almacén conserva los packs de El Faro). */
  productosMayorista?: ProductoTriple[];
  /** Nombre/dirección del negocio según tipo. */
  negocio: Record<DemoTipo, { name: string; address: string }>;
  /** Clientes B2B (comercios que le compran a la distribuidora). */
  clientesB2B: PerfilCliente[];
  /** Ticket típico por compra de un consumidor final (variante comercio). */
  ticketPersona: number;
  /** Plantillas de WhatsApp propias del rubro (se suman a las default). */
  plantillasExtra?: PackPlantilla[];
  /** Extras opcionales. */
  ofertas?: PackOferta[];
  contactos?: Record<DemoTipo, PackContacto[]>;
  ventaRecupero?: Record<DemoTipo, PackVentaRecupero | null>;
  /** Multiplicador de pack para derivar la variante mayorista (default 6). */
  packMultiplo?: number;
  /** Escala del ciclo de compra de las personas (ropa compra más espaciado). */
  cicloFactor?: number;
  /** Slugs marcados supplierLinked (los que figuran en la pricelist demo). */
  supplierSlugs?: string[];
}
