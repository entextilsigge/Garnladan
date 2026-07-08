import { NextRequest, NextResponse } from "next/server";
import { getProductBySlug } from "@/lib/data/productStore";
import { SHIPPING_OPTIONS, calculateShippingCost } from "@/lib/checkout";
import { getShippingSettings } from "@/lib/data/settingsStore";
import { saveSession } from "@/lib/data/checkoutSessionStore";
import { DEFAULT_ATTRIBUTION } from "@/lib/attribution";
import { validateShippingDetails } from "@/lib/validation";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

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
//
// All indata valideras server-side (inte bara klientens required/pattern-
// attribut, som alltid går att kringgå) — se lib/validation.ts.
// ---------------------------------------------------------------------------

const MAX_QUANTITY_PER_LINE = 99;
// 20 sessionsskapanden per minut och IP — täcker gott och väl en kund som
// går fram och tillbaka i kassan, men stoppar naiva skript.
const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 60_000;

export async function POST(request: NextRequest) {
  if (!checkRateLimit(`checkout-session:${getClientIp(request)}`, RATE_LIMIT, RATE_WINDOW_MS)) {
    return NextResponse.json(
      { error: "För många förfrågningar. Försök igen om en stund." },
      { status: 429 }
    );
  }

  const body = await request.json().catch(() => null);

  if (!body || !Array.isArray(body.lines) || body.lines.length === 0) {
    return NextResponse.json(
      { error: "Varukorgen är tom eller ogiltig." },
      { status: 400 }
    );
  }

  const shippingError = validateShippingDetails(body.shipping);
  if (shippingError) {
    return NextResponse.json({ error: shippingError }, { status: 400 });
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
    const product = await getProductBySlug(line.slug);
    if (
      !product ||
      typeof line.quantity !== "number" ||
      line.quantity < 1 ||
      line.quantity > MAX_QUANTITY_PER_LINE
    ) {
      return NextResponse.json(
        { error: "En produkt i varukorgen kunde inte hittas." },
        { status: 400 }
      );
    }
    // Färgen måste matcha en faktisk variant av produkten — annars accepteras
    // en godtycklig fritextsträng rakt in i ordern (visas senare i admin och
    // i bekräftelsemejlet).
    const colorway = product.colorways.find((c) => c.name === line.colorName);
    if (!colorway) {
      return NextResponse.json(
        { error: `Ogiltig färgvariant för ${product.name}.` },
        { status: 400 }
      );
    }
    subtotal += product.price * line.quantity;
    resolvedItems.push({
      slug: product.slug,
      name: product.name,
      colorName: colorway.name,
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

  const shippingCost = calculateShippingCost(subtotal, shippingOption.id, await getShippingSettings());
  const amount = subtotal + shippingCost;

  const sessionId = `mock_sess_${crypto.randomUUID()}`;

  // Sparar underlaget för ordern så /api/checkout/confirm kan slutföra den
  // (skapa en order för adminvyn, skicka bekräftelsemejl) utan att behöva
  // räkna om priset ovan — motsvarar hur Stripe/Klarna redan håller reda på
  // en sessions innehåll internt. Trimmade strängar, inte råa fält, sparas
  // — extra egenskaper i body.shipping som klienten skickat med följer inte
  // med.
  await saveSession({
    sessionId,
    createdAt: new Date().toISOString(),
    items: resolvedItems,
    shipping: {
      firstName: body.shipping.firstName.trim(),
      lastName: body.shipping.lastName.trim(),
      email: body.shipping.email.trim(),
      address: body.shipping.address.trim(),
      postalCode: body.shipping.postalCode.trim(),
      city: body.shipping.city.trim(),
      shippingMethod: shippingOption.id,
    },
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
