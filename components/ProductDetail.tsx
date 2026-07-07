"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
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

  const isSoldOut = selectedColor.stock <= 0;

  // Håll antalet inom lagersaldot när kunden byter färg
  useEffect(() => {
    setQuantity((q) => Math.min(Math.max(q, 1), Math.max(selectedColor.stock, 1)));
  }, [selectedColor]);

  // Tre vyer per färg: härva, alternativ vinkel, stickad närbild — hoppas
  // helt över om en riktig produktbild finns inlagd i admin.
  const images = [
    { variant: "skein" as const, seed: `${product.slug}-a`, band: true },
    { variant: "skein" as const, seed: `${product.slug}-b`, band: false },
    { variant: "detail" as const, seed: `${product.slug}-c`, band: false },
  ];

  function handleAddToCart() {
    if (isSoldOut) return;
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
        {product.images && product.images.length > 0 ? (
          <>
            <div className="relative aspect-square overflow-hidden rounded-3xl shadow-mjuk ring-1 ring-kol/5">
              <Image
                key={product.images[activeImage]?.id}
                src={product.images[activeImage]?.url ?? product.images[0].url}
                alt={product.name}
                fill
                sizes="(min-width: 1024px) 50vw, 100vw"
                priority
                className="object-cover"
              />
            </div>
            {product.images.length > 1 && (
              <div className="mt-4 grid grid-cols-3 gap-3">
                {product.images.map((img, i) => (
                  <button
                    key={img.id}
                    onClick={() => setActiveImage(i)}
                    className={`relative aspect-square overflow-hidden rounded-2xl ring-2 transition-all ${
                      activeImage === i
                        ? "ring-tegel"
                        : "ring-transparent opacity-70 hover:opacity-100"
                    }`}
                    aria-label={`Visa bild ${i + 1}`}
                  >
                    <Image src={img.url} alt="" fill sizes="200px" className="object-cover" />
                  </button>
                ))}
              </div>
            )}
          </>
        ) : product.imageUrl ? (
          <div className="overflow-hidden rounded-3xl shadow-mjuk ring-1 ring-kol/5">
            {/* Äldre manuell URL-override, godtycklig extern host — kan inte
                köras genom next/image utan att den vitlistas i
                next.config.mjs, så en vanlig <img> används här. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={product.imageUrl}
              alt={product.name}
              className="h-full w-full object-cover"
            />
          </div>
        ) : (
          <>
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
          </>
        )}
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
            {isSoldOut && (
              <span className="ml-2 font-semibold text-tegel">— slut i lager</span>
            )}
          </p>
          <div className="mt-3 flex flex-wrap gap-2.5">
            {product.colorways.map((c) => (
              <button
                key={c.name}
                onClick={() => setSelectedColor(c)}
                title={c.stock <= 0 ? `${c.name} — slut i lager` : c.name}
                className={`relative h-11 w-11 rounded-full ring-2 ring-offset-2 ring-offset-krita transition-all hover:scale-110 ${
                  selectedColor.name === c.name ? "ring-tegel" : "ring-kol/10"
                } ${c.stock <= 0 ? "opacity-40" : ""}`}
                style={{ backgroundColor: c.hex }}
                aria-label={
                  c.stock <= 0 ? `Välj färgen ${c.name} (slut i lager)` : `Välj färgen ${c.name}`
                }
                aria-pressed={selectedColor.name === c.name}
              >
                {c.stock <= 0 && (
                  <span
                    className="pointer-events-none absolute inset-0 rounded-full"
                    style={{
                      background:
                        "linear-gradient(45deg, transparent 46%, #241C14 48%, #241C14 52%, transparent 54%)",
                    }}
                    aria-hidden
                  />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Antal + köpknapp */}
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <div className="flex items-center rounded-full border border-kol/15">
            <button
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              disabled={isSoldOut}
              className="flex h-12 w-12 items-center justify-center rounded-full text-lg text-kol transition-colors hover:bg-linne disabled:opacity-40"
              aria-label="Minska antal"
            >
              −
            </button>
            <span className="w-10 text-center font-medium text-kol">{quantity}</span>
            <button
              onClick={() => setQuantity((q) => Math.min(q + 1, selectedColor.stock))}
              disabled={isSoldOut || quantity >= selectedColor.stock}
              className="flex h-12 w-12 items-center justify-center rounded-full text-lg text-kol transition-colors hover:bg-linne disabled:opacity-40"
              aria-label="Öka antal"
            >
              +
            </button>
          </div>
          <button
            onClick={handleAddToCart}
            disabled={isSoldOut}
            className={`flex-1 rounded-full px-8 py-3.5 text-sm font-semibold text-krita transition-all active:scale-[0.98] sm:flex-none sm:px-12 ${
              isSoldOut
                ? "cursor-not-allowed bg-mull/40"
                : justAdded
                  ? "bg-gran"
                  : "bg-tegel hover:bg-tegel-dark hover:shadow-lyft"
            }`}
          >
            {isSoldOut
              ? "Slut i lager"
              : justAdded
                ? "Tillagd i varukorgen ✓"
                : "Lägg i varukorgen"}
          </button>
        </div>

        <p className="mt-4 text-sm text-mull">
          {isSoldOut
            ? `${selectedColor.name} är slut just nu — välj en annan färg eller kom tillbaka snart.`
            : `${selectedColor.stock} st i lager · Skickas inom 24 timmar · Fri frakt över 499 kr`}
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
