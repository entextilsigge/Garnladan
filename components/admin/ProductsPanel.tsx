"use client";

import { useMemo, useState } from "react";
import ProductForm from "@/components/admin/ProductForm";
import { formatPrice } from "@/lib/format";
import { CATEGORY_LABELS, WEIGHT_LABELS, type Category, type Product } from "@/lib/products";

export default function ProductsPanel({ initialProducts }: { initialProducts: Product[] }) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<Category | "alla">("alla");
  const [editing, setEditing] = useState<Product | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let list = products;
    if (categoryFilter !== "alla") list = list.filter((p) => p.category === categoryFilter);
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(q) || p.slug.includes(q));
    }
    return list;
  }, [products, query, categoryFilter]);

  const totalStockUnits = products.reduce(
    (sum, p) => sum + p.colorways.reduce((s, c) => s + c.stock, 0),
    0
  );
  const stockValue = products.reduce(
    (sum, p) => sum + p.price * p.colorways.reduce((s, c) => s + c.stock, 0),
    0
  );

  async function handleDelete(product: Product) {
    if (!confirm(`Ta bort "${product.name}"? Detta går inte att ångra.`)) return;
    setError(null);
    const res = await fetch(`/api/admin/products/${product.id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Kunde inte ta bort produkten.");
      return;
    }
    setProducts((prev) => prev.filter((p) => p.id !== product.id));
  }

  function handleSaved(saved: Product) {
    setProducts((prev) => {
      const exists = prev.some((p) => p.id === saved.id);
      return exists ? prev.map((p) => (p.id === saved.id ? saved : p)) : [...prev, saved];
    });
    setEditing(null);
    setCreating(false);
  }

  return (
    <div>
      {error && (
        <p className="mb-4 rounded-2xl bg-tegel/10 px-5 py-3.5 text-sm font-medium text-tegel-dark">
          {error}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          ["Produkter", String(products.length)],
          ["Enheter i lager", String(totalStockUnits)],
          ["Lagervärde", formatPrice(stockValue)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl bg-white/70 px-5 py-4 ring-1 ring-kol/5">
            <p className="text-xs font-medium uppercase tracking-wider text-mull">{label}</p>
            <p className="mt-1 font-display text-2xl font-bold text-kol">{value}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <input
          type="search"
          placeholder="Sök på namn eller slug…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full max-w-xs rounded-full border border-kol/15 bg-white px-5 py-2.5 text-sm focus:border-tegel focus:outline-none focus:ring-2 focus:ring-tegel/25"
        />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value as Category | "alla")}
          className="rounded-full border border-kol/15 bg-white px-4 py-2.5 text-sm font-medium text-kol focus:outline-none focus:ring-2 focus:ring-tegel/25"
        >
          <option value="alla">Alla kategorier</option>
          {(Object.keys(CATEGORY_LABELS) as Category[]).map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABELS[c]}
            </option>
          ))}
        </select>
        <button
          onClick={() => setCreating(true)}
          className="ml-auto rounded-full bg-tegel px-5 py-2.5 text-sm font-semibold text-krita transition-colors hover:bg-tegel-dark"
        >
          + Lägg till produkt
        </button>
      </div>

      <div className="mt-5 overflow-x-auto rounded-2xl bg-white/70 ring-1 ring-kol/5">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead>
            <tr className="border-b border-kol/10 text-xs uppercase tracking-wider text-mull">
              <th className="px-5 py-3.5 font-semibold">Produkt</th>
              <th className="px-5 py-3.5 font-semibold">Kategori</th>
              <th className="px-5 py-3.5 font-semibold">Tjocklek</th>
              <th className="px-5 py-3.5 font-semibold">Färger / lager</th>
              <th className="px-5 py-3.5 text-right font-semibold">Pris</th>
              <th className="px-5 py-3.5 font-semibold">Status</th>
              <th className="px-5 py-3.5 font-semibold" />
            </tr>
          </thead>
          <tbody className="divide-y divide-kol/[0.06]">
            {filtered.map((p) => {
              const stock = p.colorways.reduce((s, c) => s + c.stock, 0);
              const soldOut = p.colorways.every((c) => c.stock <= 0);
              return (
                <tr key={p.id} className="transition-colors hover:bg-linne/40">
                  <td className="px-5 py-3.5">
                    <p className="font-medium text-kol">{p.name}</p>
                    <p className="font-mono text-xs text-mull">{p.slug}</p>
                  </td>
                  <td className="px-5 py-3.5 text-mull">{CATEGORY_LABELS[p.category]}</td>
                  <td className="px-5 py-3.5 text-mull">{WEIGHT_LABELS[p.weightClass]}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex flex-wrap gap-1.5">
                      {p.colorways.map((c) => (
                        <span
                          key={c.name}
                          title={`${c.name}: ${c.stock} st`}
                          className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] ${
                            c.stock <= 0 ? "bg-tegel/10 text-tegel" : "bg-linne text-mull"
                          }`}
                        >
                          <span
                            className="h-2.5 w-2.5 rounded-full ring-1 ring-kol/15"
                            style={{ backgroundColor: c.hex }}
                          />
                          {c.stock}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-right font-medium text-kol">
                    {formatPrice(p.price)}
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${
                        soldOut
                          ? "bg-tegel/10 text-tegel"
                          : p.isNew
                            ? "bg-gran/10 text-gran"
                            : stock < 20
                              ? "bg-senap/15 text-senap-dark"
                              : "bg-linne text-mull"
                      }`}
                    >
                      {soldOut ? "Slut i lager" : p.isNew ? "Nyhet" : stock < 20 ? "Lågt lager" : "Aktiv"}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setEditing(p)}
                        className="rounded-full border border-kol/15 px-3 py-1.5 text-xs font-medium text-kol transition-colors hover:bg-linne"
                      >
                        Redigera
                      </button>
                      <button
                        onClick={() => handleDelete(p)}
                        className="rounded-full border border-tegel/30 px-3 py-1.5 text-xs font-medium text-tegel transition-colors hover:bg-tegel/10"
                      >
                        Ta bort
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-8 text-center text-mull">
                  Inga produkter matchade.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {(creating || editing) && (
        <ProductForm
          product={editing}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
