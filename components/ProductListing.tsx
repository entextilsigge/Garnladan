"use client";

import { useMemo, useState } from "react";
import ProductCard from "@/components/ProductCard";
import {
  CATEGORY_LABELS,
  COLOR_GROUP_SWATCHES,
  FIBER_LABELS,
  WEIGHT_LABELS,
  getAllProducts,
  type Category,
  type ColorGroup,
  type Fiber,
  type Product,
  type WeightClass,
} from "@/lib/products";

type SortKey = "popularitet" | "nyheter" | "pris-stigande" | "pris-fallande";

const SORT_LABELS: Record<SortKey, string> = {
  popularitet: "Popularitet",
  nyheter: "Nyheter först",
  "pris-stigande": "Pris: lägst först",
  "pris-fallande": "Pris: högst först",
};

// Materialfiltret grupperar närliggande fibrer till kundvänliga val
const MATERIAL_FILTERS: { label: string; fibers: Fiber[] }[] = [
  { label: "Ull & merino", fibers: ["ull", "merino"] },
  { label: "Bomull", fibers: ["bomull"] },
  { label: "Lin", fibers: ["lin"] },
  { label: "Syntet & blandmaterial", fibers: ["akryl", "polyamid", "viskos"] },
  { label: "Alpacka", fibers: ["alpacka"] },
  { label: "Mohair & silke", fibers: ["mohair", "silke"] },
  { label: "Kashmir", fibers: ["kashmir"] },
];

const WEIGHTS: WeightClass[] = ["lace", "fingering", "sport", "dk", "aran", "chunky"];
const COLOR_GROUPS = Object.keys(COLOR_GROUP_SWATCHES) as ColorGroup[];
const CATEGORIES = Object.keys(CATEGORY_LABELS) as Category[];

function sortProducts(products: Product[], sort: SortKey): Product[] {
  const list = [...products];
  switch (sort) {
    case "popularitet":
      return list.sort((a, b) => b.popularity - a.popularity);
    case "nyheter":
      return list.sort(
        (a, b) => Number(b.isNew ?? false) - Number(a.isNew ?? false) || b.popularity - a.popularity
      );
    case "pris-stigande":
      return list.sort((a, b) => a.price - b.price);
    case "pris-fallande":
      return list.sort((a, b) => b.price - a.price);
  }
}

export default function ProductListing({
  initialCategory,
  initialSort,
}: {
  initialCategory?: Category;
  initialSort?: SortKey;
}) {
  const [category, setCategory] = useState<Category | null>(initialCategory ?? null);
  const [materials, setMaterials] = useState<string[]>([]);
  const [weights, setWeights] = useState<WeightClass[]>([]);
  const [colors, setColors] = useState<ColorGroup[]>([]);
  const [sort, setSort] = useState<SortKey>(initialSort ?? "popularitet");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const toggle = <T,>(list: T[], value: T): T[] =>
    list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

  const filtered = useMemo(() => {
    let result = getAllProducts();
    if (category) result = result.filter((p) => p.category === category);
    if (materials.length > 0) {
      const activeFibers = new Set(
        MATERIAL_FILTERS.filter((m) => materials.includes(m.label)).flatMap((m) => m.fibers)
      );
      result = result.filter((p) => p.fibers.some((f) => activeFibers.has(f)));
    }
    if (weights.length > 0) {
      result = result.filter((p) => weights.includes(p.weightClass));
    }
    if (colors.length > 0) {
      result = result.filter((p) => p.colorways.some((c) => colors.includes(c.group)));
    }
    return sortProducts(result, sort);
  }, [category, materials, weights, colors, sort]);

  const activeFilterCount = materials.length + weights.length + colors.length;

  function clearFilters() {
    setMaterials([]);
    setWeights([]);
    setColors([]);
  }

  const filterPanel = (
    <div className="space-y-7">
      <fieldset>
        <legend className="text-xs font-semibold uppercase tracking-[0.18em] text-kol">
          Material
        </legend>
        <div className="mt-3 space-y-2">
          {MATERIAL_FILTERS.map((m) => (
            <label
              key={m.label}
              className="flex cursor-pointer items-center gap-2.5 text-sm text-mull transition-colors hover:text-kol"
            >
              <input
                type="checkbox"
                checked={materials.includes(m.label)}
                onChange={() => setMaterials((prev) => toggle(prev, m.label))}
                className="h-4 w-4 rounded border-kol/25 accent-tegel"
              />
              {m.label}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-xs font-semibold uppercase tracking-[0.18em] text-kol">
          Garntjocklek
        </legend>
        <div className="mt-3 space-y-2">
          {WEIGHTS.map((w) => (
            <label
              key={w}
              className="flex cursor-pointer items-center gap-2.5 text-sm text-mull transition-colors hover:text-kol"
            >
              <input
                type="checkbox"
                checked={weights.includes(w)}
                onChange={() => setWeights((prev) => toggle(prev, w))}
                className="h-4 w-4 rounded border-kol/25 accent-tegel"
              />
              {WEIGHT_LABELS[w]}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-xs font-semibold uppercase tracking-[0.18em] text-kol">
          Färg
        </legend>
        <div className="mt-3 flex flex-wrap gap-2">
          {COLOR_GROUPS.map((c) => {
            const active = colors.includes(c);
            return (
              <button
                key={c}
                onClick={() => setColors((prev) => toggle(prev, c))}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium capitalize transition-all ${
                  active
                    ? "border-tegel bg-tegel/10 text-tegel"
                    : "border-kol/15 text-mull hover:border-kol/40 hover:text-kol"
                }`}
                aria-pressed={active}
              >
                <span
                  className="h-3 w-3 rounded-full ring-1 ring-kol/15"
                  style={{ backgroundColor: COLOR_GROUP_SWATCHES[c] }}
                />
                {c}
              </button>
            );
          })}
        </div>
      </fieldset>

      {activeFilterCount > 0 && (
        <button
          onClick={clearFilters}
          className="text-sm font-medium text-tegel underline-offset-4 hover:underline"
        >
          Rensa alla filter ({activeFilterCount})
        </button>
      )}
    </div>
  );

  return (
    <div className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
      {/* Kategoriflikar */}
      <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <div className="flex gap-2 pb-1">
          <button
            onClick={() => setCategory(null)}
            className={`shrink-0 rounded-full px-5 py-2.5 text-sm font-medium transition-all ${
              category === null
                ? "bg-kol text-krita"
                : "bg-linne text-mull hover:bg-sand/60 hover:text-kol"
            }`}
          >
            Allt garn
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`shrink-0 rounded-full px-5 py-2.5 text-sm font-medium transition-all ${
                category === cat
                  ? "bg-kol text-krita"
                  : "bg-linne text-mull hover:bg-sand/60 hover:text-kol"
              }`}
            >
              {CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-8 flex items-center justify-between gap-3">
        <button
          onClick={() => setFiltersOpen((v) => !v)}
          className="flex items-center gap-2 rounded-full border border-kol/15 px-4 py-2.5 text-sm font-medium text-kol transition-colors hover:border-tegel hover:text-tegel lg:hidden"
          aria-expanded={filtersOpen}
        >
          Filter
          {activeFilterCount > 0 && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-tegel text-xs font-bold text-krita">
              {activeFilterCount}
            </span>
          )}
        </button>
        <p className="hidden text-sm text-mull lg:block">
          {filtered.length} {filtered.length === 1 ? "produkt" : "produkter"}
        </p>
        <label className="flex items-center gap-2 text-sm text-mull">
          <span className="hidden sm:inline">Sortera:</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="rounded-full border border-kol/15 bg-krita px-4 py-2.5 text-sm font-medium text-kol focus:outline-none focus:ring-2 focus:ring-tegel/40"
          >
            {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
              <option key={key} value={key}>
                {SORT_LABELS[key]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-6 grid gap-10 lg:grid-cols-[220px_1fr]">
        {/* Filterkolumn (desktop) / utfällbar (mobil) */}
        <aside className={`${filtersOpen ? "block" : "hidden"} lg:block`}>
          {filterPanel}
        </aside>

        <div>
          {filtered.length === 0 ? (
            <div className="rounded-3xl bg-linne/60 px-6 py-16 text-center">
              <p className="font-display text-xl font-semibold text-kol">
                Inget garn matchade dina filter
              </p>
              <p className="mt-2 text-sm text-mull">
                Prova att ta bort något filter — eller rensa alla och börja om.
              </p>
              <button
                onClick={clearFilters}
                className="mt-6 rounded-full bg-tegel px-6 py-3 text-sm font-semibold text-krita transition-colors hover:bg-tegel-dark"
              >
                Rensa filtren
              </button>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((p) => (
                <ProductCard key={p.slug} product={p} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
