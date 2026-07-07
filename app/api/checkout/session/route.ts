import { NextResponse } from "next/server";
import { getProductBySlug } from "@/lib/data/productStore";
import { SHIPPING_OPTIONS } from "@/lib/checkout";
import { FREE_SHIPPING_THRESHOLD } from "@/lib/format";
import { saveSession } from "@/lib/data/checkoutSessionStore";
import { DEFAULT_ATTRIBUTION } from "@/lib/attribution";

// ---------------------------------------------------------------------------
// MOCK: skapa checkout-session.
//
// Vid riktig integration ersätts innehållet med t.ex:
//
//   const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
//   const session = await stripe.checkout.sessions.create({
//     line_items, mode: "payment", currency: "sek", ...
//   });
//   return NextResponse.json({ sessionId: session.id, ... });
//
// Beloppet beräknas alltid på servern utifrån produktdata — aldrig
// från klienten — så den delen är redan produktionsriktig.
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  if (!body || !Array.isArray(body.lines) || body.lines.length === 0) {
    return NextResponse.json(
      { error: "Varukorgen är tom eller ogiltig." },
      { status: 400 }
    );
  }

  let subtotal = 0;
  const resolvedItems: {
    slug: string;
    name: string;
    colorName: string;
    quantity: number;
    unitPrice: number;
  }[] = [];

  for (const line of body.lines) {
    const product = getProductBySlug(line.slug);
    if (!product || typeof line.quantity !== "number" || line.quantity < 1) {
      return NextResponse.json(
        { error: "En produkt i varukorgen kunde inte hittas." },
        { status: 400 }
      );
    }
    subtotal += product.price * line.quantity;
    resolvedItems.push({
      slug: product.slug,
      name: product.name,
      colorName: line.colorName,
      quantity: line.quantity,
      unitPrice: product.price,
    });
  }

  const shippingOption = SHIPPING_OPTIONS.find(
    (o) => o.id === body.shipping?.shippingMethod
  );
  if (!shippingOption) {
    return NextResponse.json(
      { error: "Ogiltig leveransmetod." },
      { status: 400 }
    );
  }

  const shippingCost = subtotal < FREE_SHIPPING_THRESHOLD ? shippingOption.price : 0;
  const amount = subtotal + shippingCost;

  const sessionId = `mock_sess_${crypto.randomUUID()}`;

  // Sparar underlaget för ordern så /api/checkout/confirm kan slutföra den
  // (skapa en order för adminvyn, skicka bekräftelsemejl) utan att behöva
  // räkna om priset ovan — motsvarar hur Stripe/Klarna redan håller reda på
  // en sessions innehåll internt.
  saveSession({
    sessionId,
    createdAt: new Date().toISOString(),
    items: resolvedItems,
    shipping: body.shipping,
    paymentMethod: body.paymentMethod,
    subtotal,
    shippingCost,
    amount,
    attribution: {
      source: body.attribution?.source || DEFAULT_ATTRIBUTION.source,
      medium: body.attribution?.medium || DEFAULT_ATTRIBUTION.medium,
      campaign: body.attribution?.campaign || DEFAULT_ATTRIBUTION.campaign,
    },
  });

  return NextResponse.json({ sessionId, amount, currency: "SEK" });
}
