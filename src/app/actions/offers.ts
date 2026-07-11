"use server";
import { db } from "@/server/db";
import { Offer, PrismaClient } from "@prisma/client";
import { revalidatePath } from "next/cache";

export type ApiResponse<T = unknown> = {
  data: T | null;
  status: number;
  message: string;
};

type OfferScope = "GLOBAL" | "PRODUCTS" | "CATEGORY";
type DiscountType = "PERCENTAGE" | "FIXED_AMOUNT";

export type CreateOfferInput = {
  name: string;
  description?: string;
  discountType: DiscountType;
  discountValue: number;
  imageUrl?: string;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  minPurchaseAmount?: number;
  maxUses?: number;
  scope: OfferScope;
  // scope === "PRODUCTS"
  productIds?: string[];
  // scope === "CATEGORY"
  categoryId?: string;
};

export async function getAllActiveOffersAction(): Promise<Offer[]> {
  const date = new Date();
  const startDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0);
  const endDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 0);
  try {
    const offers = await db.offer.findMany({
      where: { isActive: true},
      include: {
        products: true,
        category: true,
      },
    });
    return offers;
  } catch (error) {
    console.error("Error getting all active offers:", error);
    return [];
  }
}


export async function createOfferAction(
  input: CreateOfferInput
): Promise<ApiResponse> {
  console.log("🚀 ~ createOfferAction ~ input:", input);

  try {
    const {
      name,
      description,
      discountType,
      discountValue,
      imageUrl,
      startDate,
      endDate,
      isActive,
      minPurchaseAmount,
      maxUses,
      scope,
      productIds,
      categoryId,
    } = input;

    const offer = await db.offer.create({
      data: {
        name,
        description,
        discountType,
        discountValue,
        imageUrl,
        startDate,
        endDate,
        isActive,
        minPurchaseAmount,
        maxUses,
        scope,
        // Solo conecta productos si scope === PRODUCTS y hay IDs
        ...(scope === "PRODUCTS" &&
          productIds?.length && {
            products: {
              connect: productIds.map((id) => ({ id })),
            },
          }),
        // Solo conecta categoría si scope === CATEGORY
        ...(scope === "CATEGORY" &&
          categoryId && {
            category: {
              connect: { id: categoryId },
            },
          }),
      },
      include: {
        products: true,
        category: true,
      },
    });

    console.log("🚀 ~ createOfferAction ~ offer:", offer);

    revalidatePath("/ofertas");
    revalidatePath("/");

    return {
      data: offer,
      status: 200,
      message: "Oferta creada correctamente",
    };
  } catch (error) {
    console.error("Error creando la oferta:", error);
    return {
      data: null,
      status: 500,
      message: "No se pudo crear la oferta",
    };
  }
}