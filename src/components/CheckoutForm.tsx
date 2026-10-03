"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { placeOrder } from "@/lib/actions";
import { useCart } from "@/components/CartProvider";
import { money } from "@/lib/types";

export function CheckoutForm({ email }: { email: string }) {
  const { items, totalCents, clear } = useCart();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const router = useRouter();

  async function onSubmit() {
    setPending(true);
    setError(null);
    const result = await placeOrder(
      items.map((item) => ({ productId: item.productId, quantity: item.quantity })),
    );
    if ("error" in result) {
      setError(result.error);
      setPending(false);
      return;
    }
    clear();
    router.push(`/orders/${result.orderId}`);
  }

  if (items.length === 0) {
    return (
      <div className="space-y-4">
        <p className="text-mist">Nothing is waiting to be ordered.</p>
        <Link href="/" className="inline-block rounded-full bg-lime px-4 py-2 text-sm font-semibold text-ink">
          Browse tools
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
      <ul className="order-last divide-y divide-line border-y border-line lg:order-first">
        {items.map((item) => (
          <li key={item.productId} className="flex items-center justify-between gap-4 py-4">
            <div>
              <p className="font-display text-2xl tracking-wide">{item.name}</p>
              <p className="text-sm text-mist">Qty {item.quantity}</p>
            </div>
            <p>{money(item.priceCents * item.quantity)}</p>
          </li>
        ))}
      </ul>
      <aside className="order-first h-fit space-y-4 rounded-2xl border border-line bg-panel p-5 lg:order-last">
        <p className="text-sm text-mist">Signed in as</p>
        <p className="truncate">{email}</p>
        <p className="font-display text-4xl tracking-wide">{money(totalCents)}</p>
        <p className="text-sm text-mist">
          This is only a review. The order is saved to your account when you place it.
        </p>
        {error ? <p className="text-sm text-signal">{error}</p> : null}
        <button
          type="button"
          onClick={onSubmit}
          disabled={pending}
          className="rounded-full bg-lime px-5 py-3 text-sm font-semibold text-ink disabled:opacity-60"
        >
          {pending ? "Saving order…" : "Place order"}
        </button>
      </aside>
    </div>
  );
}
