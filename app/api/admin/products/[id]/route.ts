import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedRequest } from "@/lib/adminAuth";
import { deleteProduct, updateProduct } from "@/lib/data/productStore";
import { validateProductInput } from "@/lib/validation";

export async function PUT(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  if (!isAuthorizedRequest(request)) {
    return NextResponse.json({ error: "Ej inloggad." }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  // Samma validering som skapande (POST) — tidigare kunde en redigering
  // spara en trasig produkt (t.ex. tom colorways-array eller ett pris som
  // blivit en sträng) helt förbi kontrollerna nedan, eftersom PUT aldrig
  // validerade indata alls.
  const validationError = validateProductInput(body);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }
  const expectedUpdatedAt = typeof body.updatedAt === "string" ? body.updatedAt : undefined;
  const result = updateProduct(params.id, body, expectedUpdatedAt);
  if (!result.ok) {
    if (result.reason === "conflict") {
      return NextResponse.json(
        {
          error:
            "Denna produkt har ändrats av någon annan sedan du öppnade den — ladda om och försök igen.",
          current: result.current,
        },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: "Produkten hittades inte." }, { status: 404 });
  }
  return NextResponse.json({ product: result.product });
}

export async function DELETE(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  if (!isAuthorizedRequest(request)) {
    return NextResponse.json({ error: "Ej inloggad." }, { status: 401 });
  }
  const ok = deleteProduct(params.id);
  if (!ok) {
    return NextResponse.json({ error: "Produkten hittades inte." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
