export type Product = {
  id: string;
  slug: string;
  name: string;
  category: string;
  description: string;
  price_cents: number;
  image_path: string;
  specs: string[];
  sort_order: number;
};

export type OrderItem = {
  product_name: string;
  quantity: number;
  unit_price_cents: number;
};

export type Order = {
  id: string;
  email: string;
  status: string;
  total_cents: number;
  created_at: string;
  order_items: OrderItem[];
};

export function money(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export function when(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
