"use client";

// Steg 3 i kassaflödet: bekräftelsen.
//
// Ordersammanfattningen (produkter, belopp, e-post) kommer från
// sessionStorage — sparad av CheckoutFlow/StripePaymentStep i samma
// webbläsarflik precis innan betalningen påbörjades. Det överlever en
// Stripe-redirect (t.ex. Klarna) eftersom sessionStorage inte rensas av
// navigering inom samma flik, bara när fliken stängs.
//
// Den FAKTISKA betalstatusen ("betald"/"väntar"/"misslyckad") hämtas alltid
// live från servern (/api/checkout/order-status) — vi litar aldrig på att
// klienten kom hit via en lyckad redirect. I mockat läge sätts statusen
// till "paid" direkt av servern, så den här sidan beter sig identiskt som
// innan Stripe kopplades in.

import Link from "next/link";
import { useEffect, useState } from "react";
import { useCart } from "@/lib/cart";

interface StoredOrder {
  orderId: string;
  total: number;
  email: string;
  firstName: string;
  shippingLabel: string;
  items: { name: string; color: string; quantity: number }[];
}

type PaymentStatus = "pending" | "paid" | "failed";

const stripeEnabled = Boolean(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

export default function ConfirmationPage() {
  const { clearCart } = useCart();
  const [orderId, setOrderId] = useState<string | null | undefined>(undefined);
  const [stored, setStored] = useState<StoredOrder | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | null>(null);
  const [statusError, setStatusError] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("order");
    setOrderId(id ?? null);

    try {
      const raw = sessionStorage.getItem("garnladan-last-order");
      if (raw) {
        const parsed = JSON.parse(raw) as StoredOrder;
        if (!id || parsed.orderId === id) setStored(parsed);
      }
    } catch {
      // Trasig/otillgänglig sessionStorage — visa bara statusen utan detaljer.
    }
  }, []);

  useEffect(() => {
    if (!orderId) return;
    let cancelled = false;

    fetch(`/api/checkout/order-status?orderId=${encodeURIComponent(orderId)}`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        if (!cancelled) setPaymentStatus(data.paymentStatus);
      })
      .catch(() => {
        if (!cancelled) setStatusError(true);
      });

    return () => {
      cancelled = true;
    };
  }, [orderId]);

  // Rensa varukorgen så fort vi vet att beställningen gick igenom (eller
  // väntar på bekräftelse) — men INTE vid ett misslyckat betalförsök, så
  // kunden kan försöka igen med varorna kvar.
  useEffect(() => {
    if (paymentStatus === "paid" || paymentStatus === "pending") {
      clearCart();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentStatus]);

  if (orderId === undefined) {
    return <div className="min-h-[50vh]" aria-hidden />;
  }

  if (orderId === null) {
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

  const isFailed = paymentStatus === "failed";
  const isPending = paymentStatus === "pending" || (paymentStatus === null && !statusError);

  return (
    <div className="mx-auto max-w-2xl px-4 py-14 sm:px-6 lg:py-20">
      <div className="animate-fade-up rounded-3xl bg-white/70 p-8 text-center shadow-mjuk ring-1 ring-kol/5 sm:p-12">
        {isFailed ? (
          <>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-tegel/10">
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#A64B33"
                strokeWidth="2.5"
                strokeLinecap="round"
                aria-hidden
              >
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </div>
            <h1 className="mt-6 font-display text-3xl font-bold text-kol sm:text-4xl">
              Betalningen kunde inte genomföras
            </h1>
            <p className="mt-4 text-mull">
              Ordernummer <strong className="font-semibold text-kol">{orderId}</strong>{" "}
              kunde inte betalas. Inga pengar har dragits — dina varor väntar
              kvar i varukorgen.
            </p>
            <Link
              href="/kassa"
              className="mt-8 inline-block rounded-full bg-tegel px-9 py-3.5 text-sm font-semibold text-krita transition-all hover:bg-tegel-dark active:scale-95"
            >
              Försök igen
            </Link>
          </>
        ) : (
          <>
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
              Tack{stored?.firstName ? ` ${stored.firstName}` : ""}, din
              beställning är mottagen!
            </h1>
            <p className="mt-4 text-mull">
              Ordernummer <strong className="font-semibold text-kol">{orderId}</strong>.{" "}
              {isPending
                ? "Vi väntar på bekräftelse från betalleverantören — det brukar bara ta någon sekund."
                : stored?.email
                  ? (
                    <>
                      En bekräftelse är på väg till{" "}
                      <strong className="font-semibold text-kol">{stored.email}</strong>.
                    </>
                  )
                  : "En bekräftelse skickas till din e-post."}{" "}
              Vi packar din beställning i ladan inom 24 timmar.
            </p>

            {stored && (
              <div className="mt-8 rounded-2xl bg-linne/60 p-6 text-left">
                <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-mull">
                  Din beställning
                </h2>
                <ul className="mt-3 divide-y divide-kol/[0.07]">
                  {stored.items.map((item, i) => (
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
                  <span className="text-mull">{stored.shippingLabel}</span>
                  <span className="font-display text-base font-bold text-kol">
                    Totalt {new Intl.NumberFormat("sv-SE", {
                      style: "currency",
                      currency: "SEK",
                      maximumFractionDigits: 0,
                    }).format(stored.total)}
                  </span>
                </div>
              </div>
            )}
          </>
        )}

        <Link
          href="/"
          className="mt-8 inline-block rounded-full bg-kol px-9 py-3.5 text-sm font-semibold text-krita transition-all hover:bg-tegel active:scale-95"
        >
          Tillbaka till startsidan
        </Link>
        {!stripeEnabled && (
          <p className="mt-4 text-xs text-mull">
            Demo: ingen riktig betalning har genomförts.
          </p>
        )}
      </div>
    </div>
  );
}
