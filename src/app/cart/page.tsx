"use client";

import Link from "next/link";
import { useCart } from "@/components/CartProvider";
import { money } from "@/lib/types";

export default function CartPage() {
  const { items, totalCents, setQuantity, removeItem } = useCart();

  return (
    <div className="space-y-6">
      <h1 className="font-display text-5xl tracking-wide">Cart</h1>
      {items.length === 0 ? (
        <div className="space-y-4">
          <p className="text-mist">Your cart is empty.</p>
          <Link href="/" className="inline-block rounded-full bg-lime px-4 py-2 text-sm font-semibold text-ink">
            Browse tools
          </Link>
        </div>
      ) : (
        <div className="grid gap-8 lg:grid-cols-[1.4fr_0.6fr]">
          <ul className="divide-y divide-line border-y border-line">
            {items.map((item) => (
              <li key={item.productId} className="flex gap-4 py-4">
                <img src={item.image} alt="" className="h-24 w-32 rounded-xl object-cover" />
                <div className="flex flex-1 flex-col">
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="font-display text-2xl tracking-wide">{item.name}</h2>
                    <p>{money(item.priceCents * item.quantity)}</p>
                  </div>
                  <div className="mt-auto flex items-center gap-3 text-sm">
                    <label htmlFor={`qty-${item.productId}`} className="text-mist">
                      Qty
                    </label>
                    <input
                      id={`qty-${item.productId}`}
                      type="number"
                      min={1}
                      max={10}
                      value={item.quantity}
                      onChange={(event) => setQuantity(item.productId, Number(event.target.value) || 1)}
                      className="w-16 rounded-lg border border-line bg-ink px-2 py-1"
                    />
                    <button type="button" onClick={() => removeItem(item.productId)} className="text-mist">
                      Remove
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <aside className="h-fit space-y-4 rounded-2xl border border-line bg-panel p-5">
            <p className="text-sm text-mist">Subtotal</p>
            <p className="font-display text-4xl tracking-wide">{money(totalCents)}</p>
            <p className="text-sm text-mist">
              Checkout reviews this cart. Choose Place order on the next page to save it.
            </p>
            <Link href="/checkout" className="inline-block rounded-full bg-lime px-4 py-2 text-sm font-semibold text-ink">
              Continue to checkout
            </Link>
          </aside>
        </div>
      )}
    </div>
  );
}
