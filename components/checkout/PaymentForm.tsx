"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { formatPrice } from "@/lib/format";

export default function PaymentForm({
  orderId,
  total,
  onBack,
}: {
  orderId: string;
  total: number;
  onBack: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;

    setSubmitting(true);
    setError(null);

    const { error: confirmError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/kassa/bekraftelse?order=${orderId}`,
      },
      // "if_required": undvik redirect för metoder som inte behöver det
      // (t.ex. kort utan 3D Secure) — Klarna m.fl. redirectar ändå.
      redirect: "if_required",
    });

    if (confirmError) {
      setError(confirmError.message ?? "Betalningen kunde inte genomföras. Försök igen.");
      setSubmitting(false);
      return;
    }

    // Ingen redirect behövdes — navigera manuellt till bekräftelsesidan,
    // som i sin tur avvaktar webhookens bekräftelse innan den visar "betald".
    router.push(`/kassa/bekraftelse?order=${orderId}`);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-3xl bg-white/70 p-6 shadow-mjuk ring-1 ring-kol/5 sm:p-8">
        <h2 className="font-display text-xl font-bold text-kol">Betalning</h2>
        <p className="mt-1 text-sm text-mull">
          Säker betalning via Stripe. Kort och Klarna visas automatiskt när
          de är aktiverade.
        </p>
        <div className="mt-5">
          <PaymentElement />
        </div>
      </div>

      {error && (
        <p className="rounded-2xl bg-tegel/10 px-5 py-4 text-sm font-medium text-tegel-dark">
          {error}
        </p>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={onBack}
          className="rounded-full border border-kol/15 px-8 py-4 text-sm font-medium text-kol transition-colors hover:bg-linne"
        >
          ← Tillbaka till leverans
        </button>
        <button
          type="submit"
          disabled={!stripe || !elements || submitting}
          className="flex-1 rounded-full bg-gran py-4 text-sm font-semibold text-krita transition-all hover:bg-gran-dark hover:shadow-lyft active:scale-[0.99] disabled:cursor-wait disabled:opacity-70"
        >
          {submitting ? "Behandlar betalningen…" : `Slutför köp — ${formatPrice(total)}`}
        </button>
      </div>
    </form>
  );
}
