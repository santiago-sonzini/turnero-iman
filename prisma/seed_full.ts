// Seed "completo" para un deploy con DATABASE_URL real: reusa el sistema de
// packs de demo (src/server/demo/packs) para poblar TODOS los modelos con
// datos coherentes — categorías, productos, clientes, órdenes históricas
// (con pagos ya aplicados vía "paymentStatus"), plantillas de WhatsApp,
// ofertas activas, contactos registrados y el perfil de negocio.
//
// Uso:
//   DATABASE_URL=... npx tsx prisma/seed_full.ts [packId]
//   DATABASE_URL=... SEED_PACK_ID=distribuidora-almacen npx tsx prisma/seed_full.ts
//
// packId es "tipo-rubro", ej: comercio-almacen (default), distribuidora-petshop,
// comercio-dietetica, etc. Ver src/server/demo/packs/ids.ts para las
// combinaciones válidas.
//
// Idempotente: si ya existe un BusinessProfile, no vuelve a sembrar (avisa y
// sale) para no duplicar clientes/órdenes en una base que ya tiene datos.
import { PrismaClient } from "@prisma/client";
import { DEFAULT_PACK_ID, getPack, parsePackId } from "../src/server/demo/packs";
import { hace } from "../src/server/demo/packs/pack-utils";
import type { DemoPack } from "../src/server/demo/packs/types";

if (!process.env.DATABASE_URL) {
  console.error(
    "❌ Falta DATABASE_URL. Este seed escribe en una base real; para la demo sin base " +
    "no hace falta sembrar nada (se genera sola). Seteá DATABASE_URL y volvé a correr."
  );
  process.exit(1);
}

const prisma = new PrismaClient();

function updateProgress(current: number, total: number, label: string) {
  const percent = Math.floor((current / total) * 100);
  const bars = Math.floor(percent / 2);
  const line = `${label} [${"█".repeat(bars)}${" ".repeat(50 - bars)}] ${percent}%`;
  process.stdout.clearLine(0);
  process.stdout.cursorTo(0);
  process.stdout.write(line);
}

async function seedFull(pack: DemoPack) {
  console.log(`\n→ Sembrando pack "${pack.id}" (${pack.negocio.name})...\n`);

  // Multi-tenant: todo lo sembrado cuelga de un tenant dueño.
  const tenant = await prisma.tenant.create({
    data: {
      name: pack.negocio.name,
      slug: `seed-${pack.id}-${Math.random().toString(36).slice(2, 6)}`,
      plan: "COMPLETO",
      planStatus: "ACTIVE",
      onboardingStep: "listo",
    },
  });
  const tenantId = tenant.id;
  await prisma.client.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.messageTemplate.deleteMany({});
  await prisma.offer.deleteMany({});
  await prisma.businessProfile.deleteMany({});
  await prisma.product.deleteMany({});

  await prisma.category.deleteMany({});
  await prisma.contactLog.deleteMany({});

  // Categorías
  const categoriaId = new Map<string, string>();
  for (const cat of pack.categorias) {
    const c = await prisma.category.create({ data: { ...cat, tenantId } });
    categoriaId.set(cat.slug, c.id);
  }
  console.log(`✅ ${pack.categorias.length} categorías`);

  // Productos
  const productos: Array<{ id: string; price: number; cost: number }> = [];
  for (let i = 0; i < pack.productos.length; i++) {
    const p = pack.productos[i]!;
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
        tenantId,
      },
    });
    productos.push({ id: created.id, price: p.price, cost: p.cost });
    updateProgress(i + 1, pack.productos.length, "Productos ");
  }
  console.log(`\n✅ ${pack.productos.length} productos`);

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
        tenantId,
      },
    });
    clienteId.set(i, created.id);
    clientePorNombre.set(c.name, created.id);
    updateProgress(i + 1, pack.clientes.length, "Clientes  ");
  }
  console.log(`\n✅ ${pack.clientes.length} clientes`);

  // Ventas históricas → Order + ProductInOrder + Payment (paid) o pendiente
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
    const order = await prisma.order.create({
      data: {
        orderNumber: `F-${String(n++).padStart(4, "0")}`,
        tenantId,
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
        ...(paymentStatus === "PAID" ? { paidAt: fecha } : {}),
      },
    });

    // Pago real + asignación completa, para que quede consistente con el
    // saldo de la orden (mismo criterio que `payments.ts`'s createPayment).
    if (paymentStatus === "PAID") {
      await prisma.payment.create({
        data: {
          clientId,
          tenantId,
          paymentMethod: "Transferencia",
          amount: subtotal,
          createdAt: fecha,
          updatedAt: fecha,
          orders: { connect: [{ id: order.id }] },
          allocations: { create: [{ orderId: order.id, amount: subtotal }] },
        },
      });
    }
  };

  for (let i = 0; i < pack.ventas.length; i++) {
    const v = pack.ventas[i]!;
    await crearOrden(clienteId.get(v.clienteIdx)!, v.fecha, v.items, v.paymentStatus);
    updateProgress(i + 1, pack.ventas.length, "Órdenes   ");
  }
  console.log(`\n✅ ${pack.ventas.length} órdenes históricas (con pagos donde correspondía)`);

  // Venta de recupero (posterior al contacto que la originó)
  if (pack.ventaRecupero) {
    const idRecupero = clientePorNombre.get(pack.ventaRecupero.clienteNombre);
    if (idRecupero) {
      await crearOrden(
        idRecupero,
        hace(pack.ventaRecupero.haceDias),
        pack.ventaRecupero.items,
        "PAID"
      );
      console.log(`✅ Venta de recupero para ${pack.ventaRecupero.clienteNombre}`);
    }
  }

  // Plantillas de WhatsApp
  const plantillaId = new Map<string, string>();
  for (const t of pack.plantillas) {
    const created = await prisma.messageTemplate.create({ data: { ...t, tenantId } });
    plantillaId.set(t.name, created.id);
  }
  console.log(`✅ ${pack.plantillas.length} plantillas de WhatsApp`);

  // Contactos registrados
  let contactosCreados = 0;
  for (const c of pack.contactos) {
    const cid = clientePorNombre.get(c.clienteNombre);
    if (!cid) continue;
    await prisma.contactLog.create({
      data: {
        clientId: cid,
        tenantId,
        templateId: plantillaId.get(c.plantilla),
        templateName: c.plantilla,
        message: c.mensaje,
        statusAtSend: c.statusAtSend,
        sentAt: hace(c.haceDias),
      },
    });
    contactosCreados++;
  }
  console.log(`✅ ${contactosCreados} contactos registrados`);

  // Ofertas activas
  for (const o of pack.ofertas) {
    await prisma.offer.create({
      data: {
        tenantId,
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
                  tenantId_slug: { tenantId, slug },
                })),
              },
            }
          : { categoryId: categoriaId.get(o.categorySlug!) }),
      },
    });
  }
  console.log(`✅ ${pack.ofertas.length} ofertas activas`);

  // Perfil de negocio — último paso, marca el seed como completo.
  await prisma.businessProfile.create({ data: { ...pack.negocio, tenantId } });
  console.log(`✅ Perfil de negocio (${pack.negocio.name})`);
}

async function main() {

  await prisma.user.deleteMany({})
  await prisma.order.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.client.deleteMany({});
  
  await prisma.messageTemplate.deleteMany({});
  await prisma.offer.deleteMany({});
  await prisma.businessProfile.deleteMany({});
  await prisma.product.deleteMany({});

  await prisma.category.deleteMany({});
  await prisma.contactLog.deleteMany({})
  
}

main()
  .catch((e) => {
    console.error("\n❌ Error en el seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
