import { getSupabaseServiceClient, throwIfSupabaseError } from "@/lib/supabase";
import type { ShippingSettings } from "@/lib/checkout";

// ---------------------------------------------------------------------------
// Saldovarning för Fraktjakt (tillägg till uppdrag 15).
//
// Fraktjakts API exponerar inget kontosaldo (kontrollerat mot den
// officiella API-dokumentationen v4.10.1 — "Status API" är bara en
// drifts-koll, ALIVE/DEAD, inget saldo). Den här filen bygger därför en
// egen uppskattning istället för ett riktigt saldoanrop:
//
//   uppskattat saldo = senast påfyllt-belopp − summan av alla loggade
//                       fraktsedlars SCHABLONKOSTNAD sedan påfyllningen
//
// Schablonkostnaden (ShippingSettings.fraktjaktEstimatedCost{Ombud,Hem})
// är INTE Fraktjakts faktiska debiterade belopp — det returneras inte av
// Shipment- eller Track & Trace-API:erna som lib/fraktjakt.ts använder för
// bokning — utan ett admin-inmatat schablonvärde. Mindre exakt än ett
// riktigt saldoanrop, men bättre än ingen varning alls (se uppdragstexten).
// ---------------------------------------------------------------------------

export interface FraktjaktBalanceEstimate {
  /** null = ingen "senast påfyllt till"-referenspunkt är satt än, kan inte uppskattas. */
  estimatedBalance: number | null;
  threshold: number;
  lastTopupAmount: number;
  lastTopupAt: string | null;
  lowBalance: boolean;
}

// Beräkningen är bara en enkel SUM mot vår egen databas (inget externt
// API-anrop), men cachas ändå några minuter per serverless-instans så att
// varje admin-sidladdning inte behöver göra om samma summering.
const CACHE_TTL_MS = 3 * 60 * 1000;
let cache: { value: FraktjaktBalanceEstimate; expiresAt: number } | null = null;

/** Anropas av settingsStore (nya tröskel/påfyllning) och vid varje ny bokning, så bannern aldrig visar en inaktuell siffra längre än nödvändigt. */
export function invalidateFraktjaktBalanceCache(): void {
  cache = null;
}

/** Loggar en bokad fraktsedels SCHABLONKOSTNAD — se filens header-kommentar. */
export async function logFraktjaktShipmentCost(
  orderId: string,
  shipmentId: number,
  estimatedCost: number
): Promise<void> {
  const { error } = await getSupabaseServiceClient().from("fraktjakt_shipments").insert({
    order_id: orderId,
    shipment_id: shipmentId,
    estimated_cost: estimatedCost,
  });
  throwIfSupabaseError(error);
  invalidateFraktjaktBalanceCache();
}

export async function getFraktjaktBalanceEstimate(
  settings: Pick<
    ShippingSettings,
    "fraktjaktBalanceThreshold" | "fraktjaktLastTopupAmount" | "fraktjaktLastTopupAt"
  >
): Promise<FraktjaktBalanceEstimate> {
  if (cache && cache.expiresAt > Date.now()) return cache.value;

  let estimatedBalance: number | null = null;
  if (settings.fraktjaktLastTopupAt) {
    const { data, error } = await getSupabaseServiceClient()
      .from("fraktjakt_shipments")
      .select("estimated_cost")
      .gte("booked_at", settings.fraktjaktLastTopupAt);
    throwIfSupabaseError(error);
    const consumed = ((data ?? []) as { estimated_cost: number }[]).reduce(
      (sum, row) => sum + Number(row.estimated_cost),
      0
    );
    estimatedBalance = settings.fraktjaktLastTopupAmount - consumed;
  }

  const value: FraktjaktBalanceEstimate = {
    estimatedBalance,
    threshold: settings.fraktjaktBalanceThreshold,
    lastTopupAmount: settings.fraktjaktLastTopupAmount,
    lastTopupAt: settings.fraktjaktLastTopupAt,
    lowBalance: estimatedBalance !== null && estimatedBalance < settings.fraktjaktBalanceThreshold,
  };
  cache = { value, expiresAt: Date.now() + CACHE_TTL_MS };
  return value;
}
