import fs from "fs";
import path from "path";

// ---------------------------------------------------------------------------
// Idempotens-logg för Stripe-webhooks — server-only (använder "fs"), samma
// JSON-fils-mönster som övriga datalager.
//
// Stripe kan skicka samma händelse (samma event.id) flera gånger, t.ex. vid
// timeout eller nätverksstrul innan vårt svar hinner fram. Utan den här
// spärren skulle en upprepad payment_intent.succeeded-händelse kunna skicka
// dubbla bekräftelsemejl eller (om vi någon gång kopplar effekter direkt
// till händelsen) köra affärslogik två gånger. Se
// app/api/webhooks/stripe/route.ts.
//
// Listan trimmas till de senaste MAX_EVENTS för att inte växa obegränsat —
// Stripe garanterar inte leverans i evighet, så det räcker gott och väl för
// att fånga rimliga retry-fönster.
// ---------------------------------------------------------------------------

const DATA_DIR = path.join(process.cwd(), "data");
const EVENTS_FILE = path.join(DATA_DIR, "webhookEvents.json");
const MAX_EVENTS = 2000;

function ensureFile() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(EVENTS_FILE)) fs.writeFileSync(EVENTS_FILE, "[]");
}

function readAll(): string[] {
  ensureFile();
  try {
    const parsed = JSON.parse(fs.readFileSync(EVENTS_FILE, "utf-8"));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(ids: string[]) {
  ensureFile();
  fs.writeFileSync(EVENTS_FILE, JSON.stringify(ids, null, 2));
}

export function hasProcessedEvent(eventId: string): boolean {
  return readAll().includes(eventId);
}

export function markEventProcessed(eventId: string): void {
  const all = readAll();
  if (all.includes(eventId)) return;
  all.push(eventId);
  writeAll(all.slice(-MAX_EVENTS));
}
