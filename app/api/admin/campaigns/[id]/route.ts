import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedRequest } from "@/lib/adminAuth";
import { deleteCampaign, updateCampaign } from "@/lib/data/campaignStore";

export async function PUT(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  if (!isAuthorizedRequest(request)) {
    return NextResponse.json({ error: "Ej inloggad." }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Ogiltig kampanjdata." }, { status: 400 });
  }
  const updated = await updateCampaign(params.id, body);
  if (!updated) {
    return NextResponse.json({ error: "Kampanjen hittades inte." }, { status: 404 });
  }
  return NextResponse.json({ campaign: updated });
}

export async function DELETE(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  if (!isAuthorizedRequest(request)) {
    return NextResponse.json({ error: "Ej inloggad." }, { status: 401 });
  }
  const ok = await deleteCampaign(params.id);
  if (!ok) {
    return NextResponse.json({ error: "Kampanjen hittades inte." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
