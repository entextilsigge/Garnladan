import { getSupabaseServiceClient, throwIfSupabaseError } from "@/lib/supabase";

// ---------------------------------------------------------------------------
// Idempotens-logg för Stripe-webhooks — Supabase Postgres (uppdrag 13).
//
// En UNIK databaskonstraint på event_id (se supabase/migrations/
// 0001_initial_schema.sql) ersätter den tidigare fil-baserade läs-sen-
// skriv-kollen. mark_webhook_event_processed gör en atomär
// `INSERT ... ON CONFLICT DO NOTHING` och returnerar om raden faktiskt VAR
// ny — race-safe även över flera samtidiga serverless-instanser, till
// skillnad från den gamla JSON-filen.
// ---------------------------------------------------------------------------

/**
 * Kollar OCH markerar eventet som hanterat i samma atomära databasoperation
 * — ersätter det tidigare två-stegs hasProcessedEvent + markEventProcessed
 * (som teoretiskt kunde racea mellan läsning och skrivning, om än under ett
 * mycket kort fönster). Returnerar `true` om eventet var NYTT (ska
 * processas), `false` om det redan setts (== en verklig dubblett, avbryt
 * direkt).
 *
 * Anropas FÖRE själva hanteringslogiken (se app/api/webhooks/stripe/
 * route.ts) — om hanteringen sedan kastar ett fel, anropas
 * unmarkEventProcessed så att Stripes egen retry-mekanism kan försöka
 * igen, precis som innan.
 */
export async function markEventProcessedIfNew(eventId: string): Promise<boolean> {
  const { data, error } = await getSupabaseServiceClient().rpc("mark_webhook_event_processed", {
    p_event_id: eventId,
  });
  throwIfSupabaseError(error);
  return Boolean(data);
}

/** Rullar tillbaka markeringen om hanteringen misslyckades efteråt — se ovan. */
export async function unmarkEventProcessed(eventId: string): Promise<void> {
  const { error } = await getSupabaseServiceClient().from("webhook_events").delete().eq("event_id", eventId);
  throwIfSupabaseError(error);
}
