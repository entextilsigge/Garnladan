import fs from "fs";
import path from "path";
import type { ShippingSettings } from "@/lib/checkout";
import { DEFAULT_SHIPPING_SETTINGS } from "@/lib/checkout";

// ---------------------------------------------------------------------------
// Inställningslager — JSON-fil-baserad, server-only (använder "fs").
//
// Samma brasklapp som lib/data/productStore.ts/orderStore.ts: fungerar
// utmärkt lokalt, men skrivningar försvinner mellan deploys/cold starts på
// Vercels serverless-funktioner (read-only filsystem i produktion). Byt ut
// readSettings/writeSettings mot en riktig databas för produktion.
//
// Idag innehåller den bara fraktinställningar (flat rate-priser och
// fri frakt-gräns) — se lib/checkout.ts för typen och hur priserna
// tillämpas i kassan.
// ---------------------------------------------------------------------------

const DATA_DIR = path.join(process.cwd(), "data");
const SETTINGS_FILE = path.join(DATA_DIR, "settings.json");

function ensureFile() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(SETTINGS_FILE)) {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(DEFAULT_SHIPPING_SETTINGS, null, 2));
  }
}

export function getShippingSettings(): ShippingSettings {
  ensureFile();
  try {
    const parsed = JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf-8"));
    return { ...DEFAULT_SHIPPING_SETTINGS, ...parsed };
  } catch {
    return { ...DEFAULT_SHIPPING_SETTINGS };
  }
}

export function updateShippingSettings(patch: Partial<ShippingSettings>): ShippingSettings {
  const current = getShippingSettings();
  const next: ShippingSettings = {
    ombudPrice: typeof patch.ombudPrice === "number" ? patch.ombudPrice : current.ombudPrice,
    hemPrice: typeof patch.hemPrice === "number" ? patch.hemPrice : current.hemPrice,
    freeShippingEnabled:
      typeof patch.freeShippingEnabled === "boolean"
        ? patch.freeShippingEnabled
        : current.freeShippingEnabled,
    freeShippingThreshold:
      typeof patch.freeShippingThreshold === "number"
        ? patch.freeShippingThreshold
        : current.freeShippingThreshold,
  };
  ensureFile();
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(next, null, 2));
  return next;
}
