import { NextResponse } from "next/server";
import { getStripeClient, isStripeConfigured } from "@/lib/stripe";
import { consumeSession, peekSession } from "@/lib/data/checkoutSessionStore";
import { adjustColorwayStock, reserveStockForItems } from "@/lib/data/productStore";
import { createOrderFromSession, generateOrderId } from "@/lib/orders";
import { logError } from "@/lib/data/errorLogStore";

// ---------------------------------------------------------------------------
// Skapar en riktig Stripe PaymentIntent för en redan skapad checkout-session
// (se app/api/checkout/session/route.ts — beloppet kommer alltid därifrån
// och räknas ALDRIG om här). Anropas bara av klienten när
// NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY är satt (components/checkout/
// StripePaymentStep.tsx) — annars körs det mockade flödet i
// app/api/checkout/confirm/route.ts istället.
//
// Ordern skapas redan här (med paymentStatus "pending"), inte i webhooken —
// så att den syns i admin som "Väntar betalning" medan kunden fortfarande
// fyller i sina kortuppgifter. Webhooken (app/api/webhooks/stripe/route.ts)
// flippar den sedan till "paid" eller "failed".
//
// Momshantering: priserna i produktkatalogen är redan momsinkluderade (25 %
// svensk moms, se README). automatic_tax läggs INTE på här — det skulle
// dubbelräkna momsen ovanpå ett redan momsinkluderat pris.
//
// Sessionen läses med peekSession (INTE consumeSession) innan Stripe-
// anropet, och konsumeras (tas bort) bara om anropet faktiskt lyckas. Om
// stripe.paymentIntents.create misslyckas (t.ex. nätverksfel) finns
// sessionen — och därmed kundens redan ifyllda leveransadress, fraktval och
// varukorg — kvar, så klienten kan försöka igen med samma sessionId utan
// att kunden behöver fylla i något på nytt (se StripePaymentStep.tsx).
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  if (!isStripeConfigured()) {
    return NextResponse.json(
      { error: "Stripe är inte konfigurerat på servern." },
      { status: 400 }
    );
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body.sessionId !== "string") {
    return NextResponse.json({ error: "sessionId krävs." }, { status: 400 });
  }

  const session = await peekSession(body.sessionId);
  if (!session) {
    return NextResponse.json(
      { error: "Sessionen hittades inte eller har redan använts." },
      { status: 400 }
    );
  }

  // Kontrollera och minska lagret ATOMÄRT innan Stripe ens kontaktas — annars
  // kan vi hinna dra ett kort för varor som inte längre finns, och två
  // samtidiga köp av samma sista enhet skulle kunna gå igenom. Se
  // reserveStockForItems för varför detta är race-safe.
  const reservation = await reserveStockForItems(session.items);
  if (!reservation.ok) {
    return NextResponse.json({ error: reservation.error }, { status: 409 });
  }

  const orderId = generateOrderId();
  const stripe = getStripeClient();

  let paymentIntent;
  try {
    paymentIntent = await stripe.paymentIntents.create({
      // Stripe vill ha beloppet i öre (minsta valutaenhet för SEK).
      amount: Math.round(session.amount * 100),
      currency: "sek",
      // Låter Klarna (och andra metoder) dyka upp automatiskt i Payment
      // Element så fort de är aktiverade i Stripe Dashboard — ingen extra
      // kod krävs här.
      automatic_payment_methods: { enabled: true },
      metadata: { orderId },
    });
  } catch (err) {
    // Stripe-anropet misslyckades EFTER att lagret redan reserverats — lägg
    // tillbaka det, annars är varorna permanent låsta utan att någon order
    // någonsin skapades.
    for (const item of session.items) {
      await adjustColorwayStock(item.slug, item.colorName, item.quantity);
    }
    await logError(
      err instanceof Error ? err.message : "Okänt fel vid PaymentIntent-skapande",
      "checkout/payment-intent"
    );
    // Visa aldrig Stripes råa felmeddelande för kunden — det kan innehålla
    // interna detaljer. Fullständigt fel finns i felloggen (logError ovan).
    return NextResponse.json(
      { error: "Kunde inte skapa betalningen hos Stripe. Försök igen." },
      { status: 502 }
    );
  }

  // Konsumera sessionen först nu när Stripe-anropet faktiskt lyckats.
  await consumeSession(body.sessionId);
  await createOrderFromSession(session, orderId, "pending", paymentIntent.id);

  return NextResponse.json({ clientSecret: paymentIntent.client_secret, orderId });
}
