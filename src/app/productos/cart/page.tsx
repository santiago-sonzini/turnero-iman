"use client";

import Link from "next/link";
import { useCart } from "@/store/cart";
import { Package, Trash2, ArrowDown } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { SafeImage } from "@/components/features/products-list/safe-image";

export default function CartPage() {
  
  const { items, removeItem } = useCart();
  const [showScrollIndicator, setShowScrollIndicator] = useState(false);
  const scrollContainerRef = useRef(null);


  const subtotal = items.reduce(
    (acc, item) => acc + item.price * item.quantity,
    0
  );

  const discount = subtotal * 0.1;
  const taxes = subtotal * 0.21;
  const total = subtotal - discount + taxes;

  useEffect(() => {
    const checkScroll = () => {
      if (scrollContainerRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
        const hasMoreContent = scrollHeight > clientHeight;
        const isNotAtBottom = scrollTop < scrollHeight - clientHeight - 20;
        setShowScrollIndicator(hasMoreContent && isNotAtBottom);
      }
    };

    const container: any = scrollContainerRef.current;
    if (container) {
      checkScroll();
      container.addEventListener("scroll", checkScroll);
      window.addEventListener("resize", checkScroll);

      return () => {
        container.removeEventListener("scroll", checkScroll);
        window.removeEventListener("resize", checkScroll);
      };
    }
  }, [items]);

  return (
    <div className="max-w-7xl mx-auto py-8 mt-10 px-4">
      <h1 className="text-2xl font-semibold mb-6">Tu carrito</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* LEFT: ITEMS LIST */}
        <div className="lg:col-span-2">
          <div className="border border-border rounded-md overflow-hidden">
            {items.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground">
                Tu carrito está vacío.
              </div>
            ) : (
              <div className="relative">
                <div
                  ref={scrollContainerRef}
                  className="divide-y divide-border overflow-y-auto"
                  style={{ maxHeight: '60vh' }}
                >
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="grid grid-cols-[60px_1fr_auto] sm:grid-cols-[60px_1fr_150px_100px_auto] items-center gap-4 px-4 py-3 hover:bg-accent transition-all"
                    >
                      <div className="w-12 h-12 bg-white flex items-center justify-center overflow-hidden border border-border">
                        {item.image ? (
                          <SafeImage
                            src={item.image}
                            alt={item.title}
                            className="object-contain"
                            fill
                          />
                        ) : (
                          <Package className="w-6 h-6 text-muted-foreground" />
                        )}
                      </div>

                      <div className="flex flex-col min-w-0">
                        <Link
                          href={`/products/${item.id}`}
                          className="font-medium hover:underline"
                        >
                          {item.title}
                        </Link>

                        {item.category && (
                          <span className="text-xs text-muted-foreground uppercase tracking-wide">
                            {item.category}
                          </span>
                        )}

                        {item.description && (
                          <span className="text-xs text-muted-foreground line-clamp-1">
                            {item.description}
                          </span>
                        )}

                        {/* Show quantity and price on mobile */}
                        <div className="flex items-center gap-4 mt-2 sm:hidden">
                          <span className="text-sm text-muted-foreground">
                            Qty: {item.quantity}
                          </span>
                          <span className="font-semibold">
                            ${(item.price * item.quantity).toFixed(2)}
                          </span>
                        </div>
                      </div>

                      <div className="hidden sm:block text-sm text-muted-foreground">
                        Qty: {item.quantity}
                      </div>

                      <div className="hidden sm:block text-right font-semibold">
                        ${(item.price * item.quantity).toFixed(2)}
                      </div>

                      <button
                        onClick={() => removeItem(item.id)}
                        className="
                          p-2 border border-border transition-all
                          hover:bg-red-600 hover:border-red-600 hover:text-white 
                          active:scale-95
                        "
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Scroll Indicator */}
                {showScrollIndicator && (
                  <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-background to-transparent  flex items-end justify-center pb-3">
                    <div className="animate-bounce bg-primary text-primary-foreground rounded-full p-1.5">
                      <ArrowDown className="w-4 h-4" />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: CHECKOUT CARD */}
        {items.length > 0 && (
          <div className="lg:col-span-1">
            <div className="border border-border rounded-md p-6 h-fit space-y-4 sticky top-8">
              <h2 className="text-xl font-semibold">Resumen del pedido</h2>

              <div className="text-sm text-muted-foreground">
                Usuario: <span className="font-medium text-foreground">correo@ejemplo.com</span>
              </div>

              <div className="space-y-2 pt-4 border-t border-border">
                <div className="flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>

                <div className="flex justify-between text-sm">
                  <span>Descuento (10%)</span>
                  <span>−${discount.toFixed(2)}</span>
                </div>

                <div className="flex justify-between text-sm">
                  <span>Impuestos (21%)</span>
                  <span>${taxes.toFixed(2)}</span>
                </div>

                <div className="flex justify-between text-lg font-semibold pt-2 border-t border-border">
                  <span>Total</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </div>

              <button
                className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition-all active:scale-95"
              >
                Confirmar pedido
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}