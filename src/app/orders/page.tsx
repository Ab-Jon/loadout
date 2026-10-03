import Link from "next/link";
import { SignInButton } from "@/components/SignInButton";
import { createClient } from "@/lib/supabase/server";
import { money, when, type Order } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="max-w-lg space-y-4">
        <h1 className="font-display text-5xl tracking-wide">Orders</h1>
        <p>Sign in with Google to see orders saved to your account.</p>
        <SignInButton next="/orders" />
      </div>
    );
  }

  const { data } = await supabase
    .from("orders")
    .select("id, email, status, total_cents, created_at, order_items(product_name, quantity, unit_price_cents)")
    .order("created_at", { ascending: false });

  const orders = (data ?? []) as Order[];

  return (
    <div className="space-y-6">
      <h1 className="font-display text-5xl tracking-wide">Orders</h1>
      {orders.length === 0 ? (
        <div className="space-y-4">
          <p className="text-mist">
            No orders yet. Add something to the cart, continue to checkout, then choose Place order.
          </p>
          <Link href="/" className="inline-block rounded-full bg-lime px-4 py-2 text-sm font-semibold text-ink">
            Browse tools
          </Link>
        </div>
      ) : (
        <ul className="space-y-4">
          {orders.map((order) => (
            <li key={order.id} className="rounded-2xl border border-line bg-panel p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <Link href={`/orders/${order.id}`} className="font-display text-3xl tracking-wide">
                  {when(order.created_at)}
                </Link>
                <p>{money(order.total_cents)}</p>
              </div>
              <p className="mt-1 text-sm uppercase tracking-[0.14em] text-lime">{order.status}</p>
              <ul className="mt-3 text-sm text-mist">
                {order.order_items.map((item) => (
                  <li key={`${order.id}-${item.product_name}`}>
                    {item.quantity} × {item.product_name}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
