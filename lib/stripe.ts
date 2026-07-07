import Stripe from "stripe";

// ---------------------------------------------------------------------------
// Stripe-klient (server-only).
//
// Så länge STRIPE_SECRET_KEY saknas i miljön körs hela sajten i mockat
// betalläge (se app/api/checkout/confirm/route.ts) — inget kraschar. Så
// fort nyckeln finns i miljön (lokalt i .env.local, eller i Vercels
// miljövariabler + en omdeploy) används denna klient automatiskt istället,
// utan att någon kod behöver ändras. Se README.md för fullständig lista
// över Stripe-relaterade miljövariabler och var de hittas i Stripe
// Dashboard.
// ---------------------------------------------------------------------------

let cachedClient: Stripe | null = null;

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim());
}

export function getStripeClient(): Stripe {
  if (!isStripeConfigured()) {
    throw new Error("STRIPE_SECRET_KEY saknas — kan inte skapa Stripe-klient.");
  }
  if (!cachedClient) {
    cachedClient = new Stripe(process.env.STRIPE_SECRET_KEY!.trim());
  }
  return cachedClient;
}
