"use client";

import Link from "next/link";
import { useEffect } from "react";
import YarnImage from "@/components/YarnImage";
import { useCart } from "@/lib/cart";
import { formatPrice, FREE_SHIPPING_THRESHOLD } from "@/lib/format";

export default function CartDrawer() {
  const { lines, subtotal, isDrawerOpen, closeDrawer, setQuantity, removeItem } =
    useCart();

  useEffect(() => {
    if (!isDrawerOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeDrawer();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [isDrawerOpen, closeDrawer]);

  if (!isDrawerOpen) return null;

  const remaining = FREE_SHIPPING_THRESHOLD - subtotal;

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Varukorg">
      <button
        className="absolute inset-0 bg-kol/40 backdrop-blur-[2px]"
        onClick={closeDrawer}
        aria-label="Stäng varukorgen"
      />
      <aside className="absolute right-0 top-0 flex h-full w-full max-w-md animate-slide-in flex-col bg-krita shadow-lyft">
        <div className="flex items-center justify-between border-b border-kol/10 px-6 py-5">
          <h2 className="font-display text-xl font-bold text-kol">Din varukorg</h2>
          <button
            onClick={closeDrawer}
            className="flex h-9 w-9 items-center justify-center rounded-full text-kol transition-colors hover:bg-linne"
            aria-label="Stäng"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        {lines.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
            <p className="font-display text-lg text-kol">Varukorgen är tom</p>
            <p className="text-sm text-mull">
              Fyll den med något mjukt — ditt nästa projekt väntar.
            </p>
            <Link
              href="/produkter"
              onClick={closeDrawer}
              className="rounded-full bg-tegel px-6 py-3 text-sm font-semibold text-krita transition-colors hover:bg-tegel-dark"
            >
              Utforska sortimentet
            </Link>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {remaining > 0 ? (
                <p className="mb-4 rounded-xl bg-linne px-4 py-3 text-sm text-mull">
                  Handla för <strong className="text-kol">{formatPrice(remaining)}</strong> till
                  så bjuder vi på frakten.
                </p>
              ) : (
                <p className="mb-4 rounded-xl bg-gran/10 px-4 py-3 text-sm font-medium text-gran">
                  Fri frakt — du har handlat för över {formatPrice(FREE_SHIPPING_THRESHOLD)}!
                </p>
              )}
              <ul className="space-y-4">
                {lines.map((line) => (
                  <li
                    key={`${line.product.slug}-${line.colorway.name}`}
                    className="flex gap-4 rounded-2xl bg-white/70 p-3 ring-1 ring-kol/5"
                  >
                    <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl">
                      <YarnImage
                        colorway={line.colorway}
                        seed={line.product.slug}
                        band={false}
                        className="h-full w-full"
                      />
                    </div>
                    <div className="flex flex-1 flex-col">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-display text-[15px] font-semibold leading-tight text-kol">
                            {line.product.name}
                          </p>
                          <p className="mt-0.5 text-xs text-mull">
                            Färg: {line.colorway.name}
                          </p>
                        </div>
                        <button
                          onClick={() => removeItem(line.product.slug, line.colorway.name)}
                          className="text-xs text-mull underline-offset-2 transition-colors hover:text-tegel hover:underline"
                        >
                          Ta bort
                        </button>
                      </div>
                      <div className="mt-auto flex items-center justify-between pt-2">
                        <div className="flex items-center rounded-full border border-kol/15">
                          <button
                            onClick={() =>
                              setQuantity(line.product.slug, line.colorway.name, line.quantity - 1)
                            }
                            className="flex h-7 w-7 items-center justify-center rounded-full text-kol transition-colors hover:bg-linne"
                            aria-label="Minska antal"
                          >
                            −
                          </button>
                          <span className="w-7 text-center text-sm font-medium text-kol">
                            {line.quantity}
                          </span>
                          <button
                            onClick={() =>
                              setQuantity(line.product.slug, line.colorway.name, line.quantity + 1)
                            }
                            className="flex h-7 w-7 items-center justify-center rounded-full text-kol transition-colors hover:bg-linne"
                            aria-label="Öka antal"
                          >
                            +
                          </button>
                        </div>
                        <p className="text-sm font-semibold text-kol">
                          {formatPrice(line.lineTotal)}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <div className="border-t border-kol/10 bg-white/60 px-6 py-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-mull">Delsumma (inkl. moms)</p>
                <p className="font-display text-xl font-bold text-kol">
                  {formatPrice(subtotal)}
                </p>
              </div>
              <div className="mt-4 grid gap-2">
                <Link
                  href="/kassa"
                  onClick={closeDrawer}
                  className="rounded-full bg-tegel py-3.5 text-center text-sm font-semibold text-krita transition-all hover:bg-tegel-dark active:scale-[0.98]"
                >
                  Till kassan
                </Link>
                <Link
                  href="/varukorg"
                  onClick={closeDrawer}
                  className="rounded-full border border-kol/15 py-3 text-center text-sm font-medium text-kol transition-colors hover:bg-linne"
                >
                  Visa varukorgen
                </Link>
              </div>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
