import { NextRequest, NextResponse } from "next/server";
import { del } from "@vercel/blob";
import { isAuthorizedRequest } from "@/lib/adminAuth";
import { removeProductImage } from "@/lib/data/productStore";

export async function DELETE(
  request: NextRequest,
  props: { params: Promise<{ id: string; imageId: string }> }
) {
  const params = await props.params;
  if (!isAuthorizedRequest(request)) {
    return NextResponse.json({ error: "Ej inloggad." }, { status: 401 });
  }

  const result = removeProductImage(params.id, params.imageId);
  if (!result) {
    return NextResponse.json({ error: "Bilden hittades inte." }, { status: 404 });
  }

  // Radera själva filen i Blob-storage, inte bara referensen i produktdatan
  // — annars läcker lagringsutrymme över tid. Om filen redan är borta (t.ex.
  // manuellt raderad i Vercel Dashboard) ska det inte blockera att
  // referensen tas bort.
  try {
    await del(result.removed.pathname);
  } catch (err) {
    console.warn(`[produktbilder] Kunde inte radera ${result.removed.pathname} från Blob:`, err);
  }

  return NextResponse.json({ product: result.product });
}
