// Modo demo: Postgres embebido (PGlite) + seed del pack activo (tipo×rubro).
// Se usa cuando no hay DATABASE_URL. Cada pack tiene su propia instancia:
//  - Local: persiste en .pglite-demos/<packId>/ (el pack distribuidora-almacen
//    reusa el legado .pglite-demo/ si existe). Se borra con `npm run demo:reset`.
//  - Efímero (deploy / DEMO_EPHEMERAL=1): PGlite en MEMORIA, sembrado al vuelo
//    desde la data estática del repo; nada persiste entre instancias.
// Un deploy real solo setea DATABASE_URL y este módulo no se toca — este
// límite es también el gancho white-label: la fuente de datos se decide en un
// solo lugar.
import { PrismaClient } from "@prisma/client";
import { existsSync, mkdirSync, readFileSync } from "fs";
import path from "path";
import type { PGlite } from "@electric-sql/pglite";
import { env } from "@/env";
import { getPack } from "./packs";
import { DEMO_TENANT_ID } from "./packs/ids";
import { hace } from "./packs/pack-utils";
import type { DemoPack } from "./packs/types";

const EPHEMERAL = !!process.env.VERCEL || env.DEMO_EPHEMERAL === "1";

// PGlite vivo por pack (para poder cerrarlo en la evicción del modo efímero).
const instancias = new Map<string, PGlite>();

export async function cerrarPack(packId: string) {
  const pg = instancias.get(packId);
  if (!pg) return;
  instancias.delete(packId);
  try {
    await pg.close();
  } catch {
    /* ya cerrado */
  }
}

function dataDirDe(packId: string): string {
  // v2 = schema multi-tenant (tenantId en todas las tablas). Los directorios
  // viejos (.pglite-demo / .pglite-demos) quedan ignorados: schema incompatible;
  // `npm run demo:reset` los borra.
  const base = path.join(process.cwd(), ".pglite-demos-v2");
  mkdirSync(base, { recursive: true });
  return path.join(base, packId);
}

export async function createDemoPrismaById(packId: string): Promise<PrismaClient> {
  const pack = getPack(packId);

  // Imports dinámicos: solo se cargan en modo demo
  const { PGlite } = await import("@electric-sql/pglite");
  const { PrismaPGlite } = await import("pglite-prisma-adapter");

  const pglite = EPHEMERAL ? new PGlite() : new PGlite(dataDirDe(pack.id));
  await pglite.waitReady;
  instancias.set(pack.id, pglite);

  // Aplicar el schema si la base está vacía
  const tables = await pglite.query<{ count: number }>(
    "SELECT count(*)::int AS count FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Client'"
  );
  if (!tables.rows[0] || Number(tables.rows[0].count) === 0) {
    const ddl = readFileSync(path.join(process.cwd(), "prisma", "demo-init.sql"), "utf8");
    await pglite.exec(ddl);
  }

  // Auto-sanación: si quedaron asignaciones huérfanas (de un pago borrado sin
  // cascade de FK), recalculamos SOLO esas órdenes desde sus asignaciones
  // válidas y luego eliminamos las huérfanas. Las órdenes sin asignaciones
  // (pagos del seed) no se tocan. Es idempotente: tras limpiar no matchea nada.
  await pglite.exec(`
    UPDATE "Order" o SET
      "percentageofPayment" = LEAST(100, COALESCE((
        SELECT SUM(a.amount) FROM "PaymentAllocation" a
        WHERE a."orderId" = o.id AND a."paymentId" IN (SELECT id FROM "Payment")
      ), 0) / NULLIF(o.total, 0) * 100),
      "paymentStatus" = CASE WHEN COALESCE((
        SELECT SUM(a.amount) FROM "PaymentAllocation" a
        WHERE a."orderId" = o.id AND a."paymentId" IN (SELECT id FROM "Payment")
      ), 0) >= o.total THEN 'PAID'::"PaymentStatus" ELSE 'PENDING'::"PaymentStatus" END,
      "paidAt" = CASE WHEN COALESCE((
        SELECT SUM(a.amount) FROM "PaymentAllocation" a
        WHERE a."orderId" = o.id AND a."paymentId" IN (SELECT id FROM "Payment")
      ), 0) >= o.total THEN NOW() ELSE NULL END
    WHERE o.id IN (
      SELECT DISTINCT "orderId" FROM "PaymentAllocation"
      WHERE "paymentId" NOT IN (SELECT id FROM "Payment")
    );
    DELETE FROM "PaymentAllocation" WHERE "paymentId" NOT IN (SELECT id FROM "Payment");
  `);

  const adapter = new PrismaPGlite(pglite);
  const prisma = new PrismaClient({ adapter } as any);

  // BusinessProfile se crea al FINAL del seed: si hay datos sin perfil, un
  // seed anterior quedó cortado a la mitad → limpiar y volver a cargar.
  const [clientCount, perfilCount] = await Promise.all([
    prisma.client.count(),
    prisma.businessProfile.count(),
  ]);
  if (clientCount > 0 && perfilCount === 0) {
    console.log(`[demo:${pack.id}] Seed anterior incompleto: limpiando…`);
    await limpiarDemo(prisma);
  }
  if (clientCount === 0 || perfilCount === 0) {
    console.log(`[demo:${pack.id}] Base vacía: cargando datos de`, pack.negocio.name, "…");
    await seedDemo(prisma, pack);
    if (!EPHEMERAL) {
      // Forzar que el seed llegue al disco: sin esto PGlite puede quedarse en
      // memoria y un kill del server (o un reinicio del worker de Next) pierde
      // todo y deja estados a medias.
      await pglite.exec("CHECKPOINT");
    }
    console.log(`[demo:${pack.id}] Datos de demo listos.`);
  }

  if (!EPHEMERAL) {
    // Cierre prolijo para que los últimos escritos queden persistidos
    const cerrar = async () => {
      try {
        await pglite.exec("CHECKPOINT");
        await pglite.close();
      } catch {
        /* ya cerrado */
      }
    };
    process.once("SIGTERM", cerrar);
    process.once("SIGINT", cerrar);
  }

  // Plantillas del pack faltantes en demos ya creadas (p.ej. el legado que no
  // tenía "Promo 2x1"): se agregan sin duplicar.
  for (const t of pack.plantillas) {
    const existe = await prisma.messageTemplate.findFirst({ where: { name: t.name } });
    if (!existe)
      await prisma.messageTemplate.create({
        data: { ...t, tenantId: DEMO_TENANT_ID },
      });
  }

  return prisma;
}

async function limpiarDemo(prisma: PrismaClient) {
  await prisma.contactLog.deleteMany({});
  await prisma.messageTemplate.deleteMany({});
  await prisma.productInOrder.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.offer.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.category.deleteMany({});
  await prisma.client.deleteMany({});
  await prisma.businessProfile.deleteMany({});
  await prisma.funnelEvent.deleteMany({});
  await prisma.tenant.deleteMany({});
}

async function seedDemo(prisma: PrismaClient, pack: DemoPack) {
  // El tenant demo: cada pack PGlite es una base aislada con un solo negocio,
  // con plan COMPLETO activo para que la demo muestre todo.
  await prisma.tenant.upsert({
    where: { id: DEMO_TENANT_ID },
    update: {},
    create: {
      id: DEMO_TENANT_ID,
      name: pack.negocio.name,
      slug: "demo",
      plan: "COMPLETO",
      planStatus: "ACTIVE",
      onboardingStep: "listo",
    },
  });

  // Categorías
  const categoriaId = new Map<string, string>();
  for (const cat of pack.categorias) {
    const c = await prisma.category.create({
      data: { ...cat, tenantId: DEMO_TENANT_ID },
    });
    categoriaId.set(cat.slug, c.id);
  }

  // Productos
  const productos: Array<{ id: string; price: number; cost: number }> = [];
  for (const p of pack.productos) {
    const created = await prisma.product.create({
      data: {
        name: p.name,
        slug: p.slug,
        price: p.price,
        cost: p.cost,
        stock: p.stock,
        catalog: p.catalog,
        images: [],
        supplierLinked: p.supplierLinked,
        categoryId: categoriaId.get(p.categorySlug),
        tenantId: DEMO_TENANT_ID,
      },
    });
    productos.push({ id: created.id, price: p.price, cost: p.cost });
  }

  // Clientes
  const clienteId = new Map<number, string>();
  const clientePorNombre = new Map<string, string>();
  for (let i = 0; i < pack.clientes.length; i++) {
    const c = pack.clientes[i]!;
    const created = await prisma.client.create({
      data: {
        name: c.name,
        phone: c.phone,
        email: c.email,
        notes: c.notas,
        tenantId: DEMO_TENANT_ID,
      },
    });
    clienteId.set(i, created.id);
    clientePorNombre.set(c.name, created.id);
  }

  // Ventas históricas
  let n = 1;
  const crearOrden = async (
    clientId: string,
    fecha: Date,
    items: Array<{ productoIdx: number; cantidad: number }>,
    paymentStatus: "PAID" | "PENDING"
  ) => {
    const lineas = items.map((it, idx) => {
      const prod = productos[it.productoIdx]!;
      const subtotal = it.cantidad * prod.price;
      return {
        productId: prod.id,
        quantity: it.cantidad,
        unitPrice: prod.price,
        subtotal,
        costAtPurchase: prod.cost,
        profit: subtotal - it.cantidad * prod.cost,
        purchaseDate: fecha,
        index: idx + 1,
      };
    });
    const subtotal = lineas.reduce((a, l) => a + l.subtotal, 0);
    const profit = lineas.reduce((a, l) => a + l.profit, 0);
    await prisma.order.create({
      data: {
        orderNumber: `F-DEMO-${String(n++).padStart(4, "0")}`,
        tenantId: DEMO_TENANT_ID,
        userId: clientId,
        status: "COMPLETED",
        paymentStatus,
        percentageofPayment: paymentStatus === "PAID" ? 100 : 0,
        subtotal,
        discount: 0,
        total: subtotal,
        profit,
        createdAt: fecha,
        updatedAt: fecha,
        products: { create: lineas },
      },
    });
  };

  for (const v of pack.ventas) {
    await crearOrden(clienteId.get(v.clienteIdx)!, v.fecha, v.items, v.paymentStatus);
  }

  // Venta de recupero (después del contacto registrado más abajo)
  if (pack.ventaRecupero) {
    const idRecupero = clientePorNombre.get(pack.ventaRecupero.clienteNombre);
    if (idRecupero) {
      await crearOrden(
        idRecupero,
        hace(pack.ventaRecupero.haceDias),
        pack.ventaRecupero.items,
        "PAID"
      );
    }
  }

  // Plantillas
  const plantillaId = new Map<string, string>();
  for (const t of pack.plantillas) {
    const created = await prisma.messageTemplate.create({
      data: { ...t, tenantId: DEMO_TENANT_ID },
    });
    plantillaId.set(t.name, created.id);
  }

  // Contactos registrados
  for (const c of pack.contactos) {
    const cid = clientePorNombre.get(c.clienteNombre);
    if (!cid) continue;
    await prisma.contactLog.create({
      data: {
        clientId: cid,
        templateId: plantillaId.get(c.plantilla),
        templateName: c.plantilla,
        message: c.mensaje,
        statusAtSend: c.statusAtSend,
        sentAt: hace(c.haceDias),
        tenantId: DEMO_TENANT_ID,
      },
    });
  }

  // Ofertas activas
  for (const o of pack.ofertas) {
    await prisma.offer.create({
      data: {
        tenantId: DEMO_TENANT_ID,
        name: o.name,
        description: o.description,
        discountType: "PERCENTAGE",
        discountValue: o.discountValue,
        startDate: hace(2),
        endDate: hace(-o.dias),
        isActive: true,
        scope: o.scope,
        ...(o.scope === "PRODUCTS"
          ? {
              products: {
                connect: (o.productSlugs ?? []).map((slug) => ({
                  tenantId_slug: { tenantId: DEMO_TENANT_ID, slug },
                })),
              },
            }
          : { categoryId: categoriaId.get(o.categorySlug!) }),
      },
    });
  }

  // Último paso = marcador de que el seed terminó entero
  await prisma.businessProfile.create({
    data: { ...pack.negocio, tenantId: DEMO_TENANT_ID },
  });
}
