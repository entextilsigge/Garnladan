import fs from "fs";
import path from "path";

// ---------------------------------------------------------------------------
// Enkel intern felloggning — server-only (använder "fs"), samma
// JSON-fils-mönster som övriga datalager. Ersätter INTE en riktig
// felövervakningstjänst (Sentry m.fl.) — det kräver ett nytt konto som
// medvetet väntar. Ger admin viss insyn i fångade serverfel (webhooks,
// betalnings-API:er) under tiden, via "Felloggen" i /admin.
//
// Listan trimmas till de senaste MAX_ERRORS för att inte växa obegränsat.
// ---------------------------------------------------------------------------

export interface LoggedError {
  id: string;
  timestamp: string;
  message: string;
  context?: string;
}

const DATA_DIR = path.join(process.cwd(), "data");
const ERRORS_FILE = path.join(DATA_DIR, "errors.json");
const MAX_ERRORS = 200;

function ensureFile() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(ERRORS_FILE)) fs.writeFileSync(ERRORS_FILE, "[]");
}

function readAll(): LoggedError[] {
  ensureFile();
  try {
    const parsed = JSON.parse(fs.readFileSync(ERRORS_FILE, "utf-8"));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(errors: LoggedError[]) {
  ensureFile();
  fs.writeFileSync(ERRORS_FILE, JSON.stringify(errors, null, 2));
}

/**
 * Loggar ett fångat serverfel. Kastar aldrig själv — ett trasigt fellogg-
 * skrivförsök ska inte krascha den kod som faktiskt försöker rapportera ett
 * annat fel.
 */
export function logError(message: string, context?: string): void {
  try {
    const all = readAll();
    all.unshift({
      id: `err_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date().toISOString(),
      message,
      context,
    });
    writeAll(all.slice(0, MAX_ERRORS));
  } catch (err) {
    console.error("[errorLogStore] Kunde inte skriva till felloggen", err);
  }
}

export function getRecentErrors(limit = 50): LoggedError[] {
  return readAll().slice(0, limit);
}
