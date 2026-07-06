"use client";

// Steg 3 i kassaflödet: bekräftelsen. Läser ordersammanfattningen som
// CheckoutFlow sparade i sessionStorage — vid riktig integration hämtas
// ordern istället från databasen via ordernumret i URL:en.

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatPrice } from "@/lib/format";

interface StoredOrder {
  orderId: string;
  total: number;
  email: string;
  firstName: string;
  shippingLabel: string;
  items: { name: string; color: string; quantity: number }[];
}

export default function ConfirmationPage() {
  const [order, setOrder] = useState<StoredOrder | null | undefined>(undefined);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("garnladan-last-order");
      setOrder(raw ? (JSON.parse(raw) as StoredOrder) : null);
    } catch {
      setOrder(null);
    }
  }, []);

  if (order === undefined) {
    return <div className="min-h-[50vh]" aria-hidden />;
  }

  if (order === null) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center sm:px-6">
        <h1 className="font-display text-3xl font-bold text-kol">
          Ingen beställning att visa
        </h1>
        <p className="mt-3 text-mull">
          Det ser ut som att du redan lämnat den här sidan, eller inte har
          genomfört något köp ännu.
        </p>
        <Link
          href="/produkter"
          className="mt-8 inline-block rounded-full bg-tegel px-8 py-3.5 text-sm font-semibold text-krita transition-colors hover:bg-tegel-dark"
        >
          Till sortimentet
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-14 sm:px-6 lg:py-20">
      <div className="animate-fade-up rounded-3xl bg-white/70 p-8 text-center shadow-mjuk ring-1 ring-kol/5 sm:p-12">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gran/10">
          <svg
            width="30"
            height="30"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#2E463A"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M4 12.5 9.5 18 20 6.5" />
          </svg>
        </div>
        <h1 className="mt-6 font-display text-3xl font-bold text-kol sm:text-4xl">
          Tack {order.firstName}, din beställning är mottagen!
        </h1>
        <p className="mt-4 text-mull">
          Ordernummer{" "}
          <strong className="font-semibold text-kol">{order.orderId}</strong>.
          En bekräftelse är på väg till{" "}
          <strong className="font-semibold text-kol">{order.email}</strong>.
          Vi packar din beställning i ladan inom 24 timmar.
        </p>

        <div className="mt-8 rounded-2xl bg-linne/60 p-6 text-left">
          <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-mull">
            Din beställning
          </h2>
          <ul className="mt-3 divide-y divide-kol/[0.07]">
            {order.items.map((item, i) => (
              <li key={i} className="flex justify-between gap-3 py-2.5 text-sm">
                <span className="text-kol">
                  {item.name}
                  <span className="text-mull"> · {item.color}</span>
                </span>
                <span className="shrink-0 font-medium text-kol">{item.quantity} st</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex justify-between border-t border-kol/10 pt-3 text-sm">
            <span className="text-mull">{order.shippingLabel}</span>
            <span className="font-display text-base font-bold text-kol">
              Totalt {formatPrice(order.total)}
            </span>
          </div>
        </div>

        <Link
          href="/"
          className="mt-8 inline-block rounded-full bg-kol px-9 py-3.5 text-sm font-semibold text-krita transition-all hover:bg-tegel active:scale-95"
        >
          Tillbaka till startsidan
        </Link>
        <p className="mt-4 text-xs text-mull">
          Demo: ingen riktig betalning har genomförts och inget mejl skickas.
        </p>
      </div>
    </div>
  );
}
