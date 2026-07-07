import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { isAuthorizedRequest } from "@/lib/adminAuth";
import { addProductImage, getProductById, reorderProductImages } from "@/lib/data/productStore";
import type { ProductImage } from "@/lib/products";

// ---------------------------------------------------------------------------
// Produktbilder — lagras i Vercel Blob (inte lokal disk, se productStore.ts
// för varför). Kräver miljövariabeln BLOB_READ_WRITE_TOKEN (sätts automatiskt
// när ett Blob-store kopplas till projektet i Vercel Dashboard, se
// README.md "Produktbilder / Vercel Blob" för exakta steg).
// ---------------------------------------------------------------------------

const MAX_FILE_BYTES = 8 * 1024 * 1024; // 8 MB
const ALLOWED_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

export async function POST(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  if (!isAuthorizedRequest(request)) {
    return NextResponse.json({ error: "Ej inloggad." }, { status: 401 });
  }

  const product = getProductById(params.id);
  if (!product) {
    return NextResponse.json({ error: "Produkten hittades inte." }, { status: 404 });
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      {
        error:
          "Vercel Blob är inte konfigurerat — BLOB_READ_WRITE_TOKEN saknas. Se README.md för hur du aktiverar Blob-storage.",
      },
      { status: 500 }
    );
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "Ingen fil skickades med." }, { status: 400 });
  }

  const extension = ALLOWED_TYPES[file.type];
  if (!extension) {
    return NextResponse.json(
      { error: "Filformatet stöds inte. Ladda upp PNG, JPG eller WebP." },
      { status: 400 }
    );
  }
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json(
      { error: "Filen är för stor. Max 8 MB per bild." },
      { status: 400 }
    );
  }

  const imageId = `img_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const blob = await put(`products/${params.id}/${imageId}.${extension}`, file, {
    access: "public",
  });

  const image: ProductImage = { id: imageId, url: blob.url, pathname: blob.pathname };
  const updated = addProductImage(params.id, image);
  if (!updated) {
    return NextResponse.json({ error: "Produkten hittades inte." }, { status: 404 });
  }

  return NextResponse.json({ product: updated }, { status: 201 });
}

export async function PATCH(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  if (!isAuthorizedRequest(request)) {
    return NextResponse.json({ error: "Ej inloggad." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || !Array.isArray(body.order) || !body.order.every((v: unknown) => typeof v === "string")) {
    return NextResponse.json({ error: "Ogiltig ordning." }, { status: 400 });
  }

  const updated = reorderProductImages(params.id, body.order);
  if (!updated) {
    return NextResponse.json({ error: "Kunde inte ändra bildordningen." }, { status: 400 });
  }

  return NextResponse.json({ product: updated });
}
