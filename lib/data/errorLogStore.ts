import { getSupabaseServiceClient, throwIfSupabaseError } from "@/lib/supabase";

// ---------------------------------------------------------------------------
// Enkel intern felloggning — Supabase Postgres (uppdrag 13). Ersätter INTE
// en riktig felövervakningstjänst (Sentry m.fl.) — det kräver ett nytt
// konto som medvetet väntar. Ger admin viss insyn i fångade serverfel
// (webhooks, betalnings-API:er) under tiden, via "Felloggen" i /admin.
// ---------------------------------------------------------------------------

export interface LoggedError {
  id: string;
  timestamp: string;
  message: string;
  context?: string;
}

interface ErrorLogRow {
  id: string;
  created_at: string;
  message: string;
  context: string | null;
}

function rowToLoggedError(row: ErrorLogRow): LoggedError {
  return {
    id: row.id,
    timestamp: row.created_at,
    message: row.message,
    context: row.context ?? undefined,
  };
}

/**
 * Loggar ett fångat serverfel. Kastar aldrig själv — ett trasigt fellogg-
 * skrivförsök ska inte krascha den kod som faktiskt försöker rapportera ett
 * annat fel.
 */
export async function logError(message: string, context?: string): Promise<void> {
  try {
    const { error } = await getSupabaseServiceClient()
      .from("error_logs")
      .insert({ message, context: context ?? null });
    if (error) throw new Error(error.message);
  } catch (err) {
    console.error("[errorLogStore] Kunde inte skriva till felloggen", err);
  }
}

export async function getRecentErrors(limit = 50): Promise<LoggedError[]> {
  const { data, error } = await getSupabaseServiceClient()
    .from("error_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  throwIfSupabaseError(error);
  return (data as unknown as ErrorLogRow[]).map(rowToLoggedError);
}
