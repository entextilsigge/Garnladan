import type { Metadata } from "next";
import CheckoutErrorBoundary from "@/components/CheckoutErrorBoundary";
import CheckoutFlow from "@/components/CheckoutFlow";

export const metadata: Metadata = {
  title: "Kassa",
  description: "Slutför ditt köp hos Garnladan — leverans, betalning och bekräftelse.",
  alternates: { canonical: "/kassa" },
  // Checkout-sidan har inget eget innehåll värt att indexera och innehåller
  // en kunds pågående köp — ska inte visas i sökresultat.
  robots: { index: false, follow: false },
};

export default function CheckoutPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
      <h1 className="font-display text-4xl font-bold text-kol">Kassa</h1>
      <p className="mt-2 text-mull">
        Tryggt köp med 14 dagars ångerrätt och snabb leverans från ladan.
      </p>
      <div className="mt-8">
        <CheckoutErrorBoundary>
          <CheckoutFlow />
        </CheckoutErrorBoundary>
      </div>
    </div>
  );
}
