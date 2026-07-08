import { NextResponse } from "next/server";
import { getAllProducts } from "@/lib/data/productStore";

// Publik, read-only katalog — samma data som visas på sajten. Används av
// varukorgen (lib/cart.tsx) på klienten för att slå upp pris/lager, eftersom
// klientkod inte kan importera den fs-baserade produktbutiken direkt.
//
// force-dynamic: utan den här markören ser Next.js ingen dynamisk
// datakälla (inga cookies/headers) och förrenderar svaret vid bygget — då
// skulle admin-ändringar (pris, lager, nya produkter) aldrig synas.
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ products: await getAllProducts() });
}
