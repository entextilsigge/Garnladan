import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedRequest } from "@/lib/adminAuth";
import { updateOrderStatus, type OrderStatus } from "@/lib/data/orderStore";

const VALID_STATUSES: OrderStatus[] = ["mottagen", "skickad", "levererad"];

export async function PATCH(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  if (!isAuthorizedRequest(request)) {
    return NextResponse.json({ error: "Ej inloggad." }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  if (!body || !VALID_STATUSES.includes(body.status)) {
    return NextResponse.json({ error: "Ogiltig status." }, { status: 400 });
  }
  const updated = updateOrderStatus(params.id, body.status);
  if (!updated) {
    return NextResponse.json({ error: "Ordern hittades inte." }, { status: 404 });
  }
  return NextResponse.json({ order: updated });
}
