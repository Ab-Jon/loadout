import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { money, when, type Order } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/orders");

  const { data } = await supabase
    .from("orders")
    .select("id, email, status, total_cents, created_at, order_items(product_name, quantity, unit_price_cents)")
    .eq("id", id)
    .maybeSingle();

  if (!data) notFound();
  const order = data as Order;

  return (
    <div className="max-w-2xl space-y-6">
      <p className="text-xs uppercase tracking-[0.18em] text-lime">Order saved</p>
      <h1 className="font-display text-5xl tracking-wide">{when(order.created_at)}</h1>
      <p className="text-mist">
        This order is stored for {order.email || "your Google account"}. You can sign out, come back, and it will
        still be here. Email confirmation is off until Mailgun is connected.
      </p>
      <ul className="divide-y divide-line border-y border-line">
        {order.order_items.map((item) => (
          <li key={item.product_name} className="flex items-center justify-between py-3">
            <span>
              {item.quantity} × {item.product_name}
            </span>
            <span>{money(item.unit_price_cents * item.quantity)}</span>
          </li>
        ))}
      </ul>
      <p className="font-display text-4xl tracking-wide">{money(order.total_cents)}</p>
      <Link href="/orders" className="inline-block text-sm text-lime">
        All orders
      </Link>
    </div>
  );
}
