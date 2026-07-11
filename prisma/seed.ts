import { db } from "@/server/db";
import seedData from "./seed_combined.json";

const { categories, products } = seedData;

function updateProgress(current: number, total: number, label: string) {
  const percent = Math.floor((current / total) * 100);
  const bars = Math.floor(percent / 2);
  const line = `${label} [${"█".repeat(bars)}${" ".repeat(50 - bars)}] ${percent}%`;
  process.stdout.clearLine(0);
  process.stdout.cursorTo(0);
  process.stdout.write(line);
}

async function main() {
  console.log(`→ UPSERTING ${categories.length} categorías...\n`);

  for (let i = 0; i < categories.length; i++) {
    const cat = categories[i];

    if (!cat?.slug || !cat.name) {
      console.error("Categoría sin slug:", cat);
      continue;
    }

    await db.category.upsert({
      where: { slug: cat.slug },
      update: {
        name: cat.name ?? null,
        description: cat.description ?? null,
        imageUrl: cat.imageUrl ?? null,
      },
      create: {
        name: cat.name,
        slug: cat.slug,
        description: cat.description ?? null,
        imageUrl: cat.imageUrl ?? null,
      },
    });
    updateProgress(i + 1, categories.length, "Categorías");
  }

  console.log("\n");

  const categoryMap = new Map(
    (await db.category.findMany({ select: { id: true, slug: true } })).map(
      (c) => [c.slug, c.id]
    )
  );

  console.log(`→ UPSERTING ${products.length} productos...\n`);

  const slugify = (text: string) =>
    text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");

  let processed = 0;
  const batchSize = 100;
  const parallel = 10;

  for (let i = 0; i < products.length; i += batchSize) {
    const batch = products.slice(i, i + batchSize);
    const chunks = [];

    for (let j = 0; j < batch.length; j += parallel) {
      const slice = batch.slice(j, j + parallel);

      chunks.push(
        Promise.all(
          slice.map((p: any) => {
            const categoryId = p.categorySlug
              ? (categoryMap.get(p.categorySlug) ?? null)
              : null;

            return db.product.upsert({
              where: { slug: p.slug ?? slugify(p.name) },
              update: {
                name: p.name,
                slug: p.slug ?? slugify(p.name ?? Math.random().toString(36).substr(2, 9)),
                description: p.description ?? null,
                price: p.price,
                cost: p.cost ?? 0,
                stock: p.stock ?? 0,
                imageUrl: p.imageUrl ?? null,
                catalog: p.catalog ?? null,
                images: p.images ?? [],
                estimatedDurationDays: p.estimatedDurationDays ?? null,
                unit: p.unit ?? null,
                unitQuantity: p.unitQuantity ?? null,
                isActive: p.isActive,
                isFeatured: p.isFeatured,
                categoryId,
              },
              create: {
                name: p.name,
                slug: p.slug ?? slugify(p.name ?? Math.random().toString(36).substr(2, 9)),
                description: p.description ?? null,
                price: p.price,
                cost: p.cost ?? 0,
                stock: p.stock ?? 0,
                imageUrl: p.imageUrl ?? null,
                catalog: p.catalog ?? null,
                images: p.images ?? [],
                estimatedDurationDays: p.estimatedDurationDays ?? null,
                unit: p.unit ?? null,
                unitQuantity: p.unitQuantity ?? null,
                isActive: p.isActive,
                isFeatured: p.isFeatured,
                categoryId,
              },
            });
          })
        )
      );
    }

    for (const c of chunks) {
      await c;
      processed += Math.min(parallel, batch.length - (processed % batchSize));
      updateProgress(processed, products.length, "Productos ");
    }
  }

  console.log("\n\n🎉 SEED COMPLETADO!");
}

main()
  .catch((e) => {
    console.error("\n❌ Error en el seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });