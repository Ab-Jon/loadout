"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

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
};

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "loadout-cart";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as CartItem[];
        if (Array.isArray(parsed)) setItems(parsed);
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, ready]);

  const value = useMemo<CartContextValue>(() => {
    return {
      items,
      count: items.reduce((sum, item) => sum + item.quantity, 0),
      totalCents: items.reduce((sum, item) => sum + item.priceCents * item.quantity, 0),
      addItem(item, quantity = 1) {
        setItems((current) => {
          const existing = current.find((entry) => entry.productId === item.productId);
          if (!existing) {
            return [...current, { ...item, quantity: Math.min(10, quantity) }];
          }
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
    };
  }, [items]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const value = useContext(CartContext);
  if (!value) throw new Error("useCart must be used inside CartProvider");
  return value;
}
