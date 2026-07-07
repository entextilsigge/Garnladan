import fs from "fs";
import path from "path";

// ---------------------------------------------------------------------------
// Orderlager — JSON-fil-baserad, server-only (använder "fs").
//
// Samma brasklapp som lib/data/productStore.ts: fungerar utmärkt lokalt,
// men skrivningar försvinner mellan deploys/cold starts på Vercels
// serverless-funktioner (read-only filsystem i produktion). Byt ut
// readAll/writeAll mot en riktig databas för produktion — app/api/admin/
// orders/* och app/api/checkout/confirm pratar bara med funktionerna här.
// ---------------------------------------------------------------------------

/**
 * Packflödet — helt manuellt, ingen fraktförmedlarintegration (Fraktjakt/
 * Sendcloud) i det här skedet. "vantar_packning" är default för en ny,
 * betald order; "packad" är ett valfritt mellansteg; "skickad" sätts när
 * spårningsnumret matats in (se updateOrderFulfillment nedan), vilket
 * triggar skickad-mejlet i lib/email.ts.
 */
export type OrderStatus = "vantar_packning" | "packad" | "skickad";

/**
 * Betalstatus enligt Stripe — helt separat från OrderStatus (leverans-
 * status). Sätts till "paid" direkt av det mockade flödet (allt lyckas),
 * eller av app/api/webhooks/stripe/route.ts när en riktig
 * payment_intent.succeeded/payment_intent.payment_failed tas emot. Ändras
 * ALDRIG manuellt i admin (utom via en lyckad återbetalning, se
 * recordRefund nedan) — Stripe (eller mock-flödet) är alltid sanningskällan.
 */
export type PaymentStatus = "pending" | "paid" | "failed" | "refunded" | "partially_refunded";

/** En enskild återbetalning mot ordern — flera delåterbetalningar kan förekomma. */
export interface OrderRefund {
  id: string;
  /** Stripes refund-id (re_...), för spårbarhet mot Stripe Dashboard. */
  stripeRefundId: string;
  amount: number;
  createdAt: string;
}

export interface OrderItem {
  slug: string;
  name: string;
  colorName: string;
  quantity: number;
  unitPrice: number;
}

export interface OrderCustomer {
  firstName: string;
  lastName: string;
  email: string;
  address: string;
  postalCode: string;
  city: string;
}

/**
 * Marknadsföringsattribution, fångad från utm_source/utm_medium/utm_campaign
 * vid landning (se components/UtmCapture.tsx + lib/attribution.ts) och
 * kopplad till ordern i checkout-flödet. Default-värden ("direkt"/"okänt"/
 * "okänd") används när inga UTM-parametrar finns.
 */
export interface OrderAttribution {
  source: string;
  medium: string;
  campaign: string;
}

export interface Order {
  id: string;
  createdAt: string;
  status: OrderStatus;
  /** Stripes faktiska betalstatus (eller "paid" direkt i mockat läge). */
  paymentStatus: PaymentStatus;
  /** Stripe PaymentIntent-id — saknas i mockat läge. */
  paymentIntentId?: string;
  /** PostNords spårningsnummer — sätts av admin när status blir "skickad". */
  trackingNumber?: string;
  customer: OrderCustomer;
  shippingMethod: string;
  shippingLabel: string;
  /**
   * Betalmetod. Sätts generiskt till "stripe" när PaymentIntenten skapas,
   * men uppdateras till den faktiska metoden (t.ex. "card", "klarna") av
   * webhooken när payment_intent.succeeded tas emot — se
   * app/api/webhooks/stripe/route.ts.
   */
  paymentMethod: string;
  items: OrderItem[];
  subtotal: number;
  shippingCost: number;
  total: number;
  attribution: OrderAttribution;
  /** Logg över återbetalningar mot ordern (kan vara flera delåterbetalningar). */
  refunds?: OrderRefund[];
  /**
   * Nycklar (`${slug}::${colorName}`) för orderrader vars lager admin redan
   * bekräftat är återlagt, så en rad inte råkar krediteras dubbelt om flera
   * delåterbetalningar berör samma order. Sätts automatiskt för alla rader
   * vid en FULL återbetalning; sätts manuellt av admin, rad för rad, vid
   * delåterbetalning (se restockOrderItems nedan och POST .../refund).
   */
  restockedItemKeys?: string[];
}

const DATA_DIR = path.join(process.cwd(), "data");
const ORDERS_FILE = path.join(DATA_DIR, "orders.json");

function ensureFile() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(ORDERS_FILE)) fs.writeFileSync(ORDERS_FILE, "[]");
}

function readAll(): Order[] {
  ensureFile();
  try {
    const parsed = JSON.parse(fs.readFileSync(ORDERS_FILE, "utf-8"));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(orders: Order[]) {
  ensureFile();
  fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2));
}

export function getAllOrders(): Order[] {
  return readAll().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getOrderById(id: string): Order | undefined {
  return readAll().find((o) => o.id === id);
}

export function createOrder(order: Order): Order {
  const all = readAll();
  writeAll([...all, order]);
  return order;
}

/**
 * Uppdaterar packningsstatus och/eller spårningsnummer i ett svep — så att
 * app/api/admin/orders/[id]/route.ts kan jämföra gammal/ny status (för att
 * avgöra om skickad-mejlet ska triggas) utifrån samma atomiska skrivning.
 */
export function updateOrderFulfillment(
  id: string,
  updates: { status?: OrderStatus; trackingNumber?: string }
): Order | null {
  const all = readAll();
  const idx = all.findIndex((o) => o.id === id);
  if (idx === -1) return null;
  all[idx] = {
    ...all[idx],
    ...(updates.status ? { status: updates.status } : {}),
    ...(updates.trackingNumber !== undefined ? { trackingNumber: updates.trackingNumber } : {}),
  };
  writeAll(all);
  return all[idx];
}

export function updatePaymentStatus(id: string, paymentStatus: PaymentStatus): Order | null {
  const all = readAll();
  const idx = all.findIndex((o) => o.id === id);
  if (idx === -1) return null;
  all[idx] = { ...all[idx], paymentStatus };
  writeAll(all);
  return all[idx];
}

/** Ersätter den generiska "stripe"-etiketten med den faktiska betalmetoden (t.ex. "card", "klarna"). */
export function updatePaymentMethod(id: string, paymentMethod: string): Order | null {
  const all = readAll();
  const idx = all.findIndex((o) => o.id === id);
  if (idx === -1) return null;
  all[idx] = { ...all[idx], paymentMethod };
  writeAll(all);
  return all[idx];
}

/**
 * Loggar en lyckad Stripe-återbetalning på ordern och sätter betalstatus
 * till "refunded" (full) eller "partially_refunded" (delbelopp) utifrån
 * totalt återbetalt belopp hittills jämfört med ordersumman. Anropas ENDAST
 * efter att stripe.refunds.create() faktiskt lyckats (se
 * app/api/admin/orders/[id]/refund/route.ts) — aldrig i förväg.
 */
export function recordRefund(id: string, refund: OrderRefund): Order | null {
  const all = readAll();
  const idx = all.findIndex((o) => o.id === id);
  if (idx === -1) return null;
  const current = all[idx];
  const refunds = [...(current.refunds ?? []), refund];
  const totalRefunded = refunds.reduce((sum, r) => sum + r.amount, 0);
  const paymentStatus: PaymentStatus = totalRefunded >= current.total ? "refunded" : "partially_refunded";
  all[idx] = { ...current, refunds, paymentStatus };
  writeAll(all);
  return all[idx];
}

/** Markerar orderrader (`${slug}::${colorName}`) som redan återlagda i lager, så de inte krediteras igen. */
export function markItemsRestocked(id: string, itemKeys: string[]): Order | null {
  const all = readAll();
  const idx = all.findIndex((o) => o.id === id);
  if (idx === -1) return null;
  const current = all[idx];
  const restockedItemKeys = Array.from(new Set([...(current.restockedItemKeys ?? []), ...itemKeys]));
  all[idx] = { ...current, restockedItemKeys };
  writeAll(all);
  return all[idx];
}
