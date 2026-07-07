import { NextResponse } from "next/server";
import { consumeSession, peekSession } from "@/lib/data/checkoutSessionStore";
import { reserveStockForItems } from "@/lib/data/productStore";
import { sendOrderConfirmationEmail } from "@/lib/email";
import { createOrderFromSession, generateOrderId } from "@/lib/orders";

// ---------------------------------------------------------------------------
// MOCK: bekräfta betalning — lyckas alltid och genererar ett ordernummer.
//
// Körs bara när Stripe INTE är konfigurerat (se lib/stripe.ts och
// components/CheckoutFlow.tsx, som väljer detta flöde eller det riktiga
// baserat på om NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY finns). När Stripe är
// konfigurerat används istället app/api/checkout/payment-intent/route.ts +
// app/api/webhooks/stripe/route.ts, där webhooken — inte klienten — avgör
// om ordern faktiskt är betald.
//
// Ordern sparas persistent (data/orders.json) och ett bekräftelsemejl
// skickas direkt via Resend om RESEND_API_KEY är satt (se lib/email.ts).
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  if (!body || typeof body.sessionId !== "string" || !body.sessionId.startsWith("mock_sess_")) {
    return NextResponse.json(
      { error: "Ogiltig betalningssession." },
      { status: 400 }
    );
  }

  // Icke-destruktiv läsning innan lagret kontrolleras — sessionen konsumeras
  // (tas bort) bara om vi faktiskt går vidare, se samma resonemang i
  // app/api/checkout/payment-intent/route.ts.
  const session = peekSession(body.sessionId);
  if (!session) {
    return NextResponse.json(
      { error: "Sessionen hittades inte eller har redan använts." },
      { status: 400 }
    );
  }

  // Kontrollera och minska lagret ATOMÄRT innan ordern slutförs — annars
  // kan två samtidiga köp av samma sista enhet båda lyckas. Se
  // reserveStockForItems för varför detta är race-safe.
  const reservation = reserveStockForItems(session.items);
  if (!reservation.ok) {
    return NextResponse.json({ error: reservation.error }, { status: 409 });
  }

  consumeSession(body.sessionId);

  // Simulera kort handläggningstid hos betalleverantören
  await new Promise((resolve) => setTimeout(resolve, 900));

  const orderId = generateOrderId();
  const order = createOrderFromSession(session, orderId, "paid");

  await sendOrderConfirmationEmail(order);

  return NextResponse.json({ orderId, status: "paid" as const, amount: session.amount });
}
