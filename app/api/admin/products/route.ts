import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedRequest } from "@/lib/adminAuth";
import { createProduct, getAllProducts, type ProductInput } from "@/lib/data/productStore";

function validateProductInput(body: unknown): string | null {
  if (!body || typeof body !== "object") return "Ogiltig produktdata.";
  const input = body as Record<string, unknown>;
  if (!input.name || typeof input.name !== "string") return "Namn krävs.";
  if (typeof input.price !== "number" || input.price <= 0) return "Ogiltigt pris.";
  if (!Array.isArray(input.colorways) || input.colorways.length === 0) {
    return "Minst en färgvariant krävs.";
  }
  for (const c of input.colorways) {
    if (
      !c ||
      typeof c !== "object" ||
      !("name" in c) ||
      !c.name ||
      !("hex" in c) ||
      !c.hex ||
      !("group" in c) ||
      !c.group ||
      typeof (c as Record<string, unknown>).stock !== "number"
    ) {
      return "Varje färgvariant behöver namn, hexkod, färggrupp och lagerantal.";
    }
  }
  return null;
}

export async function GET(request: NextRequest) {
  if (!isAuthorizedRequest(request)) {
    return NextResponse.json({ error: "Ej inloggad." }, { status: 401 });
  }
  return NextResponse.json({ products: getAllProducts() });
}

export async function POST(request: NextRequest) {
  if (!isAuthorizedRequest(request)) {
    return NextResponse.json({ error: "Ej inloggad." }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  const validationError = validateProductInput(body);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }
  const product = createProduct(body as ProductInput);
  return NextResponse.json({ product }, { status: 201 });
}
