import { NextRequest, NextResponse } from "next/server";
import { getStripeClient, isStripeConfigured } from "@/lib/stripe";
import { isAuthorizedRequest } from "@/lib/adminAuth";
import { getOrderById, recordRefund, markItemsRestocked } from "@/lib/data/orderStore";
import { adjustColorwayStock } from "@/lib/data/productStore";
import { sendRefundConfirmationEmail } from "@/lib/email";

// ---------------------------------------------------------------------------
// Riktig återbetalning mot Stripe (stripe.refunds.create), inte bara en
// lokal statusändring — se README.md "Återbetalningar" för hela flödet.
//
// Ordning är viktig: Stripe-anropet görs FÖRST. Lokal status
// (recordRefund) uppdateras bara om det anropet faktiskt lyckas — misslyckas
// det (redan återbetalad, för sent, nätverksfel) returneras felet direkt och
// INGET lokalt state ändras.
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

  const order = getOrderById(params.id);
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

  const alreadyRefunded = (order.refunds ?? []).reduce((sum, r) => sum + r.amount, 0);
  const remaining = order.total - alreadyRefunded;
  // Litet epsilon för att tolerera flyttalsavrundning (öre↔kr).
  if (amount > remaining + 0.01) {
    return NextResponse.json(
      { error: `Beloppet överstiger vad som återstår att återbetala (${remaining} kr).` },
      { status: 400 }
    );
  }

  const stripe = getStripeClient();
  let refund;
  try {
    refund = await stripe.refunds.create({
      payment_intent: order.paymentIntentId,
      amount: Math.round(amount * 100),
    });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Återbetalningen misslyckades hos Stripe.",
      },
      { status: 502 }
    );
  }

  const refundId = `rf_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  let updated = recordRefund(params.id, {
    id: refundId,
    stripeRefundId: refund.id,
    amount,
    createdAt: new Date().toISOString(),
  });
  if (!updated) {
    return NextResponse.json({ error: "Ordern hittades inte." }, { status: 404 });
  }

  // Full återbetalning (ordern är nu helt återbetald): lägg tillbaka lagret
  // för alla rader som inte redan är återlagda.
  if (updated.paymentStatus === "refunded") {
    const restockedKeys = new Set(updated.restockedItemKeys ?? []);
    const toRestock = updated.items.filter((item) => !restockedKeys.has(itemKey(item.slug, item.colorName)));
    for (const item of toRestock) {
      adjustColorwayStock(item.slug, item.colorName, item.quantity);
    }
    if (toRestock.length > 0) {
      updated =
        markItemsRestocked(
          params.id,
          toRestock.map((item) => itemKey(item.slug, item.colorName))
        ) ?? updated;
    }
  }

  await sendRefundConfirmationEmail(updated, amount);

  return NextResponse.json({ order: updated });
}
