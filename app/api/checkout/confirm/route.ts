import { NextResponse } from "next/server";
import { consumeSession } from "@/lib/data/checkoutSessionStore";
import { createOrder, type Order } from "@/lib/data/orderStore";
import { sendOrderConfirmationEmail } from "@/lib/email";
import { SHIPPING_OPTIONS } from "@/lib/checkout";

// ---------------------------------------------------------------------------
// MOCK: bekräfta betalning — lyckas alltid och genererar ett ordernummer.
//
// Vid riktig integration ersätts detta med verifiering hos
// betalleverantören, t.ex:
//
//   const session = await stripe.checkout.sessions.retrieve(sessionId);
//   if (session.payment_status !== "paid") { ...returnera fel... }
//
// Ordern sparas redan nu persistent (data/orders.json, se
// lib/data/orderStore.ts) och ett bekräftelsemejl skickas via Resend om
// RESEND_API_KEY är satt (se lib/email.ts) — båda delarna är redo att
// användas som de är även efter en riktig betalintegration.
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  if (!body || typeof body.sessionId !== "string" || !body.sessionId.startsWith("mock_sess_")) {
    return NextResponse.json(
      { error: "Ogiltig betalningssession." },
      { status: 400 }
    );
  }

  const session = consumeSession(body.sessionId);
  if (!session) {
    return NextResponse.json(
      { error: "Sessionen hittades inte eller har redan använts." },
      { status: 400 }
    );
  }

  // Simulera kort handläggningstid hos betalleverantören
  await new Promise((resolve) => setTimeout(resolve, 900));

  const orderId = `GL-${Math.floor(100000 + Math.random() * 900000)}`;
  const shippingOption = SHIPPING_OPTIONS.find(
    (o) => o.id === session.shipping.shippingMethod
  );

  const order: Order = {
    id: orderId,
    createdAt: new Date().toISOString(),
    status: "mottagen",
    customer: {
      firstName: session.shipping.firstName,
      lastName: session.shipping.lastName,
      email: session.shipping.email,
      address: session.shipping.address,
      postalCode: session.shipping.postalCode,
      city: session.shipping.city,
    },
    shippingMethod: session.shipping.shippingMethod,
    shippingLabel: shippingOption?.label ?? session.shipping.shippingMethod,
    paymentMethod: session.paymentMethod,
    items: session.items,
    subtotal: session.subtotal,
    shippingCost: session.shippingCost,
    total: session.amount,
    attribution: session.attribution,
  };

  createOrder(order);
  await sendOrderConfirmationEmail(order);

  return NextResponse.json({ orderId, status: "paid" as const, amount: session.amount });
}
