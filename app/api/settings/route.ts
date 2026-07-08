import { NextResponse } from "next/server";
import { getShippingSettings } from "@/lib/data/settingsStore";

// Publik, oautentiserad — kassan och andra klientkomponenter behöver kunna
// läsa fraktinställningarna (flatrate-priser, fri frakt-gräns) för att visa
// rätt belopp innan betalning. Inga känsliga uppgifter i svaret.
export async function GET() {
  return NextResponse.json(await getShippingSettings());
}
