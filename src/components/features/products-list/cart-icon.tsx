"use client";

import { ShoppingCart } from "lucide-react";
import { useCart } from "@/store/cart";
import Link from "next/link";

export default function CartIcon() {
  const items = useCart((s) => s.items);
  const count = items.reduce((acc, i) => acc + i.quantity, 0);

  return (
    <Link href="/products/cart" className="relative">
      <ShoppingCart className="w-6 h-6" />

      {count > 0 && (
        <span
          className="
            absolute -top-1 -right-1 
            bg-primary text-white text-xs 
            px-1.5 py-0.5 rounded-full 
            min-w-[12px] text-center
          "
        >
          {count}
        </span>
      )}
    </Link>
  );
}
