import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedRequest } from "@/lib/adminAuth";
import { getShippingSettings } from "@/lib/data/settingsStore";
import { getFraktjaktBalanceEstimate } from "@/lib/data/fraktjaktBalanceStore";

// ---------------------------------------------------------------------------
// Uppskattat Fraktjakt-saldo (tillägg till uppdrag 15) — hämtas av
// AdminDashboard vid inladdning för att visa saldovarningen, och av
// SettingsPanel för att visa admin en aktuell siffra bredvid
// tröskel-/påfyllningsfälten. Se lib/data/fraktjaktBalanceStore.ts för
// varför det här är en egen uppskattning istället för ett riktigt
// saldoanrop mot Fraktjakt.
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  if (!isAuthorizedRequest(request)) {
    return NextResponse.json({ error: "Ej inloggad." }, { status: 401 });
  }
  const settings = await getShippingSettings();
  const estimate = await getFraktjaktBalanceEstimate(settings);
  return NextResponse.json(estimate);
}
