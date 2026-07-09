"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { loadStripe, type Appearance } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import { useCart } from "@/lib/cart";
import { readStoredAttribution } from "@/lib/attribution";
import { createCheckoutSession, type CheckoutSession, type ShippingDetails } from "@/lib/checkout";
import PaymentForm from "@/components/checkout/PaymentForm";

const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const stripePromise = publishableKey ? loadStripe(publishableKey) : null;

// Approximerar varumärkets Fraunces/Karla-känsla och varma palett inom
// vad Stripes appearance-API tillåter (Elements renderas i en iframe och
// kan inte läsa vår egen CSS direkt).
const appearance: Appearance = {
  theme: "stripe",
  variables: {
    colorPrimary: "#A64B33",
    colorBackground: "#ffffff",
    colorText: "#241C14",
    colorDanger: "#A64B33",
    fontFamily: '"Karla", system-ui, sans-serif',
    borderRadius: "12px",
    spacingUnit: "4px",
  },
  rules: {
    ".Label": { fontWeight: "500", color: "#5E4C3A" },
    ".Input": { border: "1px solid rgba(36,28,20,0.15)", boxShadow: "none" },
    ".Input:focus": {
      borderColor: "#A64B33",
      boxShadow: "0 0 0 2px rgba(166,75,51,0.25)",
    },
    ".Tab": { border: "1px solid rgba(36,28,20,0.1)", borderRadius: "12px" },
    ".Tab--selected": { borderColor: "#A64B33", boxShadow: "0 0 0 1px #A64B33" },
  },
};

export default function StripePaymentStep({
  shipping,
  shippingLabel,
  total,
  termsAccepted,
  onRequireTerms,
  onBack,
}: {
  shipping: ShippingDetails;
  shippingLabel: string;
  total: number;
  termsAccepted: boolean;
  onRequireTerms: () => void;
  onBack: () => void;
}) {
  const { lines } = useCart();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  // Sessionen sparas i en ref (inte i state) så att ett retry-försök
  // återanvänder EXAKT samma session — och därmed kundens redan ifyllda
  // leveransadress, fraktval och varukorg — istället för att skapa en ny.
  // Sessionen konsumeras server-side bara om PaymentIntenten faktiskt
  // skapas (se app/api/checkout/payment-intent/route.ts), så den finns
  // kvar och kan återanvändas om just det anropet misslyckas.
  const sessionRef = useRef<CheckoutSession | null>(null);
  const mountedRef = useRef(true);

  const attemptPayment = useCallback(async () => {
    setError(null);
    try {
      let session = sessionRef.current;
      if (!session) {
        session = await createCheckoutSession({
          lines: lines.map((l) => ({
            slug: l.product.slug,
            colorName: l.colorway.name,
            quantity: l.quantity,
          })),
          shipping,
          paymentMethod: "stripe",
          attribution: readStoredAttribution(),
        });
        sessionRef.current = session;
      }

      const res = await fetch("/api/checkout/payment-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: session.sessionId }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error ?? "Något gick fel, försök igen.");
      }
      if (!mountedRef.current) return;

      // Sparas för bekräftelsesidan att visa medan den väntar på
      // webhookens bekräftelse — inte källan till om ordern är betald.
      sessionStorage.setItem(
        "garnladan-last-order",
        JSON.stringify({
          orderId: data.orderId,
          total: session.amount,
          email: shipping.email,
          firstName: shipping.firstName,
          shippingLabel,
          createdAt: new Date().toISOString(),
          items: lines.map((l) => ({
            name: l.product.name,
            color: l.colorway.name,
            quantity: l.quantity,
            price: l.lineTotal,
          })),
        })
      );

      setClientSecret(data.clientSecret);
      setOrderId(data.orderId);
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : "Något gick fel, försök igen.");
      }
    } finally {
      if (mountedRef.current) setRetrying(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shipping, shippingLabel]);

  useEffect(() => {
    mountedRef.current = true;
    attemptPayment();
    return () => {
      mountedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleRetry() {
    setRetrying(true);
    attemptPayment();
  }

  if (error) {
    return (
      <div className="space-y-6">
        <p className="rounded-2xl bg-tegel/10 px-5 py-4 text-sm font-medium text-tegel-dark">
          Något gick fel, försök igen. ({error})
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={handleRetry}
            disabled={retrying}
            className="rounded-full bg-tegel px-8 py-4 text-sm font-semibold text-krita transition-colors hover:bg-tegel-dark disabled:opacity-60"
          >
            {retrying ? "Försöker igen…" : "Försök igen"}
          </button>
          <button
            type="button"
            onClick={onBack}
            className="rounded-full border border-kol/15 px-8 py-4 text-sm font-medium text-kol transition-colors hover:bg-linne"
          >
            ← Tillbaka till leverans
          </button>
        </div>
      </div>
    );
  }

  if (!clientSecret || !orderId || !stripePromise) {
    return (
      <div className="rounded-3xl bg-white/70 p-8 text-center shadow-mjuk ring-1 ring-kol/5">
        <p className="text-sm text-mull">Förbereder betalningen…</p>
      </div>
    );
  }

  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret,
        appearance,
        locale: "sv",
        fonts: [
          {
            cssSrc: "https://fonts.googleapis.com/css2?family=Karla:wght@400;500;700&display=swap",
          },
        ],
      }}
    >
      <PaymentForm
        orderId={orderId}
        total={total}
        termsAccepted={termsAccepted}
        onRequireTerms={onRequireTerms}
        onBack={onBack}
      />
    </Elements>
  );
}
