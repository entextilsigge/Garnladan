import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedRequest } from "@/lib/adminAuth";
import { getOrderById, updateOrderFulfillment, type OrderStatus } from "@/lib/data/orderStore";
import { sendShippingNotificationEmail } from "@/lib/email";

const VALID_STATUSES: OrderStatus[] = ["vantar_packning", "packad", "skickad"];

export async function PATCH(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  if (!isAuthorizedRequest(request)) {
    return NextResponse.json({ error: "Ej inloggad." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Ogiltig data." }, { status: 400 });
  }
  if ("status" in body && !VALID_STATUSES.includes(body.status)) {
    return NextResponse.json({ error: "Ogiltig status." }, { status: 400 });
  }
  if ("trackingNumber" in body && typeof body.trackingNumber !== "string") {
    return NextResponse.json({ error: "Ogiltigt spårningsnummer." }, { status: 400 });
  }

  const existing = await getOrderById(params.id);
  if (!existing) {
    return NextResponse.json({ error: "Ordern hittades inte." }, { status: 404 });
  }

  const nextStatus: OrderStatus = body.status ?? existing.status;
  const nextTrackingNumber: string | undefined =
    typeof body.trackingNumber === "string" ? body.trackingNumber.trim() : existing.trackingNumber;

  if (nextStatus === "skickad" && !nextTrackingNumber) {
    return NextResponse.json(
      { error: "Ett spårningsnummer krävs för att markera ordern som skickad." },
      { status: 400 }
    );
  }

  const updated = await updateOrderFulfillment(params.id, {
    status: body.status,
    trackingNumber: "trackingNumber" in body ? nextTrackingNumber : undefined,
  });
  if (!updated) {
    return NextResponse.json({ error: "Ordern hittades inte." }, { status: 404 });
  }

  // Trigga skickad-mejlet bara på övergången till "skickad" (inte varje
  // gång ordern sparas om den redan var skickad) — spårningsnumret finns
  // garanterat här tack vare kontrollen ovan.
  if (nextStatus === "skickad" && existing.status !== "skickad" && nextTrackingNumber) {
    await sendShippingNotificationEmail(updated, nextTrackingNumber);
  }

  return NextResponse.json({ order: updated });
}
