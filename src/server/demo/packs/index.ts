// Registro de packs de demo: compone tipo × rubro en un DemoPack completo
// (negocio, catálogo, clientes, ventas históricas, plantillas, features).
import { DEFAULT_PLANTILLAS } from "@/server/iman/default-templates";
import {
  DEFAULT_PACK_ID,
  RUBROS,
  TIPOS,
  parsePackId,
  type DemoRubro,
  type DemoTipo,
} from "./ids";
import {
  construirProductos,
  generarVentas,
  mayorista,
  seedDe,
} from "./pack-utils";
import { personasParaRubro } from "./personas";
import type { DemoPack, DemoPackInfo, RubroDef } from "./types";

import almacen from "./rubros/almacen";
import dietetica from "./rubros/dietetica";
import limpieza from "./rubros/limpieza";
import petshop from "./rubros/petshop";
import ropa from "./rubros/ropa";

export { DEFAULT_PACK_ID, RUBROS, TIPOS, parsePackId };

const RUBRO_DEFS: Record<DemoRubro, RubroDef> = {
  almacen,
  dietetica,
  ropa,
  limpieza,
  petshop,
};

// Datos "fijos" del negocio demo (los variables salen del rubro).
const TELEFONO_DEMO = "5491155500000";
const CUIT_DEMO = "30-71234567-8";

function construirPack(tipo: DemoTipo, rubro: DemoRubro): DemoPack {
  const def = RUBRO_DEFS[rubro];
  const id = `${tipo}-${rubro}`;
  const seed = seedDe(id);

  const triples =
    tipo === "distribuidora"
      ? def.productosMayorista ?? mayorista(def.productos, def.packMultiplo)
      : def.productos;

  const productos = construirProductos(triples, {
    seed,
    supplierSlugs: new Set(def.supplierSlugs ?? []),
  });

  const clientes =
    tipo === "distribuidora"
      ? def.clientesB2B
      : personasParaRubro(
          def.ticketPersona,
          def.categorias.map((c) => c.slug),
          def.cicloFactor,
        );

  const ventas = generarVentas(clientes, productos, seed + 1);

  const esDistribuidora = tipo === "distribuidora";

  return {
    id,
    tipo,
    rubro,
    negocio: {
      name: def.negocio[tipo].name,
      address: def.negocio[tipo].address,
      phone: TELEFONO_DEMO,
      cuit: CUIT_DEMO,
      partnerToken: esDistribuidora ? `demo-partner-${rubro}` : null,
      shareStockEnabled: esDistribuidora,
      sharePricelistEnabled: esDistribuidora,
      supplierUrl: esDistribuidora ? null : `/demo/pricelist-${rubro}.json`,
    },
    categorias: def.categorias,
    productos,
    clientes,
    ventas,
    plantillas: [...DEFAULT_PLANTILLAS, ...(def.plantillasExtra ?? [])],
    ofertas: def.ofertas ?? [],
    contactos: def.contactos?.[tipo] ?? [],
    ventaRecupero: def.ventaRecupero?.[tipo] ?? null,
    labels: esDistribuidora
      ? { clientes: "Comercios", clienteSingular: "comercio" }
      : { clientes: "Clientes", clienteSingular: "cliente" },
    features: {
      compartirPartner: esDistribuidora,
      margenesMasa: esDistribuidora,
      conexionProveedor: !esDistribuidora,
    },
  };
}

const packCache = new Map<string, DemoPack>();

/** Pack por id ("tipo-rubro"); ids inválidos caen al default. */
export function getPack(packId: string): DemoPack {
  const parsed = parsePackId(packId) ?? parsePackId(DEFAULT_PACK_ID)!;
  const id = `${parsed.tipo}-${parsed.rubro}`;
  let pack = packCache.get(id);
  if (!pack) {
    pack = construirPack(parsed.tipo, parsed.rubro);
    packCache.set(id, pack);
  }
  return pack;
}

/** Info liviana para layouts/páginas (gates + vocabulario, sin seeds). */
export function packInfoDe(packId: string): DemoPackInfo {
  const pack = getPack(packId);
  return {
    id: pack.id,
    tipo: pack.tipo,
    rubro: pack.rubro,
    tipoLabel: TIPOS.find((t) => t.id === pack.tipo)?.label ?? pack.tipo,
    rubroLabel: RUBROS.find((r) => r.id === pack.rubro)?.label ?? pack.rubro,
    labels: pack.labels,
    features: pack.features,
  };
}
