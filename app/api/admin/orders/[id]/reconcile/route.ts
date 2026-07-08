import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedRequest } from "@/lib/adminAuth";
import { getStripeClient, isStripeConfigured } from "@/lib/stripe";
import { getOrderById } from "@/lib/data/orderStore";
import { applyPaymentIntentOutcome } from "@/lib/orders";
import { logError } from "@/lib/data/errorLogStore";

// ---------------------------------------------------------------------------
// Manuell avstämning mot Stripe — fångar upp fallet där en order fastnar
// som "pending" trots att kunden faktiskt debiterats, för att webhooken
// (app/api/webhooks/stripe/route.ts) av någon anledning aldrig kom fram
// (t.ex. STRIPE_WEBHOOK_SECRET glömdes bort vid deploy, eller Stripe hade
// ett tillfälligt leveransproblem). Slår upp PaymentIntentens FAKTISKA
// status direkt hos Stripe, oberoende av webhooken, och uppdaterar ordern
// om Stripe säger att den redan är klar.
//
// applyPaymentIntentOutcome (lib/orders.ts) är idempotent — om webhooken
// redan hunnit flippa ordern innan admin hinner klicka händer ingenting
// här (och tvärtom), så det är säkert att använda båda vägarna parallellt.
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  if (!isAuthorizedRequest(request)) {
    return NextResponse.json({ error: "Ej inloggad." }, { status: 401 });
  }
  if (!isStripeConfigured()) {
    return NextResponse.json(
      { error: "Stripe är inte konfigurerat på servern." },
      { status: 400 }
    );
  }

  const order = await getOrderById(params.id);
  if (!order) {
    return NextResponse.json({ error: "Ordern hittades inte." }, { status: 404 });
  }
  if (!order.paymentIntentId) {
    return NextResponse.json(
      { error: "Ordern saknar ett Stripe-betalnings-id och kan inte stämmas av (mockad/manuell order)." },
      { status: 400 }
    );
  }
  if (order.paymentStatus !== "pending") {
    return NextResponse.json(
      { error: `Ordern är redan i status "${order.paymentStatus}" — ingen avstämning behövs.`, order },
      { status: 400 }
    );
  }

  let paymentIntent;
  try {
    paymentIntent = await getStripeClient().paymentIntents.retrieve(order.paymentIntentId);
  } catch (err) {
    logError(
      err instanceof Error ? err.message : "Okänt fel vid avstämning mot Stripe",
      `admin/orders/${params.id}/reconcile`
    );
    return NextResponse.json(
      { error: "Kunde inte slå upp betalningen hos Stripe. Försök igen." },
      { status: 502 }
    );
  }

  if (paymentIntent.status === "succeeded") {
    const result = await applyPaymentIntentOutcome(params.id, "paid", paymentIntent.id);
    return NextResponse.json({
      order: result.order,
      message: result.changed
        ? "Stripe bekräftar att betalningen gått igenom — ordern är nu markerad som betald."
        : "Ordern hade redan uppdaterats (troligen av webhooken precis innan).",
    });
  }

  if (paymentIntent.status === "canceled") {
    const result = await applyPaymentIntentOutcome(params.id, "failed", paymentIntent.id);
    return NextResponse.json({
      order: result.order,
      message: "Stripe visar att betalningen avbröts — ordern är nu markerad som misslyckad.",
    });
  }

  // Fortfarande inget slutgiltigt utfall hos Stripe (t.ex.
  // "requires_payment_method", "requires_action", "processing") — kunden
  // har inte slutfört betalningen än, det är inte ett tecken på ett
  // tekniskt fel i vår kod.
  return NextResponse.json({
    order,
    message: `Stripe visar status "${paymentIntent.status}" — betalningen är ännu inte slutförd av kunden.`,
  });
}
