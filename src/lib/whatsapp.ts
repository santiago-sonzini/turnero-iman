// Armado de mensajes de WhatsApp con variables + links wa.me.
// Corre en el cliente (preview editable) y en el server. Nada se envía solo:
// el link abre WhatsApp con el texto listo y el usuario decide.
import { formatARS, formatFecha } from "./format";

export interface VariableInfo {
  clave: string;
  desc: string;
}

export const VARIABLES: VariableInfo[] = [
  { clave: "{nombre}", desc: "Nombre del cliente" },
  { clave: "{negocio}", desc: "Nombre de tu negocio" },
  { clave: "{dias}", desc: "Días desde su última compra" },
  { clave: "{ultima_compra}", desc: "Fecha de su última compra" },
  { clave: "{producto}", desc: "Producto elegido" },
  { clave: "{precio}", desc: "Precio del producto" },
];

// Nombres de negocio se saludan completos; personas, por el primer nombre.
const PALABRAS_NEGOCIO =
  /kiosco|almacen|almacén|super|súper|despensa|bar|restaurante|rotiser|panader|autoservicio|drugstore|market|granja|carnicer|verduler|ferreter|farmacia|libreria|librería/i;

export function primerNombre(nombre: string | null | undefined): string {
  const n = (nombre ?? "").trim();
  if (!n) return "";
  if (PALABRAS_NEGOCIO.test(n)) return n;
  return n.split(/\s+/)[0]!;
}

export interface ContextoMensaje {
  clienteNombre?: string | null;
  negocioNombre?: string | null;
  dias?: number | null;
  ultimaCompra?: Date | string | null;
  producto?: string | null;
  precio?: number | null;
}

export function armarMensaje(texto: string, ctx: ContextoMensaje): string {
  return texto
    .replaceAll("{nombre}", primerNombre(ctx.clienteNombre) || "cliente")
    .replaceAll("{negocio}", ctx.negocioNombre || "nuestro negocio")
    .replaceAll("{dias}", ctx.dias != null ? String(ctx.dias) : "unos")
    .replaceAll("{ultima_compra}", ctx.ultimaCompra ? formatFecha(ctx.ultimaCompra) : "—")
    .replaceAll("{producto}", ctx.producto || "{producto}")
    .replaceAll("{precio}", ctx.precio != null ? formatARS(ctx.precio) : "{precio}");
}

// Sin teléfono, wa.me abre el selector de contactos con el texto listo.
export function linkWhatsApp(telefono: string | null | undefined, mensaje: string): string {
  const texto = encodeURIComponent(mensaje || "");
  return telefono
    ? `https://wa.me/${telefono}?text=${texto}`
    : `https://wa.me/?text=${texto}`;
}
