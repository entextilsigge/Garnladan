import { NextRequest, NextResponse } from "next/server";
import { getOrderById } from "@/lib/data/orderStore";

// Publik, avsiktligt minimal statuskoll som orderbekräftelsesidan pollar
// (se app/kassa/bekraftelse/page.tsx) för att visa "väntar/betald/
// misslyckad" utan att bara lita på klientens redirect efter Stripe-
// betalningen. Läcker bara betal-/leveransstatus — ingen kund-PII — via
// ett ordernummer som redan bara kunden känner till.
export async function GET(request: NextRequest) {
  const orderId = request.nextUrl.searchParams.get("orderId");
  if (!orderId) {
    return NextResponse.json({ error: "orderId krävs." }, { status: 400 });
  }

  const order = await getOrderById(orderId);
  if (!order) {
    return NextResponse.json({ error: "Ordern hittades inte." }, { status: 404 });
  }

  return NextResponse.json({
    paymentStatus: order.paymentStatus,
    status: order.status,
  });
}
