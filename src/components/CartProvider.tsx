"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type CartItem = {
  productId: string;
  name: string;
  priceCents: number;
  image: string;
  quantity: number;
};

type CartContextValue = {
  items: CartItem[];
  count: number;
  totalCents: number;
  addItem: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  setQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  clear: () => void;
  refresh: () => Promise<void>;
};

type ProductJoin = {
  id: string;
  name: string;
  price_cents: number;
  image_path: string;
};

type CartRow = {
  quantity: number;
  products: ProductJoin | ProductJoin[] | null;
};

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "loadout-cart";

function sameCart(left: CartItem[], right: CartItem[]) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function rowsToItems(rows: CartRow[]) {
  return rows.flatMap((row) => {
    const product = Array.isArray(row.products) ? row.products[0] : row.products;
    if (!product) return [];
    return [
      {
        productId: product.id,
        name: product.name,
        priceCents: product.price_cents,
        image: product.image_path,
        quantity: row.quantity,
      },
    ];
  });
}

async function pullCart(userId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("cart_items")
    .select("quantity, products(id, name, price_cents, image_path)")
    .eq("user_id", userId);
  if (error || !data) return null;
  return rowsToItems(data as CartRow[]);
}

async function pushCart(userId: string, next: CartItem[]) {
  const supabase = createClient();
  if (next.length === 0) {
    await supabase.from("cart_items").delete().eq("user_id", userId);
    return;
  }

  const { data: existing } = await supabase.from("cart_items").select("product_id").eq("user_id", userId);
  const keep = new Set(next.map((item) => item.productId));
  const remove = (existing ?? [])
    .map((row) => row.product_id as string)
    .filter((productId) => !keep.has(productId));

  if (remove.length > 0) {
    await supabase.from("cart_items").delete().eq("user_id", userId).in("product_id", remove);
  }

  await supabase.from("cart_items").upsert(
    next.map((item) => ({
      user_id: userId,
      product_id: item.productId,
      quantity: item.quantity,
      updated_at: new Date().toISOString(),
    })),
    { onConflict: "user_id,product_id" },
  );
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);
  const userId = useRef<string | null>(null);
  const itemsRef = useRef(items);
  itemsRef.current = items;

  function replaceItems(next: CartItem[]) {
    if (!sameCart(itemsRef.current, next)) setItems(next);
  }

  async function refresh() {
    if (!userId.current) return;
    const remote = await pullCart(userId.current);
    if (remote) replaceItems(remote);
  }

  useEffect(() => {
    const supabase = createClient();
    let ignore = false;

    async function start() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (ignore) return;
      userId.current = session?.user.id ?? null;

      const raw = window.localStorage.getItem(STORAGE_KEY);
      let local: CartItem[] = [];
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as CartItem[];
          if (Array.isArray(parsed)) local = parsed;
        } catch {
          window.localStorage.removeItem(STORAGE_KEY);
        }
      }

      if (session?.user.id) {
        if (local.length > 0) {
          await pushCart(session.user.id, local);
          window.localStorage.removeItem(STORAGE_KEY);
        }
        const remote = await pullCart(session.user.id);
        if (!ignore) replaceItems(remote ?? local);
      } else if (!ignore) {
        replaceItems(local);
      }

      if (!ignore) setReady(true);
    }

    void start();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextId = session?.user.id ?? null;
      const changed = userId.current !== nextId;
      userId.current = nextId;
      if (changed && nextId) void refresh();
    });

    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    const timer = window.setInterval(() => void refresh(), 8000);

    return () => {
      ignore = true;
      subscription.unsubscribe();
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (userId.current) {
      void pushCart(userId.current, items);
      return;
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, ready]);

  const value = useMemo<CartContextValue>(() => {
    return {
      items,
      count: items.reduce((sum, item) => sum + item.quantity, 0),
      totalCents: items.reduce((sum, item) => sum + item.priceCents * item.quantity, 0),
      addItem(item, quantity = 1) {
        setItems((current) => {
          const existing = current.find((entry) => entry.productId === item.productId);
          if (!existing) return [...current, { ...item, quantity: Math.min(10, quantity) }];
          return current.map((entry) =>
            entry.productId === item.productId
              ? { ...entry, quantity: Math.min(10, entry.quantity + quantity) }
              : entry,
          );
        });
      },
      setQuantity(productId, quantity) {
        setItems((current) =>
          current.flatMap((entry) => {
            if (entry.productId !== productId) return [entry];
            if (quantity < 1) return [];
            return [{ ...entry, quantity: Math.min(10, quantity) }];
          }),
        );
      },
      removeItem(productId) {
        setItems((current) => current.filter((entry) => entry.productId !== productId));
      },
      clear() {
        setItems([]);
      },
      refresh,
    };
  }, [items]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const value = useContext(CartContext);
  if (!value) throw new Error("useCart must be used inside CartProvider");
  return value;
}
