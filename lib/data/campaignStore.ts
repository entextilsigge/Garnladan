import fs from "fs";
import path from "path";

// ---------------------------------------------------------------------------
// Kampanjregister — JSON-fil-baserad, server-only (använder "fs").
//
// Enkel manuell kampanjlogg (namn, kanal, period, ev. budget) som möjliggör
// att jämföra försäljning under en kampanjperiod mot perioden innan i
// adminstatistiken, utan att kräva en riktig annonsplattforms-integration.
// Kopplingen till ordrar sker via `Order.attribution.campaign` (matchat mot
// kampanjens namn) — se lib/analytics.ts.
//
// Samma Vercel-brasklapp som övriga JSON-lager i den här mappen: fungerar
// utmärkt lokalt, men skrivningar försvinner mellan deploys/cold starts i
// produktion. Byt ut readAll/writeAll mot en riktig databas för produktion.
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

const DATA_DIR = path.join(process.cwd(), "data");
const CAMPAIGNS_FILE = path.join(DATA_DIR, "campaigns.json");

function ensureFile() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(CAMPAIGNS_FILE)) fs.writeFileSync(CAMPAIGNS_FILE, "[]");
}

function readAll(): Campaign[] {
  ensureFile();
  try {
    const parsed = JSON.parse(fs.readFileSync(CAMPAIGNS_FILE, "utf-8"));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(campaigns: Campaign[]) {
  ensureFile();
  fs.writeFileSync(CAMPAIGNS_FILE, JSON.stringify(campaigns, null, 2));
}

export function getAllCampaigns(): Campaign[] {
  return readAll().sort((a, b) => b.startDate.localeCompare(a.startDate));
}

export type CampaignInput = Omit<Campaign, "id">;

export function createCampaign(input: CampaignInput): Campaign {
  const all = readAll();
  const id = `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const campaign: Campaign = { ...input, id };
  writeAll([...all, campaign]);
  return campaign;
}

export function updateCampaign(id: string, patch: Partial<CampaignInput>): Campaign | null {
  const all = readAll();
  const idx = all.findIndex((c) => c.id === id);
  if (idx === -1) return null;
  all[idx] = { ...all[idx], ...patch, id };
  writeAll(all);
  return all[idx];
}

export function deleteCampaign(id: string): boolean {
  const all = readAll();
  const next = all.filter((c) => c.id !== id);
  if (next.length === all.length) return false;
  writeAll(next);
  return true;
}
