import { NextResponse } from "next/server";
import { getProductBySlug } from "@/lib/products";
import { SHIPPING_OPTIONS } from "@/lib/checkout";
import { FREE_SHIPPING_THRESHOLD } from "@/lib/format";

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

  let amount = 0;
  for (const line of body.lines) {
    const product = getProductBySlug(line.slug);
    if (!product || typeof line.quantity !== "number" || line.quantity < 1) {
      return NextResponse.json(
        { error: "En produkt i varukorgen kunde inte hittas." },
        { status: 400 }
      );
    }
    amount += product.price * line.quantity;
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
  if (amount < FREE_SHIPPING_THRESHOLD) {
    amount += shippingOption.price;
  }

  const sessionId = `mock_sess_${crypto.randomUUID()}`;

  return NextResponse.json({ sessionId, amount, currency: "SEK" });
}
