"use client";

import Link from "next/link";
import { useCart } from "@/components/CartProvider";

export function CartLink() {
  const { count } = useCart();

  return (
    <Link href="/cart" className="text-paper">
      Cart
      <span className="ml-2 inline-flex min-w-6 justify-center rounded-full bg-lime px-1.5 py-0.5 text-xs font-semibold text-ink">
        {count}
      </span>
    </Link>
  );
}
