import fs from "fs";
import path from "path";
import type { PaymentMethod, ShippingDetails } from "@/lib/checkout";
import type { OrderAttribution } from "@/lib/data/orderStore";

// ---------------------------------------------------------------------------
// Kortlivad mellanlagring mellan POST /api/checkout/session och POST
// /api/checkout/confirm — motsvarar hur Stripe/Klarna redan håller reda på
// en sessions innehåll internt mellan "create" och "confirm"/webhook. Detta
// gör att /api/checkout/confirm kan slutföra en order (för admin-vyn) utan
// att behöva räkna om priset — själva prisberäkningslogiken i
// app/api/checkout/session/route.ts rörs inte.
//
// Samma Vercel-brasklapp som övriga JSON-lager i den här mappen: en session
// som skapas och sedan konsumeras inom samma request-cykel fungerar alltid,
// men lagret som helhet bör ersättas av en riktig databas (eller Stripes/
// Klarnas egen sessionshantering) i produktion.
// ---------------------------------------------------------------------------

export interface PendingSessionItem {
  slug: string;
  name: string;
  colorName: string;
  quantity: number;
  unitPrice: number;
}

export interface PendingSession {
  sessionId: string;
  createdAt: string;
  items: PendingSessionItem[];
  shipping: ShippingDetails;
  paymentMethod: PaymentMethod;
  subtotal: number;
  shippingCost: number;
  amount: number;
  attribution: OrderAttribution;
}

const DATA_DIR = path.join(process.cwd(), "data");
const SESSIONS_FILE = path.join(DATA_DIR, "checkoutSessions.json");

function ensureFile() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(SESSIONS_FILE)) fs.writeFileSync(SESSIONS_FILE, "[]");
}

function readAll(): PendingSession[] {
  ensureFile();
  try {
    const parsed = JSON.parse(fs.readFileSync(SESSIONS_FILE, "utf-8"));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(sessions: PendingSession[]) {
  ensureFile();
  fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessions, null, 2));
}

export function saveSession(session: PendingSession) {
  const all = readAll();
  writeAll([...all, session]);
}

/** Hämtar och tar samtidigt bort sessionen (kan bara konsumeras en gång). */
export function consumeSession(sessionId: string): PendingSession | null {
  const all = readAll();
  const idx = all.findIndex((s) => s.sessionId === sessionId);
  if (idx === -1) return null;
  const [session] = all.splice(idx, 1);
  writeAll(all);
  return session;
}
