import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripeClient, isStripeConfigured } from "@/lib/stripe";
import { getOrderById, updatePaymentMethod, updatePaymentStatus } from "@/lib/data/orderStore";
import { hasProcessedEvent, markEventProcessed } from "@/lib/data/webhookEventStore";
import { logError } from "@/lib/data/errorLogStore";
import { sendOrderConfirmationEmail } from "@/lib/email";

// ---------------------------------------------------------------------------
// Stripe-webhook — SANNINGSKÄLLAN för om en order faktiskt är betald.
//
// Klientens redirect efter stripe.confirmPayment() används aldrig för att
// markera en order som betald (se app/kassa/bekraftelse/page.tsx, som bara
// visar en väntar-status tills den här webhooken har körts). Detta skyddar
// mot t.ex. avbrutna redirects, stängda flikar eller manipulerad
// klientkod.
//
// Konfiguration i Stripe Dashboard (se README.md för fullständig lista):
//   1. Developers → Webhooks → Add endpoint
//   2. URL: https://<din-domän>/api/webhooks/stripe
//   3. Prenumerera på: payment_intent.succeeded, payment_intent.payment_failed
//   4. Kopiera "Signing secret" till miljövariabeln STRIPE_WEBHOOK_SECRET
//
// IDEMPOTENS: Stripe garanterar inte "exactly once"-leverans — samma
// event.id kan komma flera gånger (retry vid timeout, nätverksstrul innan
// vårt 200-svar hinner fram, etc). Utan spärren nedan skulle en upprepad
// payment_intent.succeeded kunna skicka dubbla bekräftelsemejl. Se
// lib/data/webhookEventStore.ts.
//
// KÄND BEGRÄNSNING: lagret som reserverades vid PaymentIntent-skapande (se
// app/api/checkout/payment-intent/route.ts) läggs INTE automatiskt tillbaka
// om betalningen misslyckas här — en PaymentIntent kan få flera
// betalförsök (kunden provar ett nytt kort efter ett avvisat), så en
// automatisk återläggning vid payment_intent.payment_failed riskerar att
// lagret läggs tillbaka en gång för mycket om kunden sedan lyckas på ett
// senare försök. Hanteras manuellt av admin vid behov (redigera lagersaldo
// i produktformuläret) tills ett mer robust per-försök-flöde byggs.
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  if (!isStripeConfigured() || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json(
      { error: "Stripe-webhooken är inte konfigurerad." },
      { status: 400 }
    );
  }

  const signature = request.headers.get("stripe-signature");
  // Rå body-text krävs för Stripes signaturverifiering — JSON.parse/stringify
  // skulle kunna ändra byte-för-byte-innehållet och göra verifieringen ogiltig.
  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    event = getStripeClient().webhooks.constructEvent(
      rawBody,
      signature ?? "",
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("[stripe-webhook] Ogiltig signatur", err);
    logError(
      err instanceof Error ? err.message : "Ogiltig webhook-signatur",
      "webhooks/stripe:signature"
    );
    return NextResponse.json({ error: "Ogiltig signatur." }, { status: 400 });
  }

  // Redan hanterad — svara 200 direkt utan att köra logiken igen (annars
  // riskeras dubbla bekräftelsemejl eller dubbla effekter).
  if (hasProcessedEvent(event.id)) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    if (event.type === "payment_intent.succeeded" || event.type === "payment_intent.payment_failed") {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const orderId = paymentIntent.metadata?.orderId;

      if (orderId && getOrderById(orderId)) {
        const status = event.type === "payment_intent.succeeded" ? "paid" : "failed";
        const updated = updatePaymentStatus(orderId, status);
        if (updated && status === "paid") {
          const method = await resolveActualPaymentMethod(paymentIntent.id);
          if (method) updatePaymentMethod(orderId, method);
          await sendOrderConfirmationEmail(updated);
        }
      }
    }
  } catch (err) {
    logError(
      err instanceof Error ? err.message : "Okänt fel vid hantering av Stripe-webhook",
      `webhooks/stripe:${event.type}`
    );
    // Markera INTE som hanterad — låt Stripe försöka igen, det kan vara ett
    // tillfälligt fel (t.ex. att e-postutskicket misslyckades).
    return NextResponse.json({ error: "Internt fel vid hantering av händelsen." }, { status: 500 });
  }

  markEventProcessed(event.id);
  return NextResponse.json({ received: true });
}

/**
 * Den PaymentIntent som följer med webhook-eventet har bara `payment_method`
 * som ett oexpanderat ID, och den här Stripe SDK-versionen har tagit bort
 * det äldre `charges`-fältet till förmån för `latest_charge`. Ett riktat
 * retrieve-anrop med expand behövs alltså för att få fram den faktiska
 * betalmetoden (t.ex. "card", "klarna") istället för den generiska
 * "stripe"-etiketten som sätts när PaymentIntenten skapas.
 */
async function resolveActualPaymentMethod(paymentIntentId: string): Promise<string | null> {
  try {
    const pi = await getStripeClient().paymentIntents.retrieve(paymentIntentId, {
      expand: ["latest_charge"],
    });
    const charge = pi.latest_charge;
    if (charge && typeof charge === "object") {
      return charge.payment_method_details?.type ?? null;
    }
  } catch (err) {
    console.error(`[stripe-webhook] Kunde inte hämta betalmetod för ${paymentIntentId}`, err);
  }
  return null;
}
