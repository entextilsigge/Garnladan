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

export type PaymentMethod = "kort" | "klarna";

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

export const SHIPPING_OPTIONS: {
  id: ShippingDetails["shippingMethod"];
  label: string;
  description: string;
  price: number;
}[] = [
  {
    id: "ombud",
    label: "PostNord — ombud",
    description: "Leverans till närmaste ombud, 1–3 vardagar",
    price: 49,
  },
  {
    id: "hem",
    label: "Hemleverans",
    description: "Leverans till dörren kvällstid, 1–2 vardagar",
    price: 89,
  },
  {
    id: "ladan",
    label: "Hämta i ladan",
    description: "Hämta i vår butik i Leksand — klar inom 2 timmar",
    price: 0,
  },
];

/**
 * Skapar en checkout-session hos betalleverantören (mockad idag).
 * Motsvarar `stripe.checkout.sessions.create` / Klarna "create order".
 */
export async function createCheckoutSession(input: {
  lines: CheckoutLineInput[];
  shipping: ShippingDetails;
  paymentMethod: PaymentMethod;
}): Promise<CheckoutSession> {
  const res = await fetch("/api/checkout/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    throw new Error("Kunde inte starta betalningen. Försök igen.");
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
    throw new Error("Betalningen kunde inte bekräftas. Försök igen.");
  }
  return res.json();
}
