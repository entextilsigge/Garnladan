// ---------------------------------------------------------------------------
// Checkout-klient för Garnladan.
//
// Dessa funktioner är de enda ställen som UI:t pratar betalning igenom.
// Idag anropar de mockade API-routes (/api/checkout/*) som simulerar en
// lyckad betalning. När Stripe eller Klarna kopplas in:
//
//   1. Byt implementationen i app/api/checkout/session/route.ts mot
//      stripe.checkout.sessions.create(...) eller Klarnas motsvarighet.
//   2. Byt app/api/checkout/confirm/route.ts mot verifiering av
//      session/webhook-status hos betalleverantören.
//
// Funktionssignaturerna nedan är designade för att inte behöva ändras.
// ---------------------------------------------------------------------------

import type { OrderAttribution } from "@/lib/data/orderStore";

// "stripe" täcker alla metoder Stripes Payment Element kan visa (kort,
// Klarna, m.fl.) — vilken som faktiskt användes avgörs av kunden i
// StripePaymentStep.tsx, inte i förväg. "kort"/"klarna" används bara av det
// mockade betalflödet.
export type PaymentMethod = "kort" | "klarna" | "stripe";

export interface ShippingDetails {
  firstName: string;
  lastName: string;
  email: string;
  address: string;
  postalCode: string;
  city: string;
  shippingMethod: "ombud" | "hem" | "ladan";
}

export interface CheckoutLineInput {
  slug: string;
  colorName: string;
  quantity: number;
}

export interface CheckoutSession {
  sessionId: string;
  amount: number;
  currency: "SEK";
}

export interface PaymentConfirmation {
  orderId: string;
  status: "paid";
  amount: number;
}

// Metadata (id/etikett/beskrivning) för leveransmetoderna — statiskt, ändras
// inte i admin. Själva PRISET för "ombud"/"hem" är ett admin-redigerbart
// flatrate (se ShippingSettings nedan); "ladan" (hämta i butiken) är alltid
// gratis. Ingen live-beräkning mot PostNords API — bara ett enkelt,
// utbytbart fast pris, se resolveShippingPrice.
export const SHIPPING_OPTIONS: {
  id: ShippingDetails["shippingMethod"];
  label: string;
  description: string;
}[] = [
  {
    id: "ombud",
    label: "PostNord — ombud",
    description: "Leverans till närmaste ombud, 1–3 vardagar",
  },
  {
    id: "hem",
    label: "Hemleverans",
    description: "Leverans till dörren kvällstid, 1–2 vardagar",
  },
  {
    id: "ladan",
    label: "Hämta i Vargön",
    description: "Hämta i vårt lager i Vargön — klar inom 2 timmar",
  },
];

/**
 * Admin-redigerbara fraktinställningar. Lagras via
 * lib/data/settingsStore.ts (server) och hämtas av klienten via
 * GET /api/settings (se lib/settings.tsx).
 */
export interface ShippingSettings {
  /** Flatrate-pris i kr för "PostNord — ombud". */
  ombudPrice: number;
  /** Flatrate-pris i kr för "Hemleverans". */
  hemPrice: number;
  freeShippingEnabled: boolean;
  freeShippingThreshold: number;
  /**
   * Fraktjakts eget shipping_product_id för respektive tjänst (uppdrag
   * 15) — kontospecifika, hämtas via Fraktjakts Shipping Products API och
   * fylls i manuellt av admin. null tills de är ifyllda; "Skapa
   * fraktsedel" är inaktiverad i admin för en leveransmetod utan ifyllt id.
   */
  fraktjaktOmbudProductId: number | null;
  fraktjaktHemProductId: number | null;
}

export const DEFAULT_SHIPPING_SETTINGS: ShippingSettings = {
  ombudPrice: 49,
  hemPrice: 89,
  freeShippingEnabled: true,
  freeShippingThreshold: 499,
  fraktjaktOmbudProductId: null,
  fraktjaktHemProductId: null,
};

/** Flatrate-priset för en leveransmetod, innan ev. fri frakt-gräns tillämpas. */
export function resolveShippingPrice(
  methodId: ShippingDetails["shippingMethod"],
  settings: Pick<ShippingSettings, "ombudPrice" | "hemPrice">
): number {
  if (methodId === "ombud") return settings.ombudPrice;
  if (methodId === "hem") return settings.hemPrice;
  return 0; // "ladan" — hämta i butiken är alltid gratis
}

/**
 * Den faktiska fraktkostnaden för en order: flatrate-priset för vald
 * leveransmetod, eller 0 om delsumman når fri frakt-gränsen (om aktiverad).
 * Används både server-side (app/api/checkout/session/route.ts, som äger
 * prisberäkningen) och klient-side (för att visa samma belopp i kassan).
 */
export function calculateShippingCost(
  subtotal: number,
  methodId: ShippingDetails["shippingMethod"],
  settings: ShippingSettings
): number {
  if (settings.freeShippingEnabled && subtotal >= settings.freeShippingThreshold) {
    return 0;
  }
  return resolveShippingPrice(methodId, settings);
}

/**
 * Skapar en checkout-session hos betalleverantören (mockad idag).
 * Motsvarar `stripe.checkout.sessions.create` / Klarna "create order".
 */
export async function createCheckoutSession(input: {
  lines: CheckoutLineInput[];
  shipping: ShippingDetails;
  paymentMethod: PaymentMethod;
  /** Marknadsföringsattribution insamlad från UTM-parametrar (se lib/attribution.ts). */
  attribution?: OrderAttribution;
}): Promise<CheckoutSession> {
  const res = await fetch("/api/checkout/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    // Servern ger ofta ett specifikt, användbart felmeddelande (t.ex. att en
    // vara tagit slut i lager eller att adressen är ogiltig) — visa det
    // istället för ett generiskt fel som gömmer varför köpet inte gick igenom.
    const data = await res.json().catch(() => null);
    throw new Error(data?.error || "Kunde inte starta betalningen. Försök igen.");
  }
  return res.json();
}

/**
 * Bekräftar betalningen för en session (mockad idag — lyckas alltid).
 * Motsvarar verifiering av Stripe-session / Klarna-order efter redirect.
 */
export async function confirmPayment(
  sessionId: string
): Promise<PaymentConfirmation> {
  const res = await fetch("/api/checkout/confirm", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId }),
  });
  if (!res.ok) {
    // Se createCheckoutSession ovan — visa serverns specifika felmeddelande
    // (t.ex. att lagret tagit slut sedan varan lades i korgen) om det finns.
    const data = await res.json().catch(() => null);
    throw new Error(data?.error || "Betalningen kunde inte bekräftas. Försök igen.");
  }
  return res.json();
}
