import type { Metadata } from "next";
import CheckoutFlow from "@/components/CheckoutFlow";

export const metadata: Metadata = {
  title: "Kassa",
};

export default function CheckoutPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
      <h1 className="font-display text-4xl font-bold text-kol">Kassa</h1>
      <p className="mt-2 text-mull">
        Tryggt köp med 30 dagars öppet köp och snabb leverans från ladan.
      </p>
      <div className="mt-8">
        <CheckoutFlow />
      </div>
    </div>
  );
}
