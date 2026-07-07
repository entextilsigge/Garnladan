#!/usr/bin/env node
"use strict";

/**
 * Dev-only seedscript för att fylla adminstatistiken med realistisk
 * testdata: ordrar spridda över ~5 månader, varierande kampanjkällor,
 * kunder och marginaler. Körs manuellt med `npm run seed:analytics`.
 *
 * INTE avsett för produktion — vägrar köra om NODE_ENV=production eller om
 * den körs på Vercel (VERCEL-miljövariabeln). Idempotent: tar bort tidigare
 * SEED-genererade ordrar/kampanjer (identifierade via "SEED-"-prefix
 * respektive kampanjnamn) innan nya skapas, så upprepade körningar inte
 * dubblar upp data.
 *
 * OBS: fraktpriser/gränsen för fri frakt är hårdkodade här för att spegla
 * lib/checkout.ts (SHIPPING_OPTIONS) och lib/format.ts
 * (FREE_SHIPPING_THRESHOLD) utan att behöva köra TypeScript i ett rent
 * Node-script. Håll dem i synk om de ändras där.
 */

const fs = require("fs");
const path = require("path");

if (process.env.NODE_ENV === "production" || process.env.VERCEL) {
  console.error("Vägrar seeda testdata i produktionsmiljö. Kör bara lokalt.");
  process.exit(1);
}

const DATA_DIR = path.join(__dirname, "..", "data");
const PRODUCTS_FILE = path.join(DATA_DIR, "products.json");
const ORDERS_FILE = path.join(DATA_DIR, "orders.json");
const CAMPAIGNS_FILE = path.join(DATA_DIR, "campaigns.json");

const FREE_SHIPPING_THRESHOLD = 499;
const SHIPPING_OPTIONS = [
  { id: "ombud", label: "PostNord — ombud", price: 49 },
  { id: "hem", label: "Hemleverans", price: 89 },
  { id: "ladan", label: "Hämta i Vargön", price: 0 },
];

const SEED_ORDER_PREFIX = "SEED-";
const ORDER_COUNT = 140;

const products = JSON.parse(fs.readFileSync(PRODUCTS_FILE, "utf-8"));

const FIRST_NAMES = [
  "Anna", "Erik", "Maria", "Johan", "Karin", "Lars", "Sofia", "Anders",
  "Emma", "Per", "Linnea", "Mikael", "Ingrid", "Oskar", "Astrid", "Gustav",
  "Elin", "Fredrik", "Sara", "Nils",
];
const LAST_NAMES = [
  "Andersson", "Johansson", "Karlsson", "Nilsson", "Eriksson", "Larsson",
  "Olsson", "Persson", "Svensson", "Gustafsson", "Pettersson", "Jonsson",
];
const CITIES = [
  { city: "Vänersborg", postalCode: "462 30" },
  { city: "Vargön", postalCode: "468 30" },
  { city: "Trollhättan", postalCode: "461 32" },
  { city: "Göteborg", postalCode: "411 05" },
  { city: "Stockholm", postalCode: "111 22" },
  { city: "Malmö", postalCode: "211 19" },
  { city: "Uppsala", postalCode: "753 09" },
  { city: "Örebro", postalCode: "702 15" },
  { city: "Skövde", postalCode: "541 30" },
  { city: "Linköping", postalCode: "582 22" },
  { city: "Huskvarna", postalCode: "561 32" },
];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function weightedPick(items, weightFn) {
  const weights = items.map(weightFn);
  const total = weights.reduce((s, w) => s + w, 0);
  let r = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

function daysAgo(n) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d;
}

function isoAt(date, hour, minute) {
  const d = new Date(date);
  d.setUTCHours(hour, minute, 0, 0);
  return d.toISOString();
}

// --- Kampanjer ---------------------------------------------------------

const SEEDED_CAMPAIGNS = [
  {
    name: "varkampanj-2026",
    channel: "Instagram",
    startDate: daysAgo(70).toISOString().slice(0, 10),
    endDate: daysAgo(56).toISOString().slice(0, 10),
    budget: 6000,
  },
  {
    name: "nyhetsbrev-maskan",
    channel: "E-post",
    startDate: daysAgo(40).toISOString().slice(0, 10),
    endDate: daysAgo(33).toISOString().slice(0, 10),
    budget: null,
  },
  {
    name: "hostrea-2025",
    channel: "Google Ads",
    startDate: daysAgo(140).toISOString().slice(0, 10),
    endDate: daysAgo(126).toISOString().slice(0, 10),
    budget: 9500,
  },
];

function seedCampaigns() {
  const existing = JSON.parse(fs.readFileSync(CAMPAIGNS_FILE, "utf-8"));
  const seededNames = new Set(SEEDED_CAMPAIGNS.map((c) => c.name));
  const kept = existing.filter((c) => !seededNames.has(c.name));
  const fresh = SEEDED_CAMPAIGNS.map((c, i) => ({
    id: `seed_campaign_${i}`,
    ...c,
  }));
  fs.writeFileSync(CAMPAIGNS_FILE, JSON.stringify([...kept, ...fresh], null, 2));
  return fresh;
}

// --- Attribution ---------------------------------------------------------

function attributionForDate(date, campaigns) {
  // Under en kampanjperiod: större chans att ordern attribueras dit.
  for (const c of campaigns) {
    const start = new Date(`${c.startDate}T00:00:00.000Z`);
    const end = new Date(`${c.endDate}T23:59:59.999Z`);
    if (date >= start && date <= end && Math.random() < 0.55) {
      const mediumByChannel = { Instagram: "social", "E-post": "email", "Google Ads": "cpc" };
      return { source: c.channel.toLowerCase().replace(/\s+/g, "-"), medium: mediumByChannel[c.channel] || "okänt", campaign: c.name };
    }
  }
  const roll = Math.random();
  if (roll < 0.4) return { source: "direkt", medium: "okänt", campaign: "okänd" };
  if (roll < 0.65) return { source: "google", medium: "organic", campaign: "okänd" };
  if (roll < 0.85) return { source: "instagram", medium: "social", campaign: "okänd" };
  return { source: "nyhetsbrev", medium: "email", campaign: "okänd" };
}

// --- Kunder ---------------------------------------------------------

const CUSTOMER_POOL = Array.from({ length: 22 }).map(() => {
  const firstName = pick(FIRST_NAMES);
  const lastName = pick(LAST_NAMES);
  const place = pick(CITIES);
  return {
    firstName,
    lastName,
    email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${Math.floor(Math.random() * 90)}@example.se`,
    address: `${pick(["Storgatan", "Kyrkogatan", "Skolvägen", "Ringvägen", "Parkgatan"])} ${1 + Math.floor(Math.random() * 40)}`,
    postalCode: place.postalCode,
    city: place.city,
  };
});

function pickCustomer() {
  // 70% chans att återanvända en befintlig kund (skapar återkommande köp).
  if (Math.random() < 0.7) return pick(CUSTOMER_POOL);
  const firstName = pick(FIRST_NAMES);
  const lastName = pick(LAST_NAMES);
  const place = pick(CITIES);
  return {
    firstName,
    lastName,
    email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${Math.floor(Math.random() * 900)}@example.se`,
    address: `${pick(["Storgatan", "Kyrkogatan", "Skolvägen", "Ringvägen", "Parkgatan"])} ${1 + Math.floor(Math.random() * 40)}`,
    postalCode: place.postalCode,
    city: place.city,
  };
}

// --- Ordrar ---------------------------------------------------------

function statusForDate(date) {
  const ageDays = (Date.now() - date.getTime()) / 86_400_000;
  if (ageDays > 14) return Math.random() < 0.9 ? "levererad" : "skickad";
  if (ageDays > 6) return Math.random() < 0.6 ? "skickad" : Math.random() < 0.5 ? "levererad" : "mottagen";
  return Math.random() < 0.7 ? "mottagen" : "skickad";
}

function buildOrderLines() {
  const lineCount = 1 + Math.floor(Math.random() * 2.5);
  const lines = [];
  for (let i = 0; i < lineCount; i++) {
    const product = weightedPick(products, (p) => p.popularity);
    const inStock = product.colorways.filter((c) => c.stock > 0);
    const colorway = pick(inStock.length > 0 ? inStock : product.colorways);
    const quantity = 1 + Math.floor(Math.random() * 3);
    lines.push({
      slug: product.slug,
      name: product.name,
      colorName: colorway.name,
      quantity,
      unitPrice: product.price,
    });
  }
  return lines;
}

function seedOrders(campaigns) {
  const existing = JSON.parse(fs.readFileSync(ORDERS_FILE, "utf-8"));
  const kept = existing.filter((o) => !o.id.startsWith(SEED_ORDER_PREFIX));

  const seeded = [];
  for (let i = 0; i < ORDER_COUNT; i++) {
    const dayOffset = Math.floor(Math.random() * 150); // senaste ~5 månaderna
    const date = daysAgo(dayOffset);
    const createdAt = isoAt(date, 8 + Math.floor(Math.random() * 12), Math.floor(Math.random() * 60));
    const createdDate = new Date(createdAt);

    const items = buildOrderLines();
    const subtotal = items.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
    const shippingOption = pick(SHIPPING_OPTIONS);
    const shippingCost = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : shippingOption.price;
    const total = subtotal + shippingCost;
    const customer = pickCustomer();
    const attribution = attributionForDate(createdDate, campaigns);

    seeded.push({
      id: `${SEED_ORDER_PREFIX}${String(i).padStart(4, "0")}`,
      createdAt,
      status: statusForDate(createdDate),
      customer,
      shippingMethod: shippingOption.id,
      shippingLabel: shippingOption.label,
      paymentMethod: Math.random() < 0.7 ? "kort" : "klarna",
      items,
      subtotal,
      shippingCost,
      total,
      attribution,
    });
  }

  // Sorterat fallande på datum, i linje med hur orderStore.getAllOrders() returnerar dem.
  const all = [...kept, ...seeded].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  fs.writeFileSync(ORDERS_FILE, JSON.stringify(all, null, 2));
  return seeded.length;
}

const campaigns = seedCampaigns();
const orderCount = seedOrders(campaigns);

console.log(`Klart! Seedade ${orderCount} testordrar och ${campaigns.length} kampanjer i data/.`);
console.log("Starta om dev-servern (eller ladda om /admin) för att se statistiken fyllas i.");
console.log('Kör npm run seed:analytics igen när som helst — tidigare seed-data ("SEED-"-ordrar) rensas och ersätts automatiskt.');
