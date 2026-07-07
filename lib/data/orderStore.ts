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

export type OrderStatus = "mottagen" | "skickad" | "levererad";

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
  customer: OrderCustomer;
  shippingMethod: string;
  shippingLabel: string;
  paymentMethod: string;
  items: OrderItem[];
  subtotal: number;
  shippingCost: number;
  total: number;
  attribution: OrderAttribution;
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

export function updateOrderStatus(id: string, status: OrderStatus): Order | null {
  const all = readAll();
  const idx = all.findIndex((o) => o.id === id);
  if (idx === -1) return null;
  all[idx] = { ...all[idx], status };
  writeAll(all);
  return all[idx];
}
