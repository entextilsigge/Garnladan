"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import ProductLineThumb from "@/components/ProductLineThumb";
import StripePaymentStep from "@/components/checkout/StripePaymentStep";
import { useCart } from "@/lib/cart";
import { formatPrice } from "@/lib/format";
import { useSettings } from "@/lib/settings";
import { readStoredAttribution } from "@/lib/attribution";
import {
  createCheckoutSession,
  confirmPayment,
  calculateShippingCost,
  SHIPPING_OPTIONS,
  type PaymentMethod,
  type ShippingDetails,
} from "@/lib/checkout";

// Så länge NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY saknas körs det befintliga
// mockade betalflödet automatiskt (se app/api/checkout/confirm/route.ts).
// Så fort nyckeln finns i miljön används StripePaymentStep istället, utan
// att någon kod behöver ändras.
const stripeEnabled = Boolean(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

type Step = "leverans" | "betalning";

const EMPTY_SHIPPING: ShippingDetails = {
  firstName: "",
  lastName: "",
  email: "",
  address: "",
  postalCode: "",
  city: "",
  shippingMethod: "ombud",
};

const inputClass =
  "w-full rounded-xl border border-kol/15 bg-white/80 px-4 py-3 text-sm text-kol placeholder:text-mull/50 focus:border-tegel focus:outline-none focus:ring-2 focus:ring-tegel/25";

// Obligatorisk innan en order kan slutföras — se checket i handlePayment
// (mockat flöde) respektive termsAccepted-proppen till Stripe-flödet.
function TermsCheckbox({
  checked,
  onChange,
  error,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  error?: string | null;
}) {
  return (
    <div className="rounded-2xl bg-linne/50 p-4">
      <label className="flex cursor-pointer items-start gap-3 text-sm text-kol">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="mt-0.5 h-4 w-4 accent-tegel"
        />
        <span>
          Jag har läst och godkänner{" "}
          <Link href="/villkor" target="_blank" className="text-tegel underline underline-offset-2">
            villkoren
          </Link>{" "}
          samt{" "}
          <Link href="/integritetspolicy" target="_blank" className="text-tegel underline underline-offset-2">
            integritetspolicyn
          </Link>
          .
        </span>
      </label>
      {error && <p className="mt-2 text-xs font-medium text-tegel-dark">{error}</p>}
    </div>
  );
}

export default function CheckoutFlow() {
  const router = useRouter();
  const { lines, subtotal, clearCart } = useCart();
  const settings = useSettings();
  const [step, setStep] = useState<Step>("leverans");
  const [shipping, setShipping] = useState<ShippingDetails>(EMPTY_SHIPPING);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("kort");
  const [isProcessing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [termsError, setTermsError] = useState<string | null>(null);

  const shippingOption = SHIPPING_OPTIONS.find((o) => o.id === shipping.shippingMethod)!;
  const shippingCost = calculateShippingCost(subtotal, shipping.shippingMethod, settings);
  const total = subtotal + shippingCost;

  useEffect(() => {
    if (!stripeEnabled) {
      console.warn("Stripe-nycklar saknas, kör mockat betalflöde");
    }
  }, []);

  if (lines.length === 0 && !isProcessing) {
    return (
      <div className="mx-auto max-w-xl rounded-3xl bg-linne/60 px-6 py-16 text-center">
        <p className="font-display text-2xl font-semibold text-kol">
          Din varukorg är tom
        </p>
        <p className="mt-3 text-mull">
          Lägg något mjukt i korgen innan du går till kassan.
        </p>
        <Link
          href="/produkter"
          className="mt-7 inline-block rounded-full bg-tegel px-8 py-3.5 text-sm font-semibold text-krita transition-colors hover:bg-tegel-dark"
        >
          Till sortimentet
        </Link>
      </div>
    );
  }

  function updateField<K extends keyof ShippingDetails>(key: K, value: ShippingDetails[K]) {
    setShipping((prev) => ({ ...prev, [key]: value }));
  }

  function handleShippingSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStep("betalning");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handlePayment(e: React.FormEvent) {
    e.preventDefault();
    if (!termsAccepted) {
      setTermsError("Du måste godkänna villkoren för att slutföra köpet.");
      return;
    }
    setProcessing(true);
    setError(null);
    try {
      // 1. Skapa session hos "betalleverantören" (mockad idag)
      const session = await createCheckoutSession({
        lines: lines.map((l) => ({
          slug: l.product.slug,
          colorName: l.colorway.name,
          quantity: l.quantity,
        })),
        shipping,
        paymentMethod,
        attribution: readStoredAttribution(),
      });
      // 2. Bekräfta betalningen (här sker redirect till Stripe/Klarna i verkligheten)
      const confirmation = await confirmPayment(session.sessionId);
      // 3. Spara ordersammanfattning för bekräftelsesidan
      sessionStorage.setItem(
        "garnladan-last-order",
        JSON.stringify({
          orderId: confirmation.orderId,
          total: session.amount,
          email: shipping.email,
          firstName: shipping.firstName,
          shippingLabel: shippingOption.label,
          items: lines.map((l) => ({
            name: l.product.name,
            color: l.colorway.name,
            quantity: l.quantity,
          })),
        })
      );
      clearCart();
      router.push(`/kassa/bekraftelse?order=${confirmation.orderId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Något gick fel. Försök igen.");
      setProcessing(false);
    }
  }

  const steps: { id: Step | "bekraftelse"; label: string }[] = [
    { id: "leverans", label: "1. Leverans" },
    { id: "betalning", label: "2. Betalning" },
    { id: "bekraftelse", label: "3. Bekräftelse" },
  ];

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_360px]">
      <div>
        {/* Stegindikator */}
        <ol className="flex items-center gap-2 text-sm">
          {steps.map((s, i) => {
            const isActive = s.id === step;
            const isDone = s.id === "leverans" && step === "betalning";
            return (
              <li key={s.id} className="flex items-center gap-2">
                {i > 0 && <span className="h-px w-6 bg-kol/20 sm:w-10" aria-hidden />}
                <span
                  className={`rounded-full px-3.5 py-1.5 font-medium transition-colors ${
                    isActive
                      ? "bg-kol text-krita"
                      : isDone
                        ? "bg-gran/15 text-gran"
                        : "bg-linne text-mull"
                  }`}
                >
                  {isDone ? "✓ Leverans" : s.label}
                </span>
              </li>
            );
          })}
        </ol>

        {/* ------------------------------------------------- Steg 1: Leverans */}
        {step === "leverans" && (
          <form onSubmit={handleShippingSubmit} className="mt-8 space-y-6">
            <div className="rounded-3xl bg-white/70 p-6 shadow-mjuk ring-1 ring-kol/5 sm:p-8">
              <h2 className="font-display text-xl font-bold text-kol">
                Dina uppgifter
              </h2>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="firstName" className="mb-1.5 block text-sm font-medium text-kol">
                    Förnamn
                  </label>
                  <input
                    id="firstName"
                    required
                    autoComplete="given-name"
                    value={shipping.firstName}
                    onChange={(e) => updateField("firstName", e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="lastName" className="mb-1.5 block text-sm font-medium text-kol">
                    Efternamn
                  </label>
                  <input
                    id="lastName"
                    required
                    autoComplete="family-name"
                    value={shipping.lastName}
                    onChange={(e) => updateField("lastName", e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-kol">
                    E-postadress
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="Hit skickas orderbekräftelsen"
                    value={shipping.email}
                    onChange={(e) => updateField("email", e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="address" className="mb-1.5 block text-sm font-medium text-kol">
                    Gatuadress
                  </label>
                  <input
                    id="address"
                    required
                    autoComplete="street-address"
                    value={shipping.address}
                    onChange={(e) => updateField("address", e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="postalCode" className="mb-1.5 block text-sm font-medium text-kol">
                    Postnummer
                  </label>
                  <input
                    id="postalCode"
                    required
                    inputMode="numeric"
                    pattern="[0-9]{3}\s?[0-9]{2}"
                    title="Fem siffror, t.ex. 793 31"
                    autoComplete="postal-code"
                    value={shipping.postalCode}
                    onChange={(e) => updateField("postalCode", e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="city" className="mb-1.5 block text-sm font-medium text-kol">
                    Ort
                  </label>
                  <input
                    id="city"
                    required
                    autoComplete="address-level2"
                    value={shipping.city}
                    onChange={(e) => updateField("city", e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>
            </div>

            <div className="rounded-3xl bg-white/70 p-6 shadow-mjuk ring-1 ring-kol/5 sm:p-8">
              <h2 className="font-display text-xl font-bold text-kol">Leveranssätt</h2>
              <div className="mt-5 space-y-3">
                {SHIPPING_OPTIONS.map((option) => {
                  const optionCost = calculateShippingCost(subtotal, option.id, settings);
                  return (
                    <label
                      key={option.id}
                      className={`flex cursor-pointer items-center justify-between gap-4 rounded-2xl border p-4 transition-all ${
                        shipping.shippingMethod === option.id
                          ? "border-tegel bg-tegel/[0.05] ring-1 ring-tegel"
                          : "border-kol/10 hover:border-kol/30"
                      }`}
                    >
                      <span className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="shippingMethod"
                          checked={shipping.shippingMethod === option.id}
                          onChange={() => updateField("shippingMethod", option.id)}
                          className="h-4 w-4 accent-tegel"
                        />
                        <span>
                          <span className="block text-sm font-semibold text-kol">
                            {option.label}
                          </span>
                          <span className="block text-xs text-mull">{option.description}</span>
                        </span>
                      </span>
                      <span className="text-sm font-semibold text-kol">
                        {optionCost === 0 ? "Fritt" : formatPrice(optionCost)}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            <button
              type="submit"
              className="w-full rounded-full bg-tegel py-4 text-sm font-semibold text-krita transition-all hover:bg-tegel-dark hover:shadow-lyft active:scale-[0.99] sm:w-auto sm:px-14"
            >
              Fortsätt till betalning
            </button>
          </form>
        )}

        {/* ------------------------------------------------ Steg 2: Betalning */}
        {step === "betalning" && stripeEnabled && (
          <div className="mt-8 space-y-6">
            <TermsCheckbox
              checked={termsAccepted}
              onChange={(value) => {
                setTermsAccepted(value);
                if (value) setTermsError(null);
              }}
              error={termsError}
            />
            <StripePaymentStep
              shipping={shipping}
              shippingLabel={shippingOption.label}
              total={total}
              termsAccepted={termsAccepted}
              onRequireTerms={() => setTermsError("Du måste godkänna villkoren för att slutföra köpet.")}
              onBack={() => setStep("leverans")}
            />
          </div>
        )}

        {step === "betalning" && !stripeEnabled && (
          <form onSubmit={handlePayment} className="mt-8 space-y-6">
            <div className="rounded-3xl bg-white/70 p-6 shadow-mjuk ring-1 ring-kol/5 sm:p-8">
              <h2 className="font-display text-xl font-bold text-kol">
                Välj betalsätt
              </h2>
              <p className="mt-1 text-sm text-mull">
                Demoläge: ingen riktig betalning genomförs.
              </p>
              <div className="mt-5 space-y-3">
                <label
                  className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-4 transition-all ${
                    paymentMethod === "kort"
                      ? "border-tegel bg-tegel/[0.05] ring-1 ring-tegel"
                      : "border-kol/10 hover:border-kol/30"
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    checked={paymentMethod === "kort"}
                    onChange={() => setPaymentMethod("kort")}
                    className="h-4 w-4 accent-tegel"
                  />
                  <span>
                    <span className="block text-sm font-semibold text-kol">Kortbetalning</span>
                    <span className="block text-xs text-mull">
                      Visa, Mastercard — via Stripe (kopplas in senare)
                    </span>
                  </span>
                </label>
                <label
                  className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-4 transition-all ${
                    paymentMethod === "klarna"
                      ? "border-tegel bg-tegel/[0.05] ring-1 ring-tegel"
                      : "border-kol/10 hover:border-kol/30"
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    checked={paymentMethod === "klarna"}
                    onChange={() => setPaymentMethod("klarna")}
                    className="h-4 w-4 accent-tegel"
                  />
                  <span>
                    <span className="block text-sm font-semibold text-kol">Klarna</span>
                    <span className="block text-xs text-mull">
                      Betala direkt, senare eller delbetala (kopplas in senare)
                    </span>
                  </span>
                </label>
              </div>

              {paymentMethod === "kort" && (
                <div className="mt-5 grid gap-4 rounded-2xl bg-linne/50 p-5 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label htmlFor="cardNumber" className="mb-1.5 block text-sm font-medium text-kol">
                      Kortnummer
                    </label>
                    <input
                      id="cardNumber"
                      inputMode="numeric"
                      placeholder="1234 5678 9012 3456 (demo)"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label htmlFor="cardExpiry" className="mb-1.5 block text-sm font-medium text-kol">
                      Giltigt t.o.m.
                    </label>
                    <input id="cardExpiry" placeholder="MM/ÅÅ" className={inputClass} />
                  </div>
                  <div>
                    <label htmlFor="cardCvc" className="mb-1.5 block text-sm font-medium text-kol">
                      CVC
                    </label>
                    <input id="cardCvc" inputMode="numeric" placeholder="123" className={inputClass} />
                  </div>
                </div>
              )}
            </div>

            <TermsCheckbox
              checked={termsAccepted}
              onChange={(value) => {
                setTermsAccepted(value);
                if (value) setTermsError(null);
              }}
              error={termsError}
            />

            {error && (
              <p className="rounded-2xl bg-tegel/10 px-5 py-4 text-sm font-medium text-tegel-dark">
                {error}
              </p>
            )}

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => setStep("leverans")}
                className="rounded-full border border-kol/15 px-8 py-4 text-sm font-medium text-kol transition-colors hover:bg-linne"
              >
                ← Tillbaka till leverans
              </button>
              <button
                type="submit"
                disabled={isProcessing}
                className="flex-1 rounded-full bg-gran py-4 text-sm font-semibold text-krita transition-all hover:bg-gran-dark hover:shadow-lyft active:scale-[0.99] disabled:cursor-wait disabled:opacity-70"
              >
                {isProcessing ? "Behandlar betalningen…" : `Slutför köp — ${formatPrice(total)}`}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* -------------------------------------------------- Ordersammandrag */}
      <aside className="h-fit rounded-3xl bg-linne/70 p-6 lg:sticky lg:top-28">
        <h2 className="font-display text-xl font-bold text-kol">Din beställning</h2>
        <ul className="mt-4 space-y-3">
          {lines.map((line) => (
            <li
              key={`${line.product.slug}-${line.colorway.name}`}
              className="flex items-center gap-3"
            >
              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl">
                <ProductLineThumb
                  product={line.product}
                  colorway={line.colorway}
                  className="h-full w-full"
                />
              </div>
              <div className="flex-1 text-sm">
                <p className="font-medium leading-tight text-kol">{line.product.name}</p>
                <p className="text-xs text-mull">
                  {line.colorway.name} · {line.quantity} st
                </p>
              </div>
              <p className="text-sm font-medium text-kol">{formatPrice(line.lineTotal)}</p>
            </li>
          ))}
        </ul>
        <dl className="mt-5 space-y-2 border-t border-kol/10 pt-4 text-sm">
          <div className="flex justify-between">
            <dt className="text-mull">Delsumma</dt>
            <dd className="font-medium text-kol">{formatPrice(subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-mull">Frakt ({shippingOption.label})</dt>
            <dd className="font-medium text-kol">
              {shippingCost === 0 ? "Fritt" : formatPrice(shippingCost)}
            </dd>
          </div>
          <div className="flex justify-between border-t border-kol/10 pt-3">
            <dt className="font-semibold text-kol">Totalt inkl. moms</dt>
            <dd className="font-display text-lg font-bold text-kol">{formatPrice(total)}</dd>
          </div>
        </dl>
      </aside>
    </div>
  );
}
