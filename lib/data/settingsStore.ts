import type { ShippingSettings } from "@/lib/checkout";
import { DEFAULT_SHIPPING_SETTINGS } from "@/lib/checkout";
import { getSupabaseServiceClient, throwIfSupabaseError } from "@/lib/supabase";

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
    // (kolumnen finns inte än — migration 0003 inte körd) — samma säkra
    // fallback till "ej konfigurerat" i båda fallen, inget NaN i UI:t.
    fraktjaktOmbudProductId:
      row.fraktjakt_ombud_product_id == null ? null : Number(row.fraktjakt_ombud_product_id),
    fraktjaktHemProductId:
      row.fraktjakt_hem_product_id == null ? null : Number(row.fraktjakt_hem_product_id),
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
    })
    .eq("id", 1);
  throwIfSupabaseError(error);
  return next;
}
