import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedRequest } from "@/lib/adminAuth";
import { getOrderById, saveFraktjaktShipment } from "@/lib/data/orderStore";
import { getShippingSettings } from "@/lib/data/settingsStore";
import {
  createFraktjaktShipment,
  fetchFraktjaktLabel,
  isFraktjaktConfigured,
  FraktjaktError,
} from "@/lib/fraktjakt";
import { logError } from "@/lib/data/errorLogStore";

// ---------------------------------------------------------------------------
// "Skapa fraktsedel" (uppdrag 15) — bokar en sändning hos Fraktjakt för
// ordrar med "PostNord — ombud" eller "PostNord — hemleverans", och
// hämtar sedan den utskrivbara etikett-PDF:en. "Hämta i Vargön"-ordrar
// har ingen frakt att boka och avvisas medvetet (400) — UI:t ska aldrig
// visa knappen alls för såna ordrar, men routen skyddar även direkta
// anrop.
//
// Fel visas RAKT AV med Fraktjakts eget felmeddelande (t.ex. ogiltig
// adress, tjänst ej tillgänglig till orten) — till skillnad från t.ex.
// refund-routen, som medvetet sanerar Stripes råa fel. Här är Fraktjakts
// meddelanden en förutsättning för att admin ska kunna rätta adressen och
// försöka igen, så de ska INTE gissas eller döljas.
// ---------------------------------------------------------------------------

function resolveShippingProductId(
  shippingMethod: string,
  settings: { fraktjaktOmbudProductId: number | null; fraktjaktHemProductId: number | null }
): number | null {
  if (shippingMethod === "ombud") return settings.fraktjaktOmbudProductId;
  if (shippingMethod === "hem") return settings.fraktjaktHemProductId;
  return null;
}

export async function POST(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  if (!isAuthorizedRequest(request)) {
    return NextResponse.json({ error: "Ej inloggad." }, { status: 401 });
  }
  if (!isFraktjaktConfigured()) {
    return NextResponse.json({ error: "Fraktjakt är inte konfigurerat på servern." }, { status: 400 });
  }

  const order = await getOrderById(params.id);
  if (!order) {
    return NextResponse.json({ error: "Ordern hittades inte." }, { status: 404 });
  }
  if (order.shippingMethod === "ladan") {
    return NextResponse.json(
      { error: "\"Hämta i Vargön\" har ingen frakt att boka — det finns bara en lokal upphämtning." },
      { status: 400 }
    );
  }

  const settings = await getShippingSettings();
  const shippingProductId = resolveShippingProductId(order.shippingMethod, settings);
  if (!shippingProductId) {
    return NextResponse.json(
      {
        error: `Fraktjakt-tjänst för "${order.shippingLabel}" är inte konfigurerad — fyll i shipping_product_id under Inställningar → Fraktjakt i admin.`,
      },
      { status: 400 }
    );
  }

  let shipment;
  try {
    shipment = await createFraktjaktShipment(order, shippingProductId);
  } catch (err) {
    const message = err instanceof FraktjaktError ? err.message : "Okänt fel vid kontakt med Fraktjakt.";
    await logError(message, `admin/orders/${params.id}/fraktsedel`);
    return NextResponse.json({ error: message }, { status: 502 });
  }

  const updated = await saveFraktjaktShipment(params.id, {
    shipmentId: shipment.shipmentId,
    accessCode: shipment.accessCode,
    trackingNumber: shipment.trackingNumber,
  });

  return NextResponse.json({
    order: updated,
    booked: shipment.booked,
    accessLink: shipment.accessLink,
    trackingNumber: shipment.trackingNumber,
  });
}

export async function GET(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  if (!isAuthorizedRequest(request)) {
    return NextResponse.json({ error: "Ej inloggad." }, { status: 401 });
  }

  const order = await getOrderById(params.id);
  if (!order) {
    return NextResponse.json({ error: "Ordern hittades inte." }, { status: 404 });
  }
  if (!order.fraktjaktShipmentId) {
    return NextResponse.json(
      { error: "Ingen fraktsedel har skapats för den här ordern än." },
      { status: 400 }
    );
  }

  let label;
  try {
    label = await fetchFraktjaktLabel(order.fraktjaktShipmentId);
  } catch (err) {
    const message = err instanceof FraktjaktError ? err.message : "Okänt fel vid kontakt med Fraktjakt.";
    await logError(message, `admin/orders/${params.id}/fraktsedel:GET`);
    return NextResponse.json({ error: message }, { status: 502 });
  }

  if (!label) {
    return NextResponse.json(
      { error: "Fraktsedeln är inte klar än — sändningen har ännu inte bokats/betalats i Fraktjakt." },
      { status: 404 }
    );
  }

  return new NextResponse(new Uint8Array(label.pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="fraktsedel-${order.id}.pdf"`,
    },
  });
}
