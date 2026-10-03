import { ShopCatalog } from "@/components/ShopCatalog";
import { createClient } from "@/lib/supabase/server";
import type { Product } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ auth?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("id, slug, name, category, description, price_cents, image_path, specs, sort_order")
    .order("sort_order");

  const products = (data ?? []) as Product[];

  return (
    <div className="space-y-8">
      <section className="max-w-2xl space-y-3">
        <p className="text-xs uppercase tracking-[0.22em] text-signal">Gaming tools · 18+</p>
        <h1 className="font-display text-6xl leading-[0.9] tracking-wide sm:text-7xl">
          Tools for the way you play.
        </h1>
        <p className="max-w-xl text-base leading-7 text-mist">
          Consoles, displays, and the gear around them. Preview any piece before you add it to an order.
          This shop is for players 18 and older.
        </p>
      </section>

      {params.auth === "error" ? (
        <p className="rounded-xl border border-signal/40 bg-signal/10 px-4 py-3 text-sm">
          Google sign-in did not finish. Confirm the Google provider is enabled in Supabase, then try again.
        </p>
      ) : null}

      {error ? (
        <p className="rounded-xl border border-signal/40 bg-signal/10 px-4 py-3 text-sm">
          The catalog is not available yet. The product tables still need to be created in Supabase.
        </p>
      ) : (
        <ShopCatalog products={products} />
      )}
    </div>
  );
}
