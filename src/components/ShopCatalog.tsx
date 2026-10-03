"use client";

import { useEffect, useRef, useState } from "react";
import { useCart } from "@/components/CartProvider";
import { money, type Product } from "@/lib/types";

export function ShopCatalog({ products }: { products: Product[] }) {
  const categories = ["All", ...Array.from(new Set(products.map((product) => product.category)))];
  const [category, setCategory] = useState("All");
  const [active, setActive] = useState<Product | null>(null);
  const [qty, setQty] = useState(1);
  const [addedId, setAddedId] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { addItem } = useCart();

  const visible = products.filter((product) => category === "All" || product.category === category);

  useEffect(() => {
    setQty(1);
  }, [active?.id]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || !active || dialog.open) return;
    dialog.showModal();
  }, [active]);

  function add(product: Product, quantity = 1) {
    addItem(
      {
        productId: product.id,
        name: product.name,
        priceCents: product.price_cents,
        image: product.image_path,
      },
      quantity,
    );
    setAddedId(product.id);
  }

  function closePreview() {
    dialogRef.current?.close();
    setActive(null);
  }

  return (
    <section id="catalog">
      <div className="mb-6 flex flex-wrap gap-2">
        {categories.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setCategory(item)}
            className={`rounded-full px-3 py-1.5 text-sm ${
              category === item ? "bg-lime text-ink" : "border border-line text-mist"
            }`}
          >
            {item}
          </button>
        ))}
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((product) => (
          <article key={product.id} className="overflow-hidden rounded-2xl border border-line bg-panel">
            <button type="button" onClick={() => setActive(product)} className="block w-full text-left">
              <img
                src={product.image_path}
                alt={product.name}
                className="aspect-[4/3] w-full object-cover"
              />
            </button>
            <div className="space-y-3 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-mist">{product.category}</p>
              <div className="flex items-start justify-between gap-3">
                <h2 className="font-display text-2xl leading-none tracking-wide">{product.name}</h2>
                <p className="shrink-0 text-sm text-lime">{money(product.price_cents)}</p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setActive(product)}
                  className="rounded-full border border-line px-3 py-1.5 text-sm"
                >
                  Preview
                </button>
                <button
                  type="button"
                  onClick={() => add(product)}
                  className="rounded-full bg-paper px-3 py-1.5 text-sm font-semibold text-ink"
                >
                  {addedId === product.id ? "Added" : "Add to cart"}
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>

      <dialog
        ref={dialogRef}
        onClose={() => setActive(null)}
        aria-labelledby="preview-title"
        className="max-h-[90vh] overflow-auto rounded-2xl"
      >
        {active ? (
          <div className="grid md:grid-cols-[1.1fr_1fr]">
            <img src={active.image_path} alt={active.name} className="h-56 w-full object-cover md:h-full md:max-h-[80vh]" />
            <div className="flex flex-col gap-4 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-mist">{active.category}</p>
                  <h2 id="preview-title" className="mt-1 font-display text-4xl leading-none tracking-wide">
                    {active.name}
                  </h2>
                </div>
                <button type="button" onClick={closePreview} className="text-sm text-mist" aria-label="Close preview">
                  Close
                </button>
              </div>
              <p className="text-2xl text-lime">{money(active.price_cents)}</p>
              <p className="text-sm leading-6 text-mist">{active.description}</p>
              <ul className="space-y-1 text-sm">
                {active.specs.map((spec) => (
                  <li key={spec}>{spec}</li>
                ))}
              </ul>
              <div className="sticky bottom-0 mt-auto flex items-center gap-3 bg-panel py-3">
                <label className="text-sm text-mist" htmlFor="preview-qty">
                  Qty
                </label>
                <input
                  id="preview-qty"
                  type="number"
                  min={1}
                  max={10}
                  value={qty}
                  onChange={(event) => setQty(Math.min(10, Math.max(1, Number(event.target.value) || 1)))}
                  className="w-16 rounded-lg border border-line bg-ink px-2 py-1"
                />
                <button
                  type="button"
                  onClick={() => {
                    add(active, qty);
                    closePreview();
                  }}
                  className="rounded-full bg-lime px-4 py-2 text-sm font-semibold text-ink"
                >
                  Add to cart
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </dialog>
    </section>
  );
}
