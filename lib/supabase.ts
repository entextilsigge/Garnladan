import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Supabase-klienter, server-only.
//
// TVÅ separata klienter, med olika behörighet:
//
//   - getSupabaseAnonClient(): använder NEXT_PUBLIC_SUPABASE_ANON_KEY.
//     Respekterar Row Level Security — kan bara läsa det RLS-policyn
//     tillåter (produkter/färgvarianter, se supabase/migrations/
//     0001_initial_schema.sql). Säker att någon gång exponera för
//     klientkod, men används idag bara server-side (våra egna
//     Next.js-routes gör alla anrop, inget direkt från webbläsaren).
//
//   - getSupabaseServiceClient(): använder SUPABASE_SERVICE_ROLE_KEY, som
//     KRINGGÅR RLS helt. Får ALDRIG importeras från klientkod eller
//     hamna i ett NEXT_PUBLIC_-prefixat fält — bara route handlers/
//     server components. Används för allt utom den publika
//     produktlistningen: ordrar, checkout-sessioner, admin-ändringar,
//     webhook-idempotens, fellogg, m.m.
//
// Så länge miljövariablerna saknas kastar klient-funktionerna ett tydligt
// fel istället för att krascha kryptiskt djupt inne i en fråga — samma
// mönster som lib/stripe.ts.
// ---------------------------------------------------------------------------

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() &&
      process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  );
}

let cachedAnonClient: SupabaseClient | null = null;
let cachedServiceClient: SupabaseClient | null = null;

export function getSupabaseAnonClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anonKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL/NEXT_PUBLIC_SUPABASE_ANON_KEY saknas — kan inte skapa Supabase-klient."
    );
  }
  if (!cachedAnonClient) {
    cachedAnonClient = createClient(url, anonKey, {
      auth: { persistSession: false },
    });
  }
  return cachedAnonClient;
}

export function getSupabaseServiceClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !serviceKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY saknas — kan inte skapa Supabase-klient."
    );
  }
  if (!cachedServiceClient) {
    cachedServiceClient = createClient(url, serviceKey, {
      auth: { persistSession: false },
    });
  }
  return cachedServiceClient;
}

/**
 * Kastar om en Supabase-fråga returnerat ett fel — de flesta store-
 * funktioner vill bara ha ett rent kastat Error istället för att sprida
 * PostgrestError-formen vidare till anroparen.
 */
export function throwIfSupabaseError(error: { message: string } | null): void {
  if (error) {
    throw new Error(`Supabase-fel: ${error.message}`);
  }
}
