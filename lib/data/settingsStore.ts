import type { ShippingSettings } from "@/lib/checkout";
import { DEFAULT_SHIPPING_SETTINGS } from "@/lib/checkout";
import { getSupabaseServiceClient, throwIfSupabaseError } from "@/lib/supabase";
import { invalidateFraktjaktBalanceCache } from "@/lib/data/fraktjaktBalanceStore";

// ---------------------------------------------------------------------------
// Inställningslager — Supabase Postgres (uppdrag 13). Singleton-tabell
// (alltid exakt en rad, id=1, se supabase/migrations/0001_initial_schema.sql)
// — innehåller idag bara fraktinställningar (flat rate-priser och
// fri frakt-gräns), se lib/checkout.ts för typen och hur priserna
// tillämpas i kassan.
// ---------------------------------------------------------------------------

interface SettingsRow {
  ombud_price: number;
  hem_price: number;
  free_shipping_enabled: boolean;
  free_shipping_threshold: number;
  fraktjakt_ombud_product_id: number | null;
  fraktjakt_hem_product_id: number | null;
  fraktjakt_balance_threshold: number | null;
  fraktjakt_last_topup_amount: number | null;
  fraktjakt_last_topup_at: string | null;
  fraktjakt_estimated_cost_ombud: number | null;
  fraktjakt_estimated_cost_hem: number | null;
}

export async function getShippingSettings(): Promise<ShippingSettings> {
  const { data, error } = await getSupabaseServiceClient()
    .from("settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle();
  throwIfSupabaseError(error);
  if (!data) return { ...DEFAULT_SHIPPING_SETTINGS };
  const row = data as unknown as SettingsRow;
  return {
    ombudPrice: Number(row.ombud_price),
    hemPrice: Number(row.hem_price),
    freeShippingEnabled: row.free_shipping_enabled,
    freeShippingThreshold: Number(row.free_shipping_threshold),
    // == null täcker BÅDE null (kolumnen finns, tomt värde) och undefined
    // (kolumnen finns inte än — migration inte körd) — samma säkra
    // fallback till "ej konfigurerat"/default i båda fallen, inget NaN i UI:t.
    fraktjaktOmbudProductId:
      row.fraktjakt_ombud_product_id == null ? null : Number(row.fraktjakt_ombud_product_id),
    fraktjaktHemProductId:
      row.fraktjakt_hem_product_id == null ? null : Number(row.fraktjakt_hem_product_id),
    fraktjaktBalanceThreshold:
      row.fraktjakt_balance_threshold == null
        ? DEFAULT_SHIPPING_SETTINGS.fraktjaktBalanceThreshold
        : Number(row.fraktjakt_balance_threshold),
    fraktjaktLastTopupAmount:
      row.fraktjakt_last_topup_amount == null ? 0 : Number(row.fraktjakt_last_topup_amount),
    fraktjaktLastTopupAt: row.fraktjakt_last_topup_at ?? null,
    fraktjaktEstimatedCostOmbud:
      row.fraktjakt_estimated_cost_ombud == null
        ? DEFAULT_SHIPPING_SETTINGS.fraktjaktEstimatedCostOmbud
        : Number(row.fraktjakt_estimated_cost_ombud),
    fraktjaktEstimatedCostHem:
      row.fraktjakt_estimated_cost_hem == null
        ? DEFAULT_SHIPPING_SETTINGS.fraktjaktEstimatedCostHem
        : Number(row.fraktjakt_estimated_cost_hem),
  };
}

export async function updateShippingSettings(patch: Partial<ShippingSettings>): Promise<ShippingSettings> {
  const current = await getShippingSettings();
  const next: ShippingSettings = {
    ombudPrice: typeof patch.ombudPrice === "number" ? patch.ombudPrice : current.ombudPrice,
    hemPrice: typeof patch.hemPrice === "number" ? patch.hemPrice : current.hemPrice,
    freeShippingEnabled:
      typeof patch.freeShippingEnabled === "boolean"
        ? patch.freeShippingEnabled
        : current.freeShippingEnabled,
    freeShippingThreshold:
      typeof patch.freeShippingThreshold === "number"
        ? patch.freeShippingThreshold
        : current.freeShippingThreshold,
    fraktjaktOmbudProductId:
      "fraktjaktOmbudProductId" in patch
        ? patch.fraktjaktOmbudProductId ?? null
        : current.fraktjaktOmbudProductId,
    fraktjaktHemProductId:
      "fraktjaktHemProductId" in patch
        ? patch.fraktjaktHemProductId ?? null
        : current.fraktjaktHemProductId,
    fraktjaktBalanceThreshold:
      typeof patch.fraktjaktBalanceThreshold === "number"
        ? patch.fraktjaktBalanceThreshold
        : current.fraktjaktBalanceThreshold,
    fraktjaktLastTopupAmount:
      typeof patch.fraktjaktLastTopupAmount === "number"
        ? patch.fraktjaktLastTopupAmount
        : current.fraktjaktLastTopupAmount,
    // Tidsstämplas automatiskt server-side så fort admin faktiskt ÄNDRAR
    // "senast påfyllt till"-beloppet — Sigge/Erik behöver bara mata in
    // kronorna, inte hålla reda på en separat datumstämpel manuellt.
    fraktjaktLastTopupAt:
      typeof patch.fraktjaktLastTopupAmount === "number" &&
      patch.fraktjaktLastTopupAmount !== current.fraktjaktLastTopupAmount
        ? new Date().toISOString()
        : current.fraktjaktLastTopupAt,
    fraktjaktEstimatedCostOmbud:
      typeof patch.fraktjaktEstimatedCostOmbud === "number"
        ? patch.fraktjaktEstimatedCostOmbud
        : current.fraktjaktEstimatedCostOmbud,
    fraktjaktEstimatedCostHem:
      typeof patch.fraktjaktEstimatedCostHem === "number"
        ? patch.fraktjaktEstimatedCostHem
        : current.fraktjaktEstimatedCostHem,
  };

  const { error } = await getSupabaseServiceClient()
    .from("settings")
    .update({
      ombud_price: next.ombudPrice,
      hem_price: next.hemPrice,
      free_shipping_enabled: next.freeShippingEnabled,
      free_shipping_threshold: next.freeShippingThreshold,
      fraktjakt_ombud_product_id: next.fraktjaktOmbudProductId,
      fraktjakt_hem_product_id: next.fraktjaktHemProductId,
      fraktjakt_balance_threshold: next.fraktjaktBalanceThreshold,
      fraktjakt_last_topup_amount: next.fraktjaktLastTopupAmount,
      fraktjakt_last_topup_at: next.fraktjaktLastTopupAt,
      fraktjakt_estimated_cost_ombud: next.fraktjaktEstimatedCostOmbud,
      fraktjakt_estimated_cost_hem: next.fraktjaktEstimatedCostHem,
    })
    .eq("id", 1);
  throwIfSupabaseError(error);
  invalidateFraktjaktBalanceCache();
  return next;
}
