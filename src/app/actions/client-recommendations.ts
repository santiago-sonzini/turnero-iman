"use server"
import { db } from "@/server/db";

import { sendEmail } from "@/lib/mailer"; // Puedes crear una helper function que use nodemailer, resend, etc.
import { clientOrderInsights } from "./client-metrics";
import { PrismaClient } from "@prisma/client";


const prisma = db;
/**
 * Genera y envía un mail con productos recomendados que tienen descuento activo
 */
export async function sendDiscountRecommendationsEmail(clientId: string) {
  try {
    const insights = await clientOrderInsights(clientId);
    console.log("🚀 ~ sendDiscountRecommendationsEmail ~ clientOrderInsights:", insights)
    const recommendedProducts = insights.summary.mostFrequentProducts;

    if (!recommendedProducts.length) throw new Error("No hay productos recomendados");

    // Buscar productos con descuento dentro de las recomendaciones
    const discountedProducts = await prisma.product.findMany({
      where: {
        name: { in: recommendedProducts.map(p => p.productName) },
        offers: {

          some: {
            isActive: true,
            startDate: { lte: new Date() },
            endDate: { gte: new Date() },

          },

        },
      },
      include: { offers: true },
    });

    if (!discountedProducts.length) throw new Error("No hay productos con descuento activo");

    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { email: true, name: true },
    });

    if (!client?.email)  throw new Error("No se encontró un cliente con el ID proporcionado");

    // Armar el contenido del mail
    const subject = `🔥 ¡Ofertas en tus productos favoritos, ${client.name || "cliente"}!`;
    const productList = discountedProducts
      .map(p => {
        const offer = p.offers[0];
        if (!offer) return null;
        const discount =
          offer.discountType === "PERCENTAGE"
            ? `${offer.discountValue}% OFF`
            : `$${offer.discountValue} de descuento`;
        return `
        <div style="margin-bottom: 16px;">
          <strong>${p.name}</strong><br/>
          <span>${discount}</span><br/>
          <img src="${p.imageUrl || ""}" alt="${p.name}" style="width: 100px; border-radius: 8px; margin-top: 6px;" />
        </div>
      `;
      })
      .join("");

    const html = `
    <div style="font-family: sans-serif;">
      <h2>💡 ${client.name || "Hola"} — tenemos algo para vos</h2>
      <p>Basado en tus pedidos anteriores, encontramos estos productos que podrían interesarte:</p>
      ${productList}
      <p style="margin-top: 20px;">No dejes pasar estas ofertas. ¡Están disponibles por tiempo limitado!</p>
    </div>
  `;

    // Enviar el email
    const response = await sendEmail({
      to: client.email,
      subject,
      html,
    });
    console.log("🚀 ~ sendDiscountRecommendationsEmail ~ response:", response)

    console.log(`✅ Email de recomendaciones enviado a ${client.email}`);
    return { status: 200, data: null }
  } catch (error: any) {
    console.log("🚀 ~ sendDiscountRecommendationsEmail ~ error:", error.message)
    return { status: 500, data: null,
      message: error?.message || "Unknown error" 
    }
  }
}
