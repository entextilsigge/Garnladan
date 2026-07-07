import type { Product } from "@/lib/products";
import type { Order } from "@/lib/data/orderStore";
import type { Campaign } from "@/lib/data/campaignStore";
import { DEFAULT_ATTRIBUTION } from "@/lib/attribution";

// ---------------------------------------------------------------------------
// Analysmotor för adminstatistiken. Rena funktioner som tar produkter,
// ordrar och kampanjer (redan inlästa från respektive JSON-lager) och
// beräknar allt dashboarden visar. Ingen "fs" här — kan i teorin testas
// eller återanvändas oberoende av datalagret.
//
// Viktig förenkling: `costPrice` är statiskt per produkt i katalogen (inte
// historiserat per order). Marginal på historiska ordrar räknas därför mot
// produktens NUVARANDE inköpspris, inte det som faktiskt gällde när ordern
// lades. Fullt korrekt hade krävt att spara costPrice på varje orderrad vid
// köptillfället — rimligt att lägga till senare om marginalhistorik ska
// vara exakt bakåt i tiden.
// ---------------------------------------------------------------------------

export type Granularity = "day" | "week" | "month";

export interface AnalyticsRange {
  from: string; // YYYY-MM-DD
  to: string; // YYYY-MM-DD
}

const LOW_STOCK_THRESHOLD = 10;
const HIGH_STOCK_THRESHOLD = 30;
const RUNOUT_RISK_DAYS = 14;
const TOP_N = 5;

// -- Datumhjälpare ------------------------------------------------------------

function parseDate(s: string): Date {
  const d = new Date(`${s}T00:00:00.000Z`);
  return d;
}

function toDateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function toMonthKey(d: Date): string {
  return d.toISOString().slice(0, 7);
}

function addDays(d: Date, n: number): Date {
  const next = new Date(d);
  next.setUTCDate(next.getUTCDate() + n);
  return next;
}

function addMonths(d: Date, n: number): Date {
  const next = new Date(d);
  next.setUTCMonth(next.getUTCMonth() + n);
  return next;
}

function startOfWeek(d: Date): Date {
  const day = d.getUTCDay(); // 0 = söndag
  const diff = (day + 6) % 7; // dagar sedan senaste måndag
  return addDays(d, -diff);
}

function bucketKeyFor(d: Date, granularity: Granularity): string {
  if (granularity === "day") return toDateKey(d);
  if (granularity === "week") return toDateKey(startOfWeek(d));
  return toMonthKey(d);
}

function bucketLabel(key: string, granularity: Granularity): string {
  if (granularity === "month") {
    const [y, m] = key.split("-");
    return `${MONTH_NAMES[Number(m) - 1]} ${y}`;
  }
  const d = parseDate(key);
  return d.toLocaleDateString("sv-SE", { day: "numeric", month: "short" });
}

const MONTH_NAMES = [
  "jan",
  "feb",
  "mar",
  "apr",
  "maj",
  "jun",
  "jul",
  "aug",
  "sep",
  "okt",
  "nov",
  "dec",
];

/** Ordnad lista av bucket-nycklar mellan from/to (inkl.), så tomma perioder syns som 0 istället för att hoppas över. */
function enumerateBuckets(from: Date, to: Date, granularity: Granularity): string[] {
  const keys: string[] = [];
  let cursor =
    granularity === "week" ? startOfWeek(from) : granularity === "month" ? new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), 1)) : new Date(from);
  const step = (d: Date) =>
    granularity === "day" ? addDays(d, 1) : granularity === "week" ? addDays(d, 7) : addMonths(d, 1);

  let guard = 0;
  while (bucketKeyFor(cursor, granularity) <= bucketKeyFor(to, granularity) && guard < 400) {
    keys.push(bucketKeyFor(cursor, granularity));
    cursor = step(cursor);
    guard++;
  }
  return keys;
}

function inRange(order: Order, from: Date, to: Date): boolean {
  const t = new Date(order.createdAt).getTime();
  return t >= from.getTime() && t <= addDays(to, 1).getTime() - 1;
}

/** Order.attribution saknas på ordrar skapade innan attributionsspårning fanns — faller tillbaka på defaults. */
function attributionOf(order: Order) {
  return order.attribution ?? DEFAULT_ATTRIBUTION;
}

function round(n: number, decimals = 0): number {
  const f = 10 ** decimals;
  return Math.round(n * f) / f;
}

function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return round(((current - previous) / previous) * 100, 1);
}

// -- Publikt resultat ---------------------------------------------------------

export interface AnalyticsResult {
  range: AnalyticsRange;
  granularity: Granularity;
  meta: {
    orderCountInRange: number;
    totalOrderCountAllTime: number;
    thinData: boolean;
  };
  overview: {
    series: { key: string; label: string; revenue: number; orders: number }[];
    totalRevenue: number;
    totalOrders: number;
    aov: number;
    monthComparison: {
      currentMonthLabel: string;
      revenue: number;
      orders: number;
      aov: number;
      vsPreviousMonth: { revenuePct: number | null; ordersPct: number | null; aovPct: number | null };
      vsSameMonthLastYear: {
        revenuePct: number | null;
        ordersPct: number | null;
        aovPct: number | null;
        insufficientHistory: boolean;
      };
    };
  };
  profitability: {
    totalMarginPct: number | null;
    totalMarginAmount: number;
    byCategory: { category: string; revenue: number; marginAmount: number; marginPct: number | null }[];
    topMarginProducts: { slug: string; name: string; marginPct: number }[];
    bottomMarginProducts: { slug: string; name: string; marginPct: number }[];
    topContributionProducts: { slug: string; name: string; marginAmount: number; unitsSold: number }[];
    bottomContributionProducts: { slug: string; name: string; marginAmount: number; unitsSold: number }[];
    marginTrend: { key: string; label: string; marginPct: number }[];
  };
  products: {
    bestSellers: { slug: string; name: string; units: number; revenue: number }[];
    worstSellers: { slug: string; name: string; units: number; revenue: number }[];
    colorwaySales: { slug: string; productName: string; colorName: string; hex: string; units: number }[];
    turnover: {
      slug: string;
      productName: string;
      colorName: string;
      currentStock: number;
      unitsSoldInRange: number;
      velocityPerDay: number;
      daysOfStockRemaining: number | null;
    }[];
    lowStockHighVelocity: {
      slug: string;
      productName: string;
      colorName: string;
      currentStock: number;
      daysOfStockRemaining: number;
    }[];
    highStockLowVelocity: { slug: string; productName: string; colorName: string; currentStock: number }[];
  };
  customers: {
    newVsReturning: { newCustomers: number; returningCustomers: number; newRevenue: number; returningRevenue: number };
    geo: { place: string; orders: number; revenue: number }[];
    orderValueHistogram: { bucket: string; count: number }[];
    frequency: { oneTime: number; repeat: number };
  };
  marketing: {
    bySource: { source: string; medium: string; campaign: string; orders: number; revenue: number }[];
    campaigns: {
      id: string;
      name: string;
      channel: string;
      startDate: string;
      endDate: string;
      budget: number | null;
      attributedOrders: number;
      attributedRevenue: number;
      siteWideDuringRevenue: number;
      siteWideBeforeRevenue: number;
      liftPct: number | null;
      roi: number | null;
    }[];
  };
}

export function computeAnalytics(input: {
  products: Product[];
  orders: Order[];
  campaigns: Campaign[];
  range: AnalyticsRange;
  granularity: Granularity;
}): AnalyticsResult {
  const { products, campaigns, range, granularity } = input;
  const orders = input.orders;
  const from = parseDate(range.from);
  const to = parseDate(range.to);
  const ordersInRange = orders.filter((o) => inRange(o, from, to));

  const productBySlug = new Map(products.map((p) => [p.slug, p]));

  return {
    range,
    granularity,
    meta: {
      orderCountInRange: ordersInRange.length,
      totalOrderCountAllTime: orders.length,
      thinData: orders.length < 10,
    },
    overview: computeOverview(orders, ordersInRange, from, to, granularity),
    profitability: computeProfitability(ordersInRange, productBySlug, from, to, granularity),
    products: computeProductPerformance(ordersInRange, products, from, to),
    customers: computeCustomers(orders, ordersInRange, from, to),
    marketing: computeMarketing(ordersInRange, orders, campaigns),
  };
}

// -- 1. Försäljningsöversikt ---------------------------------------------------

function computeOverview(
  allOrders: Order[],
  ordersInRange: Order[],
  from: Date,
  to: Date,
  granularity: Granularity
): AnalyticsResult["overview"] {
  const buckets = enumerateBuckets(from, to, granularity);
  const byBucket = new Map<string, { revenue: number; orders: number }>();
  for (const key of buckets) byBucket.set(key, { revenue: 0, orders: 0 });

  for (const order of ordersInRange) {
    const key = bucketKeyFor(new Date(order.createdAt), granularity);
    const bucket = byBucket.get(key);
    if (bucket) {
      bucket.revenue += order.total;
      bucket.orders += 1;
    }
  }

  const series = buckets.map((key) => ({
    key,
    label: bucketLabel(key, granularity),
    revenue: round(byBucket.get(key)!.revenue),
    orders: byBucket.get(key)!.orders,
  }));

  const totalRevenue = round(ordersInRange.reduce((s, o) => s + o.total, 0));
  const totalOrders = ordersInRange.length;
  const aov = totalOrders > 0 ? round(totalRevenue / totalOrders) : 0;

  // Månadsjämförelse: alltid innevarande hela kalendermånad för `to`-datumet
  // i den valda perioden, oberoende av periodfiltret ovan — annars blir
  // "månad mot månad" obegripligt om användaren filtrerar på t.ex. 7 dagar.
  const currentMonthKey = toMonthKey(to);
  const previousMonthKey = toMonthKey(addMonths(to, -1));
  const sameMonthLastYearKey = toMonthKey(addMonths(to, -12));

  const monthTotals = (monthKey: string) => {
    const matching = allOrders.filter((o) => toMonthKey(new Date(o.createdAt)) === monthKey);
    const revenue = round(matching.reduce((s, o) => s + o.total, 0));
    const count = matching.length;
    return { revenue, orders: count, aov: count > 0 ? round(revenue / count) : 0 };
  };

  const current = monthTotals(currentMonthKey);
  const previous = monthTotals(previousMonthKey);
  const lastYear = monthTotals(sameMonthLastYearKey);

  const [y, m] = currentMonthKey.split("-");

  return {
    series,
    totalRevenue,
    totalOrders,
    aov,
    monthComparison: {
      currentMonthLabel: `${MONTH_NAMES[Number(m) - 1]} ${y}`,
      revenue: current.revenue,
      orders: current.orders,
      aov: current.aov,
      vsPreviousMonth: {
        revenuePct: previous.orders > 0 ? pctChange(current.revenue, previous.revenue) : null,
        ordersPct: previous.orders > 0 ? pctChange(current.orders, previous.orders) : null,
        aovPct: previous.orders > 0 ? pctChange(current.aov, previous.aov) : null,
      },
      vsSameMonthLastYear: {
        revenuePct: lastYear.orders > 0 ? pctChange(current.revenue, lastYear.revenue) : null,
        ordersPct: lastYear.orders > 0 ? pctChange(current.orders, lastYear.orders) : null,
        aovPct: lastYear.orders > 0 ? pctChange(current.aov, lastYear.aov) : null,
        insufficientHistory: lastYear.orders === 0,
      },
    },
  };
}

// -- 2. Lönsamhet / marginal ---------------------------------------------------

interface LineMargin {
  slug: string;
  name: string;
  category: string;
  quantity: number;
  revenue: number;
  margin: number;
}

function eachLineMargin(orders: Order[], productBySlug: Map<string, Product>): LineMargin[] {
  const lines: LineMargin[] = [];
  for (const order of orders) {
    for (const item of order.items) {
      const product = productBySlug.get(item.slug);
      if (!product) continue; // produkten är borttagen sedan dess — kan inte marginalberäknas
      const revenue = item.unitPrice * item.quantity;
      const margin = (item.unitPrice - product.costPrice) * item.quantity;
      lines.push({
        slug: item.slug,
        name: item.name,
        category: product.category,
        quantity: item.quantity,
        revenue,
        margin,
      });
    }
  }
  return lines;
}

function computeProfitability(
  ordersInRange: Order[],
  productBySlug: Map<string, Product>,
  from: Date,
  to: Date,
  granularity: Granularity
): AnalyticsResult["profitability"] {
  const lines = eachLineMargin(ordersInRange, productBySlug);

  const totalRevenue = lines.reduce((s, l) => s + l.revenue, 0);
  const totalMargin = lines.reduce((s, l) => s + l.margin, 0);
  const totalMarginPct = totalRevenue > 0 ? round((totalMargin / totalRevenue) * 100, 1) : null;

  const byCategoryMap = new Map<string, { revenue: number; margin: number }>();
  for (const l of lines) {
    const acc = byCategoryMap.get(l.category) ?? { revenue: 0, margin: 0 };
    acc.revenue += l.revenue;
    acc.margin += l.margin;
    byCategoryMap.set(l.category, acc);
  }
  const byCategory = [...byCategoryMap.entries()].map(([category, v]) => ({
    category,
    revenue: round(v.revenue),
    marginAmount: round(v.margin),
    marginPct: v.revenue > 0 ? round((v.margin / v.revenue) * 100, 1) : null,
  }));

  // Marginal% per produkt (katalogbaserat — oberoende av vald period, då
  // pris/inköpspris inte varierar över tid i datamodellen).
  const catalogMargins = [...productBySlug.values()]
    .map((p) => ({
      slug: p.slug,
      name: p.name,
      marginPct: p.price > 0 ? round(((p.price - p.costPrice) / p.price) * 100, 1) : 0,
    }))
    .sort((a, b) => b.marginPct - a.marginPct);

  const topMarginProducts = catalogMargins.slice(0, TOP_N);
  const bottomMarginProducts = [...catalogMargins].sort((a, b) => a.marginPct - b.marginPct).slice(0, TOP_N);

  // Täckningsbidrag (marginal × sålda enheter) — kräver faktisk försäljning i perioden.
  const contributionBySlug = new Map<string, { name: string; marginAmount: number; unitsSold: number }>();
  for (const l of lines) {
    const acc = contributionBySlug.get(l.slug) ?? { name: l.name, marginAmount: 0, unitsSold: 0 };
    acc.marginAmount += l.margin;
    acc.unitsSold += l.quantity;
    contributionBySlug.set(l.slug, acc);
  }
  const contributionList = [...contributionBySlug.entries()]
    .map(([slug, v]) => ({ slug, name: v.name, marginAmount: round(v.marginAmount), unitsSold: v.unitsSold }))
    .sort((a, b) => b.marginAmount - a.marginAmount);

  const topContributionProducts = contributionList.slice(0, TOP_N);
  const bottomContributionProducts = [...contributionList].sort((a, b) => a.marginAmount - b.marginAmount).slice(0, TOP_N);

  // Marginaltrend: samma buckets som försäljningsöversikten, men bara för
  // perioder med faktisk omsättning (annars blir 0%-marginal missvisande
  // för perioder utan försäljning alls).
  const buckets = enumerateBuckets(from, to, granularity);
  const trendMap = new Map<string, { revenue: number; margin: number }>();
  for (const order of ordersInRange) {
    const key = bucketKeyFor(new Date(order.createdAt), granularity);
    const acc = trendMap.get(key) ?? { revenue: 0, margin: 0 };
    for (const item of order.items) {
      const product = productBySlug.get(item.slug);
      if (!product) continue;
      acc.revenue += item.unitPrice * item.quantity;
      acc.margin += (item.unitPrice - product.costPrice) * item.quantity;
    }
    trendMap.set(key, acc);
  }
  const marginTrend = buckets
    .filter((key) => trendMap.has(key) && trendMap.get(key)!.revenue > 0)
    .map((key) => {
      const v = trendMap.get(key)!;
      return { key, label: bucketLabel(key, granularity), marginPct: round((v.margin / v.revenue) * 100, 1) };
    });

  return {
    totalMarginPct,
    totalMarginAmount: round(totalMargin),
    byCategory,
    topMarginProducts,
    bottomMarginProducts,
    topContributionProducts,
    bottomContributionProducts,
    marginTrend,
  };
}

// -- 3. Produktprestanda --------------------------------------------------------

function computeProductPerformance(
  ordersInRange: Order[],
  products: Product[],
  from: Date,
  to: Date
): AnalyticsResult["products"] {
  const days = Math.max(1, Math.round((to.getTime() - from.getTime()) / 86_400_000) + 1);

  const perProduct = new Map<string, { units: number; revenue: number }>();
  const perColorway = new Map<string, { units: number }>(); // key: slug|colorName

  for (const order of ordersInRange) {
    for (const item of order.items) {
      const p = perProduct.get(item.slug) ?? { units: 0, revenue: 0 };
      p.units += item.quantity;
      p.revenue += item.unitPrice * item.quantity;
      perProduct.set(item.slug, p);

      const ckey = `${item.slug}|${item.colorName}`;
      const c = perColorway.get(ckey) ?? { units: 0 };
      c.units += item.quantity;
      perColorway.set(ckey, c);
    }
  }

  const productList = [...perProduct.entries()]
    .map(([slug, v]) => ({
      slug,
      name: products.find((p) => p.slug === slug)?.name ?? slug,
      units: v.units,
      revenue: round(v.revenue),
    }))
    .sort((a, b) => b.units - a.units);

  const bestSellers = productList.slice(0, TOP_N);
  const worstSellers = [...productList].sort((a, b) => a.units - b.units).slice(0, TOP_N);

  const colorwaySales = [...perColorway.entries()]
    .map(([key, v]) => {
      const [slug, colorName] = key.split("|");
      const product = products.find((p) => p.slug === slug);
      const colorway = product?.colorways.find((c) => c.name === colorName);
      return {
        slug,
        productName: product?.name ?? slug,
        colorName,
        hex: colorway?.hex ?? "#999999",
        units: v.units,
      };
    })
    .sort((a, b) => b.units - a.units)
    .slice(0, 10);

  // Lageromsättning + risk-/kapitalbindningsvarningar per (produkt, färgvariant).
  const turnover: AnalyticsResult["products"]["turnover"] = [];
  const lowStockHighVelocity: AnalyticsResult["products"]["lowStockHighVelocity"] = [];
  const highStockLowVelocity: AnalyticsResult["products"]["highStockLowVelocity"] = [];

  for (const product of products) {
    for (const colorway of product.colorways) {
      const sold = perColorway.get(`${product.slug}|${colorway.name}`)?.units ?? 0;
      const velocityPerDay = sold / days;
      const daysOfStockRemaining = velocityPerDay > 0 ? round(colorway.stock / velocityPerDay, 1) : null;

      turnover.push({
        slug: product.slug,
        productName: product.name,
        colorName: colorway.name,
        currentStock: colorway.stock,
        unitsSoldInRange: sold,
        velocityPerDay: round(velocityPerDay, 2),
        daysOfStockRemaining,
      });

      if (
        colorway.stock <= LOW_STOCK_THRESHOLD &&
        daysOfStockRemaining !== null &&
        daysOfStockRemaining <= RUNOUT_RISK_DAYS
      ) {
        lowStockHighVelocity.push({
          slug: product.slug,
          productName: product.name,
          colorName: colorway.name,
          currentStock: colorway.stock,
          daysOfStockRemaining,
        });
      }
      if (colorway.stock >= HIGH_STOCK_THRESHOLD && sold === 0) {
        highStockLowVelocity.push({
          slug: product.slug,
          productName: product.name,
          colorName: colorway.name,
          currentStock: colorway.stock,
        });
      }
    }
  }

  turnover.sort((a, b) => (a.daysOfStockRemaining ?? Infinity) - (b.daysOfStockRemaining ?? Infinity));
  lowStockHighVelocity.sort((a, b) => a.daysOfStockRemaining - b.daysOfStockRemaining);
  highStockLowVelocity.sort((a, b) => b.currentStock - a.currentStock);

  return {
    bestSellers,
    worstSellers,
    colorwaySales,
    turnover: turnover.slice(0, 12),
    lowStockHighVelocity: lowStockHighVelocity.slice(0, 8),
    highStockLowVelocity: highStockLowVelocity.slice(0, 8),
  };
}

// -- 4. Kunder / målgrupper -----------------------------------------------------

const HISTOGRAM_BUCKETS: { max: number; label: string }[] = [
  { max: 199, label: "< 200 kr" },
  { max: 399, label: "200–399 kr" },
  { max: 599, label: "400–599 kr" },
  { max: 999, label: "600–999 kr" },
  { max: Infinity, label: "1000+ kr" },
];

function computeCustomers(
  allOrders: Order[],
  ordersInRange: Order[],
  _from: Date,
  _to: Date
): AnalyticsResult["customers"] {
  // Första ordertillfälle per e-post, över ALL historik (inte bara vald
  // period) — avgör om en order i perioden kom från en ny eller
  // återkommande kund.
  const firstOrderByEmail = new Map<string, number>();
  for (const order of allOrders) {
    const email = order.customer.email.toLowerCase();
    const t = new Date(order.createdAt).getTime();
    const existing = firstOrderByEmail.get(email);
    if (existing === undefined || t < existing) firstOrderByEmail.set(email, t);
  }

  let newCustomers = 0;
  let returningCustomers = 0;
  let newRevenue = 0;
  let returningRevenue = 0;
  const seenNewInRange = new Set<string>();
  const seenReturningInRange = new Set<string>();

  for (const order of ordersInRange) {
    const email = order.customer.email.toLowerCase();
    const isFirstEver = firstOrderByEmail.get(email) === new Date(order.createdAt).getTime();
    if (isFirstEver) {
      newRevenue += order.total;
      if (!seenNewInRange.has(email)) {
        seenNewInRange.add(email);
        newCustomers++;
      }
    } else {
      returningRevenue += order.total;
      if (!seenReturningInRange.has(email)) {
        seenReturningInRange.add(email);
        returningCustomers++;
      }
    }
  }

  const geoMap = new Map<string, { orders: number; revenue: number }>();
  for (const order of ordersInRange) {
    const place = order.customer.city.trim() || "Okänd ort";
    const acc = geoMap.get(place) ?? { orders: 0, revenue: 0 };
    acc.orders += 1;
    acc.revenue += order.total;
    geoMap.set(place, acc);
  }
  const geo = [...geoMap.entries()]
    .map(([place, v]) => ({ place, orders: v.orders, revenue: round(v.revenue) }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 12);

  const histogramCounts = HISTOGRAM_BUCKETS.map(() => 0);
  for (const order of ordersInRange) {
    const idx = HISTOGRAM_BUCKETS.findIndex((b) => order.total <= b.max);
    histogramCounts[idx === -1 ? histogramCounts.length - 1 : idx]++;
  }
  const orderValueHistogram = HISTOGRAM_BUCKETS.map((b, i) => ({ bucket: b.label, count: histogramCounts[i] }));

  // Köpfrekvens: klassificeras på LIVSTIDS-orderantal (alla ordrar någonsin),
  // men bara kunder med minst en order i den valda perioden räknas.
  const lifetimeOrderCountByEmail = new Map<string, number>();
  for (const order of allOrders) {
    const email = order.customer.email.toLowerCase();
    lifetimeOrderCountByEmail.set(email, (lifetimeOrderCountByEmail.get(email) ?? 0) + 1);
  }
  const customersInRange = new Set(ordersInRange.map((o) => o.customer.email.toLowerCase()));
  let oneTime = 0;
  let repeat = 0;
  for (const email of customersInRange) {
    const count = lifetimeOrderCountByEmail.get(email) ?? 0;
    if (count >= 2) repeat++;
    else oneTime++;
  }

  return {
    newVsReturning: {
      newCustomers,
      returningCustomers,
      newRevenue: round(newRevenue),
      returningRevenue: round(returningRevenue),
    },
    geo,
    orderValueHistogram,
    frequency: { oneTime, repeat },
  };
}

// -- 5. Marknadsföring / kampanjattribution -------------------------------------

function computeMarketing(
  ordersInRange: Order[],
  allOrders: Order[],
  campaigns: Campaign[]
): AnalyticsResult["marketing"] {
  const bySourceMap = new Map<string, { orders: number; revenue: number }>();
  for (const order of ordersInRange) {
    const a = attributionOf(order);
    const key = `${a.source}|${a.medium}|${a.campaign}`;
    const acc = bySourceMap.get(key) ?? { orders: 0, revenue: 0 };
    acc.orders += 1;
    acc.revenue += order.total;
    bySourceMap.set(key, acc);
  }
  const bySource = [...bySourceMap.entries()]
    .map(([key, v]) => {
      const [source, medium, campaign] = key.split("|");
      return { source, medium, campaign, orders: v.orders, revenue: round(v.revenue) };
    })
    .sort((a, b) => b.revenue - a.revenue);

  const campaignResults = campaigns.map((c) => {
    const start = parseDate(c.startDate);
    const end = parseDate(c.endDate);
    const windowDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1);
    const beforeEnd = addDays(start, -1);
    const beforeStart = addDays(beforeEnd, -(windowDays - 1));

    const duringOrders = allOrders.filter((o) => inRange(o, start, end));
    const beforeOrders = allOrders.filter((o) => inRange(o, beforeStart, beforeEnd));
    const attributedOrders = duringOrders.filter((o) => attributionOf(o).campaign === c.name);

    const attributedRevenue = round(attributedOrders.reduce((s, o) => s + o.total, 0));
    const siteWideDuringRevenue = round(duringOrders.reduce((s, o) => s + o.total, 0));
    const siteWideBeforeRevenue = round(beforeOrders.reduce((s, o) => s + o.total, 0));

    return {
      id: c.id,
      name: c.name,
      channel: c.channel,
      startDate: c.startDate,
      endDate: c.endDate,
      budget: c.budget ?? null,
      attributedOrders: attributedOrders.length,
      attributedRevenue,
      siteWideDuringRevenue,
      siteWideBeforeRevenue,
      liftPct: pctChange(siteWideDuringRevenue, siteWideBeforeRevenue),
      roi: c.budget && c.budget > 0 ? round(attributedRevenue / c.budget, 2) : null,
    };
  });

  return { bySource, campaigns: campaignResults };
}
