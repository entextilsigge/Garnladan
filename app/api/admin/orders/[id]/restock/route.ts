import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedRequest } from "@/lib/adminAuth";
import { getOrderById, markItemsRestocked } from "@/lib/data/orderStore";
import { adjustColorwayStock } from "@/lib/data/productStore";

// ---------------------------------------------------------------------------
// Manuell lagerjustering för specifika orderrader vid en delåterbetalning —
// se app/api/admin/orders/[id]/refund/route.ts, som INTE gissar vilka rader
// som returnerats utifrån ett delbelopp. Admin bekräftar här, rad för rad,
// vilka varor som faktiskt kommit i retur, och bara de raderna läggs
// tillbaka i lager.
// ---------------------------------------------------------------------------

function itemKey(slug: string, colorName: string): string {
  return `${slug}::${colorName}`;
}

export async function POST(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  if (!isAuthorizedRequest(request)) {
    return NextResponse.json({ error: "Ej inloggad." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || !Array.isArray(body.itemKeys) || body.itemKeys.some((k: unknown) => typeof k !== "string")) {
    return NextResponse.json({ error: "Ogiltiga orderrader." }, { status: 400 });
  }

  const order = getOrderById(params.id);
  if (!order) {
    return NextResponse.json({ error: "Ordern hittades inte." }, { status: 404 });
  }

  const requestedKeys = new Set<string>(body.itemKeys);
  const alreadyRestocked = new Set(order.restockedItemKeys ?? []);
  const matches = order.items.filter(
    (item) => requestedKeys.has(itemKey(item.slug, item.colorName)) && !alreadyRestocked.has(itemKey(item.slug, item.colorName))
  );

  if (matches.length === 0) {
    return NextResponse.json({ error: "Inga matchande, ej redan återlagda orderrader." }, { status: 400 });
  }

  for (const item of matches) {
    adjustColorwayStock(item.slug, item.colorName, item.quantity);
  }
  const updated = markItemsRestocked(
    params.id,
    matches.map((item) => itemKey(item.slug, item.colorName))
  );
  if (!updated) {
    return NextResponse.json({ error: "Ordern hittades inte." }, { status: 404 });
  }

  return NextResponse.json({ order: updated });
}
