"use client";

import { useState } from "react";
import YarnImage from "@/components/YarnImage";
import { useCart } from "@/lib/cart";
import { formatPrice } from "@/lib/format";
import { WEIGHT_LABELS, type Product } from "@/lib/products";

export default function ProductDetail({ product }: { product: Product }) {
  const { addItem } = useCart();
  const [selectedColor, setSelectedColor] = useState(product.colorways[0]);
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState(0);
  const [justAdded, setJustAdded] = useState(false);

  // Tre vyer per färg: härva, alternativ vinkel, stickad närbild
  const images = [
    { variant: "skein" as const, seed: `${product.slug}-a`, band: true },
    { variant: "skein" as const, seed: `${product.slug}-b`, band: false },
    { variant: "detail" as const, seed: `${product.slug}-c`, band: false },
  ];

  function handleAddToCart() {
    addItem(product.slug, selectedColor.name, quantity);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 2000);
  }

  const specs: [string, string][] = [
    ["Fibersammansättning", product.composition],
    ["Vikt per nystan", `${product.grams} g`],
    ["Löpmeter", `${product.meterage} m`],
    ["Garntjocklek", WEIGHT_LABELS[product.weightClass]],
    ["Rekommenderad sticka", product.needleSize],
    ["Stickfasthet", product.gauge],
    ["Tvättråd", product.care],
  ];

  return (
    <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
      {/* ------------------------------------------------------- Galleri -- */}
      <div>
        <div className="overflow-hidden rounded-3xl shadow-mjuk ring-1 ring-kol/5">
          <YarnImage
            key={`${selectedColor.name}-${activeImage}`}
            colorway={selectedColor}
            seed={images[activeImage].seed}
            variant={images[activeImage].variant}
            band={images[activeImage].band}
            className="h-full w-full"
          />
        </div>
        <div className="mt-4 grid grid-cols-3 gap-3">
          {images.map((img, i) => (
            <button
              key={img.seed}
              onClick={() => setActiveImage(i)}
              className={`overflow-hidden rounded-2xl ring-2 transition-all ${
                activeImage === i
                  ? "ring-tegel"
                  : "ring-transparent opacity-70 hover:opacity-100"
              }`}
              aria-label={
                img.variant === "detail"
                  ? "Visa närbild på stickad yta"
                  : `Visa härva, vy ${i + 1}`
              }
            >
              <YarnImage
                colorway={selectedColor}
                seed={img.seed}
                variant={img.variant}
                band={img.band}
                className="h-full w-full"
              />
            </button>
          ))}
        </div>
      </div>

      {/* ---------------------------------------------------------- Info -- */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-tegel">
          {product.composition}
        </p>
        <h1 className="mt-2 font-display text-4xl font-bold leading-tight text-kol">
          {product.name}
        </h1>
        <p className="mt-2 text-[17px] text-mull">{product.tagline}</p>

        <p className="mt-5 font-display text-3xl font-bold text-kol">
          {formatPrice(product.price)}
          <span className="ml-2 text-sm font-normal text-mull">
            / nystan à {product.grams} g
          </span>
        </p>

        {/* Färgväljare */}
        <div className="mt-7">
          <p className="text-sm font-semibold text-kol">
            Färg: <span className="font-normal text-mull">{selectedColor.name}</span>
          </p>
          <div className="mt-3 flex flex-wrap gap-2.5">
            {product.colorways.map((c) => (
              <button
                key={c.name}
                onClick={() => setSelectedColor(c)}
                title={c.name}
                className={`h-11 w-11 rounded-full ring-2 ring-offset-2 ring-offset-krita transition-all hover:scale-110 ${
                  selectedColor.name === c.name ? "ring-tegel" : "ring-kol/10"
                }`}
                style={{ backgroundColor: c.hex }}
                aria-label={`Välj färgen ${c.name}`}
                aria-pressed={selectedColor.name === c.name}
              />
            ))}
          </div>
        </div>

        {/* Antal + köpknapp */}
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <div className="flex items-center rounded-full border border-kol/15">
            <button
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="flex h-12 w-12 items-center justify-center rounded-full text-lg text-kol transition-colors hover:bg-linne"
              aria-label="Minska antal"
            >
              −
            </button>
            <span className="w-10 text-center font-medium text-kol">{quantity}</span>
            <button
              onClick={() => setQuantity((q) => q + 1)}
              className="flex h-12 w-12 items-center justify-center rounded-full text-lg text-kol transition-colors hover:bg-linne"
              aria-label="Öka antal"
            >
              +
            </button>
          </div>
          <button
            onClick={handleAddToCart}
            className={`flex-1 rounded-full px-8 py-3.5 text-sm font-semibold text-krita transition-all active:scale-[0.98] sm:flex-none sm:px-12 ${
              justAdded ? "bg-gran" : "bg-tegel hover:bg-tegel-dark hover:shadow-lyft"
            }`}
          >
            {justAdded ? "Tillagd i varukorgen ✓" : "Lägg i varukorgen"}
          </button>
        </div>

        <p className="mt-4 text-sm text-mull">
          Skickas inom 24 timmar · Fri frakt över 499 kr · 30 dagars öppet köp
        </p>

        {/* Beskrivning */}
        <div className="mt-8 border-t border-kol/10 pt-7">
          <h2 className="font-display text-lg font-semibold text-kol">Om garnet</h2>
          <p className="mt-3 leading-relaxed text-mull">{product.description}</p>
        </div>

        {/* Specifikationer */}
        <div className="mt-7 rounded-2xl bg-linne/60 p-6">
          <h2 className="font-display text-lg font-semibold text-kol">
            Tekniska specifikationer
          </h2>
          <dl className="mt-4 divide-y divide-kol/[0.07]">
            {specs.map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4 py-2.5 text-sm">
                <dt className="text-mull">{label}</dt>
                <dd className="text-right font-medium text-kol">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  );
}
