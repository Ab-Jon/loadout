"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function placeOrder(
  items: { productId: string; quantity: number }[],
): Promise<{ error: string } | { orderId: string }> {
  if (!Array.isArray(items) || items.length === 0 || items.length > 20) {
    return { error: "Your cart is empty." };
  }

  const payload = items.map((item) => ({
    productId: String(item.productId),
    quantity: Number(item.quantity),
  }));

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Sign in with Google before you place an order." };
  }

  const { data, error } = await supabase.rpc("place_order", { items: payload });

  if (error) {
    return { error: error.message || "The order could not be saved. Sign in again and retry." };
  }

  return { orderId: data as string };
}
