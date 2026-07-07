import fs from "fs";
import path from "path";

// JSON-fil-baserad lagring av nyhetsbrevsprenumeranter, server-only.
// Samma Vercel-brasklapp som övriga lager i den här mappen — byt ut mot en
// riktig lista hos e-postleverantören (t.ex. Resends "audiences") eller en
// databastabell i produktion.

export interface NewsletterSubscriber {
  email: string;
  subscribedAt: string;
}

const DATA_DIR = path.join(process.cwd(), "data");
const FILE = path.join(DATA_DIR, "newsletter.json");

function ensureFile() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(FILE)) fs.writeFileSync(FILE, "[]");
}

function readAll(): NewsletterSubscriber[] {
  ensureFile();
  try {
    const parsed = JSON.parse(fs.readFileSync(FILE, "utf-8"));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(subs: NewsletterSubscriber[]) {
  ensureFile();
  fs.writeFileSync(FILE, JSON.stringify(subs, null, 2));
}

export function addSubscriber(email: string): { added: boolean } {
  const all = readAll();
  const normalized = email.trim().toLowerCase();
  if (all.some((s) => s.email === normalized)) {
    return { added: false };
  }
  writeAll([...all, { email: normalized, subscribedAt: new Date().toISOString() }]);
  return { added: true };
}
