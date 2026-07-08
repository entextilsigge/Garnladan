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

/**
 * Den PaymentIntent som följer med ett webhook-event (eller ett vanligt
 * retrieve-anrop) har bara `payment_method` som ett oexpanderat ID, och
 * denna Stripe SDK-version har tagit bort det äldre `charges`-fältet till
 * förmån för `latest_charge`. Ett riktat retrieve-anrop med expand behövs
 * alltså för att få fram den faktiska betalmetoden (t.ex. "card", "klarna")
 * istället för den generiska "stripe"-etiketten som sätts när
 * PaymentIntenten skapas. Delad mellan webhooken och den manuella
 * avstämningsknappen i admin, så båda vägarna sätter samma faktiska metod.
 */
export async function resolveActualPaymentMethod(paymentIntentId: string): Promise<string | null> {
  try {
    const pi = await getStripeClient().paymentIntents.retrieve(paymentIntentId, {
      expand: ["latest_charge"],
    });
    const charge = pi.latest_charge;
    if (charge && typeof charge === "object") {
      return charge.payment_method_details?.type ?? null;
    }
  } catch (err) {
    console.error(`[stripe] Kunde inte hämta betalmetod för ${paymentIntentId}`, err);
  }
  return null;
}
