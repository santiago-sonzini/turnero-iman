'use server'
import { db } from "@/server/db";
import { Category } from "@prisma/client";

export async function getAllCategoriesAction(): Promise<Category[]> {
    const categories = await db.category.findMany({
        
    });

    return categories;
}   