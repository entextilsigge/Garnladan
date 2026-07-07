"use client";

import { useState } from "react";
import {
  CATEGORY_LABELS,
  COLOR_GROUP_SWATCHES,
  FIBER_LABELS,
  WEIGHT_LABELS,
  type Category,
  type ColorGroup,
  type Colorway,
  type Fiber,
  type Product,
  type WeightClass,
} from "@/lib/products";

interface FormState {
  name: string;
  category: Category;
  price: number;
  tagline: string;
  description: string;
  composition: string;
  fibers: Fiber[];
  weightClass: WeightClass;
  meterage: number;
  grams: number;
  needleSize: string;
  gauge: string;
  care: string;
  isNew: boolean;
  popularity: number;
  imageUrl: string;
  colorways: Colorway[];
}

const CATEGORIES = Object.keys(CATEGORY_LABELS) as Category[];
const WEIGHTS = Object.keys(WEIGHT_LABELS) as WeightClass[];
const FIBERS = Object.keys(FIBER_LABELS) as Fiber[];
const COLOR_GROUPS = Object.keys(COLOR_GROUP_SWATCHES) as ColorGroup[];

const inputClass =
  "w-full rounded-xl border border-kol/15 bg-white px-4 py-2.5 text-sm text-kol focus:border-tegel focus:outline-none focus:ring-2 focus:ring-tegel/25";
const inputClassSm =
  "w-full rounded-lg border border-kol/15 bg-white px-3 py-2 text-sm text-kol focus:border-tegel focus:outline-none focus:ring-2 focus:ring-tegel/25";

function emptyForm(): FormState {
  return {
    name: "",
    category: "ull",
    price: 89,
    tagline: "",
    description: "",
    composition: "",
    fibers: [],
    weightClass: "dk",
    meterage: 100,
    grams: 50,
    needleSize: "",
    gauge: "",
    care: "",
    isNew: false,
    popularity: 50,
    imageUrl: "",
    colorways: [{ name: "", hex: "#A64B33", group: "röd", stock: 10 }],
  };
}

function toForm(product: Product): FormState {
  return {
    name: product.name,
    category: product.category,
    price: product.price,
    tagline: product.tagline,
    description: product.description,
    composition: product.composition,
    fibers: product.fibers,
    weightClass: product.weightClass,
    meterage: product.meterage,
    grams: product.grams,
    needleSize: product.needleSize,
    gauge: product.gauge,
    care: product.care,
    isNew: Boolean(product.isNew),
    popularity: product.popularity,
    imageUrl: product.imageUrl ?? "",
    colorways: product.colorways.map((c) => ({ ...c })),
  };
}

export default function ProductForm({
  product,
  onClose,
  onSaved,
}: {
  product: Product | null;
  onClose: () => void;
  onSaved: (product: Product) => void;
}) {
  const [form, setForm] = useState<FormState>(product ? toForm(product) : emptyForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function updateColorway(index: number, patch: Partial<Colorway>) {
    setForm((prev) => ({
      ...prev,
      colorways: prev.colorways.map((c, i) => (i === index ? { ...c, ...patch } : c)),
    }));
  }

  function addColorway() {
    setForm((prev) => ({
      ...prev,
      colorways: [...prev.colorways, { name: "", hex: "#8A5A33", group: "brun", stock: 10 }],
    }));
  }

  function removeColorway(index: number) {
    setForm((prev) => ({ ...prev, colorways: prev.colorways.filter((_, i) => i !== index) }));
  }

  function toggleFiber(fiber: Fiber) {
    setForm((prev) => ({
      ...prev,
      fibers: prev.fibers.includes(fiber)
        ? prev.fibers.filter((f) => f !== fiber)
        : [...prev.fibers, fiber],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.name.trim()) return setError("Namn krävs.");
    if (form.fibers.length === 0) return setError("Välj minst en fiber.");
    if (form.colorways.some((c) => !c.name.trim() || !c.hex)) {
      return setError("Alla färgvarianter behöver namn och hexkod.");
    }

    setSaving(true);
    const payload = { ...form, imageUrl: form.imageUrl.trim() };

    try {
      const res = product
        ? await fetch(`/api/admin/products/${product.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/admin/products", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "Kunde inte spara produkten.");
        setSaving(false);
        return;
      }
      onSaved(data.product);
    } catch {
      setError("Kunde inte spara produkten. Försök igen.");
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-kol/40 px-4 py-8 backdrop-blur-[2px]">
      <div className="w-full max-w-3xl rounded-3xl bg-krita p-6 shadow-lyft sm:p-8">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl font-bold text-kol">
            {product ? `Redigera ${product.name}` : "Lägg till produkt"}
          </h2>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full text-kol transition-colors hover:bg-linne"
            aria-label="Stäng"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-kol">Namn</label>
              <input
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                className={inputClass}
                required
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-kol">Kategori</label>
              <select
                value={form.category}
                onChange={(e) => update("category", e.target.value as Category)}
                className={inputClass}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_LABELS[c]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-kol">Pris (SEK)</label>
              <input
                type="number"
                min={1}
                value={form.price}
                onChange={(e) => update("price", Number(e.target.value))}
                className={inputClass}
                required
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-kol">Kort tagline</label>
              <input
                value={form.tagline}
                onChange={(e) => update("tagline", e.target.value)}
                className={inputClass}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-kol">Beskrivning</label>
              <textarea
                value={form.description}
                onChange={(e) => update("description", e.target.value)}
                rows={4}
                className={inputClass}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-kol">
                Fibersammansättning (visas för kund)
              </label>
              <input
                value={form.composition}
                onChange={(e) => update("composition", e.target.value)}
                placeholder="t.ex. 100 % svensk ull"
                className={inputClass}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-kol">
                Fibrer (för filtrering)
              </label>
              <div className="flex flex-wrap gap-2">
                {FIBERS.map((f) => (
                  <button
                    type="button"
                    key={f}
                    onClick={() => toggleFiber(f)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                      form.fibers.includes(f)
                        ? "border-tegel bg-tegel/10 text-tegel"
                        : "border-kol/15 text-mull hover:border-kol/40"
                    }`}
                  >
                    {FIBER_LABELS[f]}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-kol">Garntjocklek</label>
              <select
                value={form.weightClass}
                onChange={(e) => update("weightClass", e.target.value as WeightClass)}
                className={inputClass}
              >
                {WEIGHTS.map((w) => (
                  <option key={w} value={w}>
                    {WEIGHT_LABELS[w]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-kol">
                Popularitet (0–100)
              </label>
              <input
                type="number"
                min={0}
                max={100}
                value={form.popularity}
                onChange={(e) => update("popularity", Number(e.target.value))}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-kol">Löpmeter</label>
              <input
                type="number"
                min={1}
                value={form.meterage}
                onChange={(e) => update("meterage", Number(e.target.value))}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-kol">Vikt (gram)</label>
              <input
                type="number"
                min={1}
                value={form.grams}
                onChange={(e) => update("grams", Number(e.target.value))}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-kol">
                Rekommenderad sticka
              </label>
              <input
                value={form.needleSize}
                onChange={(e) => update("needleSize", e.target.value)}
                placeholder="t.ex. 4–5 mm"
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-kol">Stickfasthet</label>
              <input
                value={form.gauge}
                onChange={(e) => update("gauge", e.target.value)}
                placeholder="t.ex. 18 m × 24 v = 10 × 10 cm"
                className={inputClass}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-kol">Tvättråd</label>
              <input
                value={form.care}
                onChange={(e) => update("care", e.target.value)}
                className={inputClass}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-kol">
                Bild-URL (valfri override)
              </label>
              <input
                value={form.imageUrl}
                onChange={(e) => update("imageUrl", e.target.value)}
                placeholder="https://... — lämna tomt för genererad illustration"
                className={inputClass}
              />
              <p className="mt-1 text-xs text-mull">
                Om satt visas denna riktiga bild istället för den genererade
                garnillustrationen, överallt på sajten.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                id="isNew"
                type="checkbox"
                checked={form.isNew}
                onChange={(e) => update("isNew", e.target.checked)}
                className="h-4 w-4 accent-tegel"
              />
              <label htmlFor="isNew" className="text-sm font-medium text-kol">
                Markera som nyhet
              </label>
            </div>
          </div>

          {/* Färgvarianter & lager */}
          <div>
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-semibold text-kol">
                Färgvarianter & lager
              </h3>
              <button
                type="button"
                onClick={addColorway}
                className="text-sm font-medium text-tegel hover:underline"
              >
                + Lägg till färg
              </button>
            </div>
            <div className="mt-3 space-y-3">
              {form.colorways.map((c, i) => (
                <div
                  key={i}
                  className="grid grid-cols-[auto_1fr_1fr_1fr_auto] items-center gap-2 rounded-xl bg-linne/50 p-3"
                >
                  <input
                    type="color"
                    value={c.hex}
                    onChange={(e) => updateColorway(i, { hex: e.target.value })}
                    className="h-9 w-9 rounded-lg border-0 bg-transparent"
                    aria-label="Färgkulör"
                  />
                  <input
                    value={c.name}
                    onChange={(e) => updateColorway(i, { name: e.target.value })}
                    placeholder="Färgnamn"
                    className={inputClassSm}
                  />
                  <select
                    value={c.group}
                    onChange={(e) => updateColorway(i, { group: e.target.value as ColorGroup })}
                    className={inputClassSm}
                  >
                    {COLOR_GROUPS.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min={0}
                    value={c.stock}
                    onChange={(e) => updateColorway(i, { stock: Number(e.target.value) })}
                    placeholder="Lager (st)"
                    className={inputClassSm}
                  />
                  <button
                    type="button"
                    onClick={() => removeColorway(i)}
                    disabled={form.colorways.length <= 1}
                    className="text-xs font-medium text-tegel disabled:opacity-30"
                  >
                    Ta bort
                  </button>
                </div>
              ))}
            </div>
          </div>

          {error && (
            <p className="rounded-2xl bg-tegel/10 px-5 py-3.5 text-sm font-medium text-tegel-dark">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-3 border-t border-kol/10 pt-5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-kol/15 px-6 py-3 text-sm font-medium text-kol transition-colors hover:bg-linne"
            >
              Avbryt
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-full bg-tegel px-8 py-3 text-sm font-semibold text-krita transition-colors hover:bg-tegel-dark disabled:opacity-60"
            >
              {saving ? "Sparar…" : "Spara produkt"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
