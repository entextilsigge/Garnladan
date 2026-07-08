import { NextRequest, NextResponse } from "next/server";
import { getStripeClient, isStripeConfigured } from "@/lib/stripe";
import { isAuthorizedRequest } from "@/lib/adminAuth";
import {
  getOrderById,
  reserveRefund,
  finalizeRefund,
  cancelRefundReservation,
  markItemsRestocked,
} from "@/lib/data/orderStore";
import { adjustColorwayStock } from "@/lib/data/productStore";
import { sendRefundConfirmationEmail } from "@/lib/email";
import { logError } from "@/lib/data/errorLogStore";

// ---------------------------------------------------------------------------
// Riktig återbetalning mot Stripe (stripe.refunds.create), inte bara en
// lokal statusändring — se README.md "Återbetalningar" för hela flödet.
//
// Tvåfas, atomärt på DATABASNIVÅ (uppdrag 13 — ersätter det tidigare
// in-memory-låset, som bara skyddade inom en enskild serverless-instans):
//   1. reserveRefund — atomär Postgres-funktion som låser ordern och
//      kontrollerar återstående belopp (räknar även andra just nu pending
//      reservationer) INNAN Stripe ens kontaktas. Misslyckas detta steg
//      har INGET hänt — inget Stripe-anrop gjordes.
//   2. Stripe-anropet görs (extern, kan misslyckas) — sker medvetet UTANFÖR
//      databastransaktionen, ett DB-lås ska aldrig hållas öppet över ett
//      långsamt nätverksanrop.
//   3a. Stripe lyckas → finalizeRefund bokför återbetalningen permanent.
//   3b. Stripe misslyckas → cancelRefundReservation tar bort reservationen
//       så beloppet blir tillgängligt för ett nytt försök.
//
// Lager: vid en FULL återbetalning (dvs. den här återbetalningen gör att
// hela ordersumman är återbetald) läggs lagret för samtliga orderrader
// tillbaka automatiskt. Vid en delåterbetalning görs INGEN automatisk
// lagerjustering — för felkänsligt att gissa vilka rader som returnerats
// utifrån ett delbelopp. Admin bekräftar istället manuellt rad för rad via
// POST .../restock.
// ---------------------------------------------------------------------------

function itemKey(slug: string, colorName: string): string {
  return `${slug}::${colorName}`;
}

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

  const body = await request.json().catch(() => null);
  const amount = body?.amount;
  if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "Ogiltigt återbetalningsbelopp." }, { status: 400 });
  }

  const order = await getOrderById(params.id);
  if (!order) {
    return NextResponse.json({ error: "Ordern hittades inte." }, { status: 404 });
  }
  if (!order.paymentIntentId) {
    return NextResponse.json(
      { error: "Ordern saknar ett Stripe-betalnings-id och kan inte återbetalas här (mockad/manuell order)." },
      { status: 400 }
    );
  }
  if (order.paymentStatus !== "paid" && order.paymentStatus !== "partially_refunded") {
    return NextResponse.json(
      { error: "Ordern kan inte återbetalas i sitt nuvarande betalstatus." },
      { status: 400 }
    );
  }

  const refundId = `rf_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

  // Steg 1: atomär reservation — misslyckas om en annan samtidig
  // återbetalning redan tagit hela (eller för mycket av) det återstående
  // beloppet.
  const reservation = await reserveRefund(params.id, amount, refundId);
  if (!reservation.ok) {
    return NextResponse.json({ error: reservation.error }, { status: 400 });
  }

  // Steg 2: det faktiska Stripe-anropet.
  const stripe = getStripeClient();
  let stripeRefundId: string;
  try {
    const refund = await stripe.refunds.create({
      payment_intent: order.paymentIntentId,
      amount: Math.round(amount * 100),
    });
    stripeRefundId = refund.id;
  } catch (err) {
    // Steg 3b: Stripe misslyckades — släpp reservationen så beloppet blir
    // tillgängligt igen.
    await cancelRefundReservation(refundId);
    await logError(
      err instanceof Error ? err.message : "Okänt fel vid återbetalning",
      `admin/orders/${params.id}/refund`
    );
    // Visa aldrig Stripes råa felmeddelande i admin — fullständigt fel finns
    // i felloggen (logError ovan) om det behöver felsökas.
    return NextResponse.json(
      { error: "Återbetalningen misslyckades hos Stripe. Försök igen eller kontrollera i Stripe Dashboard." },
      { status: 502 }
    );
  }

  // Steg 3a: Stripe lyckades — bokför permanent.
  const finalized = await finalizeRefund(refundId, stripeRefundId);
  if (!finalized.ok) {
    await logError(finalized.error, `admin/orders/${params.id}/refund:finalize`);
    return NextResponse.json({ error: finalized.error }, { status: 500 });
  }

  let updated = await getOrderById(params.id);
  if (!updated) {
    return NextResponse.json({ error: "Ordern hittades inte." }, { status: 404 });
  }

  // Full återbetalning (ordern är nu helt återbetald): lägg tillbaka lagret
  // för alla rader som inte redan är återlagda.
  if (finalized.paymentStatus === "refunded") {
    const restockedKeys = new Set(updated.restockedItemKeys ?? []);
    const toRestock = updated.items.filter((item) => !restockedKeys.has(itemKey(item.slug, item.colorName)));
    for (const item of toRestock) {
      await adjustColorwayStock(item.slug, item.colorName, item.quantity);
    }
    if (toRestock.length > 0) {
      updated =
        (await markItemsRestocked(
          params.id,
          toRestock.map((item) => itemKey(item.slug, item.colorName))
        )) ?? updated;
    }
  }

  await sendRefundConfirmationEmail(updated, amount);

  return NextResponse.json({ order: updated });
}
