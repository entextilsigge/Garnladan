import { getSupabaseServiceClient, throwIfSupabaseError } from "@/lib/supabase";

// Nyhetsbrevsprenumeranter — Supabase Postgres (uppdrag 13). Byt ut mot en
// riktig lista hos e-postleverantören (t.ex. Resends "audiences") längre
// fram om volymen motiverar det.

export interface NewsletterSubscriber {
  email: string;
  subscribedAt: string;
}

export async function addSubscriber(email: string): Promise<{ added: boolean }> {
  const normalized = email.trim().toLowerCase();
  const client = getSupabaseServiceClient();

  const { data: existing, error: lookupError } = await client
    .from("newsletter_subscribers")
    .select("email")
    .eq("email", normalized)
    .maybeSingle();
  throwIfSupabaseError(lookupError);
  if (existing) return { added: false };

  const { error: insertError } = await client
    .from("newsletter_subscribers")
    .insert({ email: normalized, subscribed_at: new Date().toISOString() });
  // Unik constraint på email fångar även en race (två samtidiga anmälningar
  // med samma adress) — ett 23505-fel (unique_violation) betyder "redan
  // anmäld", inte ett riktigt fel.
  if (insertError && insertError.code !== "23505") {
    throwIfSupabaseError(insertError);
  }
  return { added: !insertError };
}
