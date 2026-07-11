"use client";

import React, { useState, useEffect } from "react";
import {
  Download,
  Package,
  User,
  Calendar,
  CreditCard,
  FileText,
  CheckCircle,
  Clock,
  XCircle,
} from "lucide-react";
import { OrderWithDetails } from "@/app/actions/orders";
import Link from "next/link";

// Types
type OrderStatus =
  | "PENDING"
  | "PROCESSING"
  | "COMPLETED"
  | "CANCELLED"
  | "REFUNDED";
type PaymentStatus = "PENDING" | "PAID" | "FAILED" | "REFUNDED";
type DiscountType = "PERCENTAGE" | "FIXED_AMOUNT";

interface Client {
  id: string;
  name: string;
  email: string | null;
  phone: string;
  adress: string | null;
}

interface Product {
  id: string;
  name: string;
  imageUrl: string | null;
}

interface Offer {
  id: string;
  name: string;
  discountType: DiscountType;
  discountValue: number;
}

interface ProductInOrder {
  id: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  subtotal: number;
  product: Product;
}

interface Order {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: string | null;
  paymentStatus: PaymentStatus;
  paidAt: string | null;
  notes: string | null;
  createdAt: string;
  client: Client;
  offer: Offer | null;
  products: ProductInOrder[];
}

const OrderDetailPage = ({ order: OrderProp }: { order: OrderWithDetails }) => {
  console.log("🚀 ~ OrderDetailPage ~ order:", OrderProp);
  const [order, setOrder] = useState<OrderWithDetails>(OrderProp);
  const [loading, setLoading] = useState(false);

  const getStatusIcon = (status: OrderStatus) => {
    switch (status) {
      case "COMPLETED":
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case "PROCESSING":
        return <Clock className="h-5 w-5 text-blue-600" />;
      case "PENDING":
        return <Clock className="h-5 w-5 text-yellow-600" />;
      case "CANCELLED":
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return <Clock className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case "COMPLETED":
        return "bg-green-100 text-green-800";
      case "PROCESSING":
        return "bg-blue-100 text-blue-800";
      case "PENDING":
        return "bg-yellow-100 text-yellow-800";
      case "CANCELLED":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const generatePDF = () => {
    // Create a new window with the invoice
    const invoiceWindow = window.open("", "_blank");

    const invoiceHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Factura - ${order.orderNumber}</title>
         <style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { 
    font-family: 'Arial', sans-serif; 
    padding: 40px;
    color: #333;
    background: white;
  }

  .invoice-container { 
    max-width: 850px; 
    margin: 0 auto; 
  }

  /* HEADER */
  .header { 
    display: flex; 
    justify-content: space-between; 
    align-items: flex-start;
    margin-bottom: 40px;
    padding-bottom: 24px;
    border-bottom: 3px solid #2563eb;
  }

  .company-info h1 { 
    font-size: 30px; 
    color: #2563eb;
    margin-bottom: 6px;
  }

  .company-info p { 
    color: #666; 
    font-size: 14px;
    line-height: 1.6;
  }

  .invoice-info { text-align: right; }

  .invoice-info h2 { 
    font-size: 34px; 
    color: #111;
    margin-bottom: 12px;
  }

  .invoice-info p { 
    color: #555; 
    font-size: 14px;
    margin: 4px 0;
  }

  .status-badge {
    display: inline-block;
    padding: 6px 16px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 600;
    background: #dcfce7;
    color: #16a34a;
    margin-top: 10px;
  }

  /* DETAILS STACKED */
  .details-section { 
    display: flex;
    flex-direction: column;
    gap: 20px;
    margin: 40px 0;
  }

  .detail-box {
    background: #ffffff;
    padding: 22px;
    border-radius: 10px;
    border: 1px solid #e5e7eb;
    box-shadow: 0 1px 3px rgba(0,0,0,0.06);
  }

  .detail-box h3 { 
    font-size: 13px;
    color: #6b7280;
    text-transform: uppercase;
    letter-spacing: 0.6px;
    margin-bottom: 15px;
  }

  .detail-box p { 
    margin: 6px 0;
    font-size: 14px;
  }

  .detail-box strong { color: #111827; }

  /* TABLE */
  table { 
    width: 100%; 
    border-collapse: collapse;
    margin-top: 20px;
    border-radius: 10px;
    overflow: hidden;
  }

  thead { background: #f3f4f6; }

  th { 
    padding: 14px;
    text-align: left;
    font-size: 12px;
    font-weight: 600;
    color: #374151;
    text-transform: uppercase;
    border-bottom: 2px solid #e5e7eb;
  }

  td { 
    padding: 14px;
    border-bottom: 1px solid #e5e7eb;
    font-size: 14px;
  }

  tbody tr:hover { background: #f9fafb; }

  .text-right { text-align: right; }

  /* TOTALS */
  .totals { 
    margin-top: 35px;
    display: flex;
    justify-content: flex-end;
  }

  .totals-box {
    width: 360px;
    background: #f9fafb;
    padding: 22px;
    border-radius: 10px;
    border: 1px solid #e5e7eb;
    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
  }

  .total-row { 
    display: flex;
    justify-content: space-between;
    margin: 10px 0;
    font-size: 14px;
  }

  .total-row.final {
    margin-top: 16px;
    padding-top: 14px;
    border-top: 2px solid #2563eb;
    font-size: 18px;
    font-weight: 700;
    color: #2563eb;
  }

  .discount-row { color: #16a34a; }

  /* FOOTER */
  .footer {
    margin-top: 60px;
    padding-top: 20px;
    border-top: 2px solid #e5e7eb;
    text-align: center;
    color: #6b7280;
    font-size: 12px;
  }

  @media print {
    body { padding: 20px; }
    .no-print { display: none; }
  }
</style>

        </head>
        <body>
          <div class="invoice-container">
            <div class="header">
              <div class="company-info">
                <h1>Tu Empresa</h1>
                <p>Calle Principal 123<br>
                Ciudad, Estado 12345<br>
                Tel: +54 123 456 7890<br>
                info@tuempresa.com</p>
              </div>
              <div class="invoice-info">
                <h2>FACTURA</h2>
                <p><strong>N°:</strong> ${order.orderNumber}</p>
                <p><strong>Fecha:</strong> ${new Date(order.createdAt).toLocaleDateString("es-AR")}</p>
                ${order.paidAt ? `<p><strong>Pagado:</strong> ${new Date(order.paidAt).toLocaleDateString("es-AR")}</p>` : ""}
                <span class="status-badge">${order.status}</span>
              </div>
            </div>

            <div class="details-section">

  <div class="detail-box">
    <h3>Cliente</h3>
    <p><strong>Nombre:</strong> ${order.client.name}</p>
    ${order.client.email ? `<p><strong>Email:</strong> ${order.client.email}</p>` : ""}
    ${order.client.phone ? `<p><strong>Teléfono:</strong> ${order.client.phone}</p>` : ""}
    ${order.client.adress ? `<p><strong>Dirección:</strong> ${order.client.adress}</p>` : ""}
  </div>
<!-- <div class="detail-box">
    <h3>Pago</h3>
    <p><strong>Método:</strong> ${order.paymentMethod || 'N/A'}</p>
    <p><strong>Estado:</strong> ${order.paymentStatus}</p>

    ${order.paidAt ? `<p><strong>Pagado:</strong> ${new Date(order.paidAt).toLocaleDateString('es-AR')}</p>` : ""}
  </div> -->
  

</div>


            <table>
              <thead>
                <tr>
                  <th>Producto</th>
                  <th class="text-right">Cantidad</th>
                  <th class="text-right">Precio Unit.</th>
                  <th class="text-right">Descuento</th>
                  <th class="text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                ${order.products
                  .map(
                    (item) => `
                  <tr>
                    <td>${item.product.name}</td>
                    <td class="text-right">${item.quantity}</td>
                    <td class="text-right">$${item.unitPrice.toFixed(2)}</td>
                    <td class="text-right discount-row">-$${item.discount.toFixed(2)}</td>
                    <td class="text-right"><strong>$${item.subtotal.toFixed(2)}</strong></td>
                  </tr>
                `,
                  )
                  .join("")}
              </tbody>
            </table>

            <div class="totals">
              <div class="totals-box">
                <div class="total-row">
                  <span>Subtotal:</span>
                  <span>$${order.subtotal.toFixed(2)}</span>
                </div>
                ${
                  order.discount > 0
                    ? `
                  <div class="total-row discount-row">
                    <span>Descuento:</span>
                    <span>-$${order.discount.toFixed(2)}</span>
                  </div>
                `
                    : ""
                }
                <div class="total-row final">
                  <span>TOTAL:</span>
                  <span>$${order.total.toFixed(2)}</span>
                </div>
              </div>
            </div>

         
            <div class="footer">
              <p>Gracias por su compra</p>
              <p>Este documento fue generado electrónicamente y es válido sin firma</p>
            </div>
          </div>
        </body>
      </html>
    `;

    invoiceWindow?.document.write(invoiceHTML);
    invoiceWindow?.document.close();

    // Wait for content to load, then trigger print
    if (invoiceWindow) {
      invoiceWindow.onload = () => {
        setTimeout(() => {
          invoiceWindow?.print();
        }, 250);
      };
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
          <p className="text-gray-600">Cargando orden...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen min-h-screen overflow-y-scroll bg-gradient-to-br px-4 py-12 text-sm text-gray-900 dark:text-gray-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-6 rounded-sm bg-white p-6 shadow dark:bg-neutral-900">
          <div className="mb-4 flex items-start justify-between">
            <div>
              <h1 className="mb-1 text-2xl font-bold text-gray-900 dark:text-gray-100">
                Orden {order.orderNumber}
              </h1>

              <div className="flex items-center gap-3">
                {getStatusIcon(order.status)}
                <span
                  className={`rounded-sm px-3 py-1 text-xs font-semibold ${getStatusColor(order.status)}`}
                >
                  {order.status}
                </span>
              </div>
            </div>

            <button
              onClick={generatePDF}
              className="flex items-center gap-2 rounded-sm bg-blue-600 px-4 py-2 font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
            >
              <Download className="h-4 w-4" />
              Descargar Factura
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="flex items-start gap-2">
              <Calendar className="mt-0.5 h-4 w-4 text-gray-400 dark:text-gray-500" />
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Fecha de Orden
                </p>
                <p className="font-semibold text-gray-900 dark:text-gray-100">
                  {new Date(order.createdAt).toLocaleDateString("es-AR", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <CreditCard className="mt-0.5 h-4 w-4 text-gray-400 dark:text-gray-500" />
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Método de Pago
                </p>
                <p className="font-semibold">{order.paymentMethod || "N/A"}</p>
                <p
                  className={`text-xs ${order.paymentStatus === "PAID" ? "text-green-600" : "text-yellow-600"}`}
                >
                  {order.paymentStatus}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <Package className="mt-0.5 h-4 w-4 text-gray-400 dark:text-gray-500" />
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Total de Productos
                </p>
                <p className="font-semibold">
                  {order.products.reduce((s, i) => s + i.quantity, 0)} items
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Customer Info */}
        <div className="mb-6 rounded-sm bg-white p-6 shadow dark:bg-neutral-900">
          <div className="mb-3 flex items-center gap-2">
            <User className="h-4 w-4 text-blue-600" />
            <h2 className="text-lg font-bold">Información del Cliente</h2>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Nombre</p>
              <Link href={`/dashboard/clients/${order.client.id}`} className="font-semibold text-blue-600 hover:underline">{order.client.name}</Link>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Email</p>
              <p className="font-semibold">{order.client.email}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Teléfono
              </p>
              <p className="font-semibold">{order.client.phone}</p>
            </div>

            {order.client.adress && (
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Dirección
                </p>
                <p className="font-semibold">{order.client.adress}</p>
              </div>
            )}
          </div>
        </div>

        {/* Products List */}
        <div className="mb-6 rounded-sm bg-white p-6 shadow dark:bg-neutral-900">
          <div className="mb-4 flex items-center gap-2">
            <Package className="h-4 w-4 text-blue-600" />
            <h2 className="text-lg font-bold">Productos</h2>
          </div>

          <div className="max-h-72 overflow-y-auto rounded-sm border dark:border-neutral-700">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 border-b bg-gray-100 dark:border-neutral-700 dark:bg-neutral-800">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">
                    Producto
                  </th>
                  <th className="px-3 py-2 text-center font-semibold">
                    Cantidad
                  </th>
                  <th className="px-3 py-2 text-right font-semibold">
                    Precio Unit.
                  </th>
                  <th className="px-3 py-2 text-right font-semibold">
                    Descuento
                  </th>
                  <th className="px-3 py-2 text-right font-semibold">
                    Subtotal
                  </th>
                </tr>
              </thead>

              <tbody>
                {order.products.map((item, index) => (
                  <tr
                    key={item.id}
                    className={`border-b dark:border-neutral-800 ${
                      index % 2 === 0
                        ? "bg-white dark:bg-neutral-900"
                        : "bg-gray-50 dark:bg-neutral-800/40"
                    }`}
                  >
                    <td className="px-3 py-3 font-medium">
                      {item.product.name}
                    </td>
                    <td className="px-3 py-3 text-center">{item.quantity}</td>
                    <td className="px-3 py-3 text-right">
                      ${item.unitPrice.toFixed(2)}
                    </td>
                    <td className="px-3 py-3 text-right">
                      {item.discount > 0 ? (
                        <span className="font-medium text-green-600">
                          -${item.discount.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-600">
                          $0.00
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right font-bold">
                      ${item.subtotal.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

       

        {/* Notes */}
        {order.notes && (
          <div className="mb-6 rounded-sm border border-amber-200 bg-amber-50 p-4 shadow dark:border-amber-800 dark:bg-amber-900/20">
            <div className="flex items-start gap-2">
              <FileText className="h-4 w-4 text-amber-600" />
              <div>
                <h3 className="mb-1 font-bold text-amber-900 dark:text-amber-300">
                  Notas del Pedido
                </h3>
                <p className="text-amber-800 dark:text-amber-300">
                  {order.notes}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Order Summary */}
        <div className="rounded-sm bg-white p-6 shadow dark:bg-neutral-900">
          <h2 className="mb-4 text-lg font-bold">Resumen del Pedido</h2>

          <div className="space-y-2">
            <div className="flex justify-between text-gray-600 dark:text-gray-400">
              <span>Subtotal:</span>
              <span className="font-semibold">
                ${order.subtotal.toFixed(2)}
              </span>
            </div>

            {order.discount > 0 && (
              <div className="flex justify-between text-green-700 dark:text-green-400">
                <span>Descuento:</span>
                <span className="font-semibold">
                  -${order.discount.toFixed(2)}
                </span>
              </div>
            )}

            <div className="mt-3 border-t pt-3 dark:border-neutral-700">
              <div className="flex justify-between text-xl font-bold text-blue-600 dark:text-blue-400">
                <span>Total:</span>
                <span>${order.total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetailPage;
