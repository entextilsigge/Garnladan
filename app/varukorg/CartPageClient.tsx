"use client";

import Link from "next/link";
import YarnImage from "@/components/YarnImage";
import { useCart } from "@/lib/cart";
import { formatPrice } from "@/lib/format";
import { useSettings } from "@/lib/settings";

export default function CartPageClient() {
  const { lines, subtotal, setQuantity, removeItem } = useCart();
  const settings = useSettings();

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
      <h1 className="font-display text-4xl font-bold text-kol">Varukorg</h1>

      {lines.length === 0 ? (
        <div className="mt-10 rounded-3xl bg-linne/60 px-6 py-20 text-center">
          <p className="font-display text-2xl font-semibold text-kol">
            Här var det tomt
          </p>
          <p className="mx-auto mt-3 max-w-sm text-mull">
            Din varukorg väntar på att fyllas med något mjukt. Kanske en härva
            svensk ull, eller lite mohair att drömma i?
          </p>
          <Link
            href="/produkter"
            className="mt-8 inline-block rounded-full bg-tegel px-8 py-3.5 text-sm font-semibold text-krita transition-all hover:bg-tegel-dark hover:shadow-lyft"
          >
            Utforska sortimentet
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_340px]">
          <ul className="space-y-4">
            {lines.map((line) => (
              <li
                key={`${line.product.slug}-${line.colorway.name}`}
                className="flex gap-5 rounded-3xl bg-white/70 p-4 shadow-mjuk ring-1 ring-kol/5 sm:p-5"
              >
                <Link
                  href={`/produkt/${line.product.slug}`}
                  className="h-28 w-28 shrink-0 overflow-hidden rounded-2xl transition-opacity hover:opacity-85 sm:h-32 sm:w-32"
                >
                  <YarnImage
                    colorway={line.colorway}
                    seed={line.product.slug}
                    className="h-full w-full"
                  />
                </Link>
                <div className="flex flex-1 flex-col">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Link
                        href={`/produkt/${line.product.slug}`}
                        className="font-display text-lg font-semibold text-kol transition-colors hover:text-tegel"
                      >
                        {line.product.name}
                      </Link>
                      <p className="mt-1 flex items-center gap-2 text-sm text-mull">
                        <span
                          className="h-3.5 w-3.5 rounded-full ring-1 ring-kol/15"
                          style={{ backgroundColor: line.colorway.hex }}
                        />
                        {line.colorway.name} · {formatPrice(line.product.price)}/nystan
                      </p>
                    </div>
                    <button
                      onClick={() => removeItem(line.product.slug, line.colorway.name)}
                      className="text-sm text-mull underline-offset-2 transition-colors hover:text-tegel hover:underline"
                    >
                      Ta bort
                    </button>
                  </div>
                  <div className="mt-auto flex items-center justify-between pt-3">
                    <div className="flex items-center rounded-full border border-kol/15">
                      <button
                        onClick={() =>
                          setQuantity(line.product.slug, line.colorway.name, line.quantity - 1)
                        }
                        className="flex h-9 w-9 items-center justify-center rounded-full text-kol transition-colors hover:bg-linne"
                        aria-label="Minska antal"
                      >
                        −
                      </button>
                      <span className="w-9 text-center text-sm font-medium">
                        {line.quantity}
                      </span>
                      <button
                        onClick={() =>
                          setQuantity(line.product.slug, line.colorway.name, line.quantity + 1)
                        }
                        className="flex h-9 w-9 items-center justify-center rounded-full text-kol transition-colors hover:bg-linne"
                        aria-label="Öka antal"
                      >
                        +
                      </button>
                    </div>
                    <p className="font-display text-lg font-semibold text-kol">
                      {formatPrice(line.lineTotal)}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <aside className="h-fit rounded-3xl bg-linne/70 p-6 lg:sticky lg:top-28">
            <h2 className="font-display text-xl font-bold text-kol">Sammanfattning</h2>
            <dl className="mt-4 space-y-2.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-mull">Delsumma</dt>
                <dd className="font-medium text-kol">{formatPrice(subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-mull">Frakt</dt>
                <dd className="font-medium text-kol">
                  {settings.freeShippingEnabled && subtotal >= settings.freeShippingThreshold
                    ? "Fri frakt"
                    : "Beräknas i kassan"}
                </dd>
              </div>
            </dl>
            <div className="mt-4 flex justify-between border-t border-kol/10 pt-4">
              <p className="font-semibold text-kol">Totalt (inkl. moms)</p>
              <p className="font-display text-xl font-bold text-kol">
                {formatPrice(subtotal)}
              </p>
            </div>
            <Link
              href="/kassa"
              className="mt-6 block rounded-full bg-tegel py-4 text-center text-sm font-semibold text-krita transition-all hover:bg-tegel-dark hover:shadow-lyft active:scale-[0.98]"
            >
              Gå till kassan
            </Link>
            <Link
              href="/produkter"
              className="mt-3 block text-center text-sm font-medium text-mull transition-colors hover:text-tegel"
            >
              Fortsätt handla
            </Link>
          </aside>
        </div>
      )}
    </div>
  );
}
