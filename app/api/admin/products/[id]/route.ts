import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedRequest } from "@/lib/adminAuth";
import { deleteProduct, updateProduct } from "@/lib/data/productStore";

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  if (!isAuthorizedRequest(request)) {
    return NextResponse.json({ error: "Ej inloggad." }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Ogiltig produktdata." }, { status: 400 });
  }
  const updated = updateProduct(params.id, body);
  if (!updated) {
    return NextResponse.json({ error: "Produkten hittades inte." }, { status: 404 });
  }
  return NextResponse.json({ product: updated });
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  if (!isAuthorizedRequest(request)) {
    return NextResponse.json({ error: "Ej inloggad." }, { status: 401 });
  }
  const ok = deleteProduct(params.id);
  if (!ok) {
    return NextResponse.json({ error: "Produkten hittades inte." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
