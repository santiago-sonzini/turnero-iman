import { db } from "@/server/db";
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";
import { resolve } from "path";
import products from "./products.json";

// --- Progress Bar ---
function updateProgress(current: number, total: number) {
  const percent = Math.floor((current / total) * 100);
  const bars = Math.floor(percent / 2);
  const line = `[${"█".repeat(bars)}${" ".repeat(50 - bars)}] ${percent}%`;
  process.stdout.clearLine(0);
  process.stdout.cursorTo(0);
  process.stdout.write(line);
}

async function main() {
  

  console.log(`→ UPSERTING ${products.length} productos...\n`);

  let processed = 0;

  // Tuneable
  const batchSize = 100;
  const parallel = 10;

  // Split in batches
  for (let i = 0; i < products.length; i += batchSize) {
    const batch = products.slice(i, i + batchSize);

    // Upserts in parallel (but limited)
    const chunks = [];

    for (let j = 0; j < batch.length; j += parallel) {
      const slice = batch.slice(j, j + parallel);

      chunks.push(
        Promise.all(
          slice.map((p: any) =>
            db.product.upsert({
              where: { slug: p.slug },
              update: {
                name: p.name,
                description: p.description ?? null,
                price: p.price,
                stock: p.stock,
                imageUrl: p.imageUrl ?? null,
                images: p.images ?? [],
                estimatedDurationDays: p.estimatedDurationDays ?? null,
                unit: p.unit ?? null,
                unitQuantity: p.unitQuantity ?? null,
                isActive: p.isActive,
                isFeatured: p.isFeatured,
                updatedAt: new Date(p.updatedAt),
              },
              create: {
                id: p.id,
                name: p.name,
                slug: p.slug,
                description: p.description ?? null,
                price: p.price,
                stock: p.stock,
                imageUrl: p.imageUrl ?? null,
                images: p.images ?? [],
                estimatedDurationDays: p.estimatedDurationDays ?? null,
                unit: p.unit ?? null,
                unitQuantity: p.unitQuantity ?? null,
                isActive: p.isActive,
                isFeatured: p.isFeatured,
                createdAt: new Date(p.createdAt),
                updatedAt: new Date(p.updatedAt),
              },
            })
          )
        )
      );
    }

    // Execute chunk batches sequentially
    for (const c of chunks) {
      await c;
      processed += Math.min(parallel, batch.length - (processed % batchSize));
      updateProgress(processed, products.length);
    }
  }

  console.log("\n\n🎉 UPSERT MASSIVO COMPLETADO!");
}

main()
  .catch((e) => {
    console.error("\n❌ Error en el seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
