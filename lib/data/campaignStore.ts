import { getSupabaseServiceClient, throwIfSupabaseError } from "@/lib/supabase";

// ---------------------------------------------------------------------------
// Kampanjregister — Supabase Postgres (uppdrag 13).
//
// Enkel manuell kampanjlogg (namn, kanal, period, ev. budget) som möjliggör
// att jämföra försäljning under en kampanjperiod mot perioden innan i
// adminstatistiken, utan att kräva en riktig annonsplattforms-integration.
// Kopplingen till ordrar sker via `Order.attribution.campaign` (matchat mot
// kampanjens namn) — se lib/analytics.ts.
// ---------------------------------------------------------------------------

export interface Campaign {
  id: string;
  name: string;
  channel: string;
  /** ISO-datum (YYYY-MM-DD) */
  startDate: string;
  /** ISO-datum (YYYY-MM-DD) */
  endDate: string;
  budget?: number;
}

interface CampaignRow {
  id: string;
  name: string;
  channel: string;
  start_date: string;
  end_date: string;
  budget: number | null;
}

function rowToCampaign(row: CampaignRow): Campaign {
  return {
    id: row.id,
    name: row.name,
    channel: row.channel,
    startDate: row.start_date,
    endDate: row.end_date,
    budget: row.budget != null ? Number(row.budget) : undefined,
  };
}

export async function getAllCampaigns(): Promise<Campaign[]> {
  const { data, error } = await getSupabaseServiceClient()
    .from("campaigns")
    .select("*")
    .order("start_date", { ascending: false });
  throwIfSupabaseError(error);
  return (data as unknown as CampaignRow[]).map(rowToCampaign);
}

export type CampaignInput = Omit<Campaign, "id">;

export async function createCampaign(input: CampaignInput): Promise<Campaign> {
  const { data, error } = await getSupabaseServiceClient()
    .from("campaigns")
    .insert({
      name: input.name,
      channel: input.channel,
      start_date: input.startDate,
      end_date: input.endDate,
      budget: input.budget ?? null,
    })
    .select()
    .single();
  throwIfSupabaseError(error);
  return rowToCampaign(data as unknown as CampaignRow);
}

export async function updateCampaign(id: string, patch: Partial<CampaignInput>): Promise<Campaign | null> {
  const row: Record<string, unknown> = {};
  if (patch.name !== undefined) row.name = patch.name;
  if (patch.channel !== undefined) row.channel = patch.channel;
  if (patch.startDate !== undefined) row.start_date = patch.startDate;
  if (patch.endDate !== undefined) row.end_date = patch.endDate;
  if (patch.budget !== undefined) row.budget = patch.budget;

  const { data, error } = await getSupabaseServiceClient()
    .from("campaigns")
    .update(row)
    .eq("id", id)
    .select()
    .maybeSingle();
  throwIfSupabaseError(error);
  return data ? rowToCampaign(data as unknown as CampaignRow) : null;
}

export async function deleteCampaign(id: string): Promise<boolean> {
  const { error, count } = await getSupabaseServiceClient()
    .from("campaigns")
    .delete({ count: "exact" })
    .eq("id", id);
  throwIfSupabaseError(error);
  return (count ?? 0) > 0;
}
