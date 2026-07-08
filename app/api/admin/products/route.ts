import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedRequest } from "@/lib/adminAuth";
import { createProduct, getAllProducts, type ProductInput } from "@/lib/data/productStore";
import { validateProductInput } from "@/lib/validation";

export async function GET(request: NextRequest) {
  if (!isAuthorizedRequest(request)) {
    return NextResponse.json({ error: "Ej inloggad." }, { status: 401 });
  }
  return NextResponse.json({ products: await getAllProducts() });
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
  const product = await createProduct(body as ProductInput);
  return NextResponse.json({ product }, { status: 201 });
}
