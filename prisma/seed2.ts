import { PrismaClient, OrderStatus, PaymentStatus } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Genera órdenes con patrones realistas para testing de insights
 */
async function main() {
  console.log('🌱 Iniciando seed de órdenes...');

  // 1. Obtener clientes existentes
  const clients = await prisma.client.findMany();
  
  if (clients.length === 0) {
    console.error('❌ No hay clientes en la base de datos');
    return;
  }

  console.log(`✅ Encontrados ${clients.length} clientes`);

  // 2. Obtener productos existentes
  const products = await prisma.product.findMany({
    where: { isActive: true },
  });

  if (products.length === 0) {
    console.error('❌ No hay productos en la base de datos');
    return;
  }

  console.log(`✅ Encontrados ${products.length} productos activos`);

  // 3. Limpiar órdenes anteriores (opcional)
  await prisma.reorderAlert.deleteMany();
  await prisma.productInOrder.deleteMany();
  await prisma.order.deleteMany();
  console.log('✅ Órdenes anteriores limpiadas');

  // 4. Generar patrones de compra para cada cliente
  let orderCounter = 1000;

  for (const client of clients) {
    console.log(`\n📦 Generando órdenes para ${client.name}...`);

    // Seleccionar 3-5 productos "favoritos" para este cliente
    const favoriteProducts = selectRandomItems(products, randomInt(3, 5));
    
    // Crear órdenes de los últimos 6 meses
    const ordersToCreate = 200 // Entre 4 y 8 órdenes
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    // Calcular intervalo promedio entre compras (días)
    const avgDaysBetweenOrders = (180 / ordersToCreate) + randomInt(-5, 5);

    for (let i = 0; i < ordersToCreate; i++) {
      // Fecha de la orden (más reciente a más antigua)
      const orderDate = new Date();
      orderDate.setDate(orderDate.getDate() - Math.floor(avgDaysBetweenOrders * i));
      orderDate.setHours(randomInt(8, 20), randomInt(0, 59), 0, 0);

      // Seleccionar productos para esta orden
      // 70% de probabilidad de comprar productos favoritos
      const orderProducts: any = [];
      const numProductsInOrder = randomInt(1, 4);

      for (let j = 0; j < numProductsInOrder; j++) {
        const useFavorite = Math.random() < 0.7;
        const productPool = useFavorite ? favoriteProducts : products;
        const product = selectRandomItem(productPool);
        
        // Evitar duplicados en la misma orden
        if (!orderProducts.find((p :any)=> p.id === product?.id)) {
          orderProducts.push(product);
        }
      }

      // Crear la orden
      let subtotal = 0;
      const orderItems = orderProducts.map((product: any) => {
        if(!product) return null;
        const quantity = product.estimatedDurationDays 
          ? 1 // Productos con duración estimada: comprar 1 unidad
          : randomInt(1, 3); // Otros productos: 1-3 unidades
        
        const unitPrice = Number(product.price);
        const itemSubtotal = unitPrice * quantity;
        subtotal += itemSubtotal;

        // Calcular fecha estimada de agotamiento
        let estimatedRunOutDate = null;
        if (product.estimatedDurationDays) {
          estimatedRunOutDate = new Date(orderDate);
          estimatedRunOutDate.setDate(
            estimatedRunOutDate.getDate() + product.estimatedDurationDays
          );
        }

        return {
          quantity,
          unitPrice,
          discount: 0,
          subtotal: itemSubtotal,
          purchaseDate: orderDate,
          estimatedRunOutDate,
          hasRunOut: estimatedRunOutDate ? estimatedRunOutDate < new Date() : false,
          reorderSent: false,
          productId: product.id,
        };
      }).filter((item: any): item is NonNullable<typeof item> => item !== null);

      // Aplicar descuento aleatorio (20% de probabilidad)
      const discount = Math.random() < 0.2 ? subtotal * 0.1 : 0;
      const total = subtotal - discount;

      // Estado de la orden (90% completadas, 10% pendientes/procesando)
      const statusRandom = Math.random();
      const status: OrderStatus = statusRandom < 0.9 
        ? 'COMPLETED' 
        : statusRandom < 0.95 
          ? 'PROCESSING' 
          : 'PENDING';

      const paymentStatus: PaymentStatus = status === 'COMPLETED' 
        ? 'PAID' 
        : 'PENDING';

      await prisma.order.create({
        data: {
          orderNumber: `ORD-${orderCounter++}`,
          status,
          subtotal,
          discount,
          total,
          paymentMethod: status === 'COMPLETED' ? 'Transferencia' : null,
          paymentStatus,
          paidAt: status === 'COMPLETED' ? orderDate : null,
          createdAt: orderDate,
          updatedAt: orderDate,
          userId: client.id,
          products: {
            create: orderItems,
          },
        },
      });
    }

    console.log(`✅ ${ordersToCreate} órdenes creadas para ${client.name}`);
  }

  console.log('\n🎉 Seed completado exitosamente!');
  console.log(`📊 Total de órdenes creadas: ${orderCounter - 1000}`);
}

// Utilidades
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function selectRandomItem<T>(array: T[]): T | undefined {
  return array[Math.floor(Math.random() * array.length)];
}

function selectRandomItems<T>(array: T[], count: number): T[] {
  const shuffled = [...array].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, array.length));
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });