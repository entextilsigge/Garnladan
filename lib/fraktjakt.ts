import { XMLParser } from "fast-xml-parser";
import type { Order } from "@/lib/data/orderStore";
import { getProductBySlug } from "@/lib/data/productStore";

// ---------------------------------------------------------------------------
// Fraktjakt-integration (uppdrag 15) — bokar fraktsedlar (Shipment API) och
// hämtar spårningsnummer/etikett-PDF för ordrar med "PostNord — ombud"
// eller "PostNord — hemleverans".
//
// Så länge FRAKTJAKT_CONSIGNOR_ID/FRAKTJAKT_CONSIGNOR_KEY saknas i miljön
// är isFraktjaktConfigured() false och adminvyn visar knapparna som
// inaktiva ("Fraktjakt ej konfigurerat") istället för att anropen kastar
// okontrollerade fel — samma mönster som lib/stripe.ts/lib/supabase.ts.
//
// Konfiguration i Fraktjakt-kontot (Sigge, engångsjobb):
//   1. Logga in på https://api.fraktjakt.se/account/login (eller registrera
//      enligt manualen om kontot inte redan finns).
//   2. Under "Installation"-fliken för integrationen hittar du Consignor ID
//      och Consignor Key — lägg dem som FRAKTJAKT_CONSIGNOR_ID (heltal) och
//      FRAKTJAKT_CONSIGNOR_KEY (sträng) i Vercels miljövariabler/.env.local.
//   3. Testläge/skarpt läge styrs INTE av en egen miljövariabel här, utan
//      av VILKEN integration (vilket Consignor-par) som används — Fraktjakt
//      rekommenderar att registrera två separata integrationer (en
//      testintegration i Testläge, en skarp) och byta miljövariabler när
//      vi går skarpt, se "Testläge" i Fraktjakt API-manualen.
//   4. Ett Standardpaket (mått) MÅSTE vara konfigurerat i integrationens
//      inställningar i Fraktjakt — vi skickar bara vikt (uträknad från
//      produkternas grams-fält), inte längd/bredd/höjd, så Fraktjakt
//      använder kontots förvalda paketmall för måtten. Utan ett konfigurerat
//      Standardpaket misslyckas fraktsökningen (enligt Fraktjakts egen
//      dokumentation).
//   5. shipping_product_id för "PostNord — ombud" respektive "PostNord —
//      hemleverans" är kontospecifika — hämtas genom att öppna
//      https://api.fraktjakt.se/shipping_products/xml_list?consignor_id=DITT_ID&consignor_key=DIN_NYCKEL
//      i webbläsaren och leta upp rätt <shipping-product><id> för PostNords
//      tjänster (shipper-id 1 = PostNord). Fylls sedan i under
//      Inställningar → Fraktjakt i admin.
// ---------------------------------------------------------------------------

const FRAKTJAKT_API_BASE = "https://api.fraktjakt.se";
const FRAKTJAKT_API_VERSION = "4.10.0";

// Rimligt standardvärde när en orderrad refererar en produkt som inte
// längre finns kvar i katalogen (t.ex. borttagen efter att ordern lades) —
// ett vanligt garnnystan väger typiskt 50–100 g. Dokumenterat antagande,
// se uppdrag 15.
const FALLBACK_ITEM_WEIGHT_GRAMS = 100;
const MIN_PARCEL_WEIGHT_KG = 0.05;

export function isFraktjaktConfigured(): boolean {
  return Boolean(
    process.env.FRAKTJAKT_CONSIGNOR_ID?.trim() && process.env.FRAKTJAKT_CONSIGNOR_KEY?.trim()
  );
}

function getConsignor(): { id: string; key: string } {
  const id = process.env.FRAKTJAKT_CONSIGNOR_ID?.trim();
  const key = process.env.FRAKTJAKT_CONSIGNOR_KEY?.trim();
  if (!id || !key) {
    throw new Error(
      "FRAKTJAKT_CONSIGNOR_ID/FRAKTJAKT_CONSIGNOR_KEY saknas — kan inte anropa Fraktjakt."
    );
  }
  return { id, key };
}

/** Kastas med Fraktjakts EGET felmeddelande — visas rakt av i admin, gissas aldrig. */
export class FraktjaktError extends Error {}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

const xmlParser = new XMLParser({ ignoreAttributes: true });

function asArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

/** Alla Fraktjakt-API-svar delar samma <status>/<code>/<error_message>-form. */
function assertOk(result: Record<string, unknown>): void {
  const status = result.status as string | undefined;
  const serverStatus = result.server_status as string | undefined;
  if (status === "error") {
    throw new FraktjaktError(
      (result.error_message as string) || "Okänt fel från Fraktjakt (inget felmeddelande angivet)."
    );
  }
  if (serverStatus) {
    // T.ex. "No contact with DHL" — ett fraktbolags server är nere.
    // Blockerar inte anropet (Fraktjakt har redan hanterat det), men bra
    // att känna till om resultatet ser konstigt ut.
    console.warn(`[fraktjakt] server_status: ${serverStatus}`);
  }
}

async function postXml(path: string, xml: string): Promise<Record<string, any>> {
  const res = await fetch(`${FRAKTJAKT_API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `xml=${encodeURIComponent(xml)}`,
  });
  const text = await res.text();
  if (res.status === 429) {
    throw new FraktjaktError("För många anrop till Fraktjakt just nu (rate limit) — försök igen om en liten stund.");
  }
  if (!res.ok) {
    throw new FraktjaktError(`Fraktjakt svarade ${res.status}: ${text.slice(0, 300)}`);
  }
  let parsed: Record<string, any>;
  try {
    parsed = xmlParser.parse(text);
  } catch {
    throw new FraktjaktError(`Kunde inte tolka Fraktjakts svar: ${text.slice(0, 300)}`);
  }
  const result = (parsed.result ?? parsed) as Record<string, unknown>;
  assertOk(result);
  return result;
}

async function getXml(path: string, params: Record<string, string>): Promise<Record<string, any>> {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${FRAKTJAKT_API_BASE}${path}?${query}`);
  const text = await res.text();
  if (res.status === 429) {
    throw new FraktjaktError("För många anrop till Fraktjakt just nu (rate limit) — försök igen om en liten stund.");
  }
  if (!res.ok) {
    throw new FraktjaktError(`Fraktjakt svarade ${res.status}: ${text.slice(0, 300)}`);
  }
  let parsed: Record<string, any>;
  try {
    parsed = xmlParser.parse(text);
  } catch {
    throw new FraktjaktError(`Kunde inte tolka Fraktjakts svar: ${text.slice(0, 300)}`);
  }
  const result = (parsed.result ?? parsed) as Record<string, unknown>;
  assertOk(result);
  return result;
}

/**
 * Beräknar sändningens totalvikt i kg utifrån produkternas `grams`-fält
 * (vikt per nystan/förpackning) — riktig data, inte en gissning, för de
 * produkter som fortfarande finns kvar i katalogen. Faller tillbaka på
 * FALLBACK_ITEM_WEIGHT_GRAMS per rad om en produkt tagits bort sedan
 * ordern lades. Mått (längd/bredd/höjd) skickas INTE med — Fraktjakt
 * använder istället kontots förvalda paketmall (se filens header-kommentar).
 */
async function computeOrderWeightKg(order: Order): Promise<number> {
  let totalGrams = 0;
  for (const item of order.items) {
    const product = await getProductBySlug(item.slug);
    const gramsPerUnit = product?.grams ?? FALLBACK_ITEM_WEIGHT_GRAMS;
    totalGrams += gramsPerUnit * item.quantity;
  }
  return Math.max(totalGrams / 1000, MIN_PARCEL_WEIGHT_KG);
}

export interface FraktjaktShipmentResult {
  shipmentId: number;
  accessCode: string;
  accessLink: string;
  /** Riktigt spårningsnummer hos transportören — bara satt om sändningen faktiskt köpts/bokats. */
  trackingNumber: string | null;
  trackingLink: string;
  /** Sant om Fraktjakt bokat/köpt sändningen direkt (tracking_number kom med). */
  booked: boolean;
}

/**
 * Skapar en sändning i Fraktjakt (Shipment API, "Butiksstyrd Frakt") med
 * en redan känd frakttjänst (`shipping_product_id`) — kunden har redan
 * valt "ombud" eller "hem" i kassan, så ingen fraktsökning ska göras.
 *
 * Beroende på hur integrationen är konfigurerad i Fraktjakt (automatiskt
 * köp på/av) kan sändningen antingen bokas/betalas direkt i det här
 * anropet (tracking_number finns med, booked=true), eller bara förberedas
 * och kräva att en admin loggar in på Fraktjakt själv för att slutföra
 * köpet (booked=false — då pekar accessLink dit).
 */
export async function createFraktjaktShipment(
  order: Order,
  shippingProductId: number
): Promise<FraktjaktShipmentResult> {
  const { id, key } = getConsignor();
  const weightKg = await computeOrderWeightKg(order);
  const totalQuantity = order.items.reduce((sum, i) => sum + i.quantity, 0);

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<CreateShipment>
  <consignor>
    <id>${escapeXml(id)}</id>
    <key>${escapeXml(key)}</key>
    <currency>SEK</currency>
    <language>sv</language>
    <encoding>UTF-8</encoding>
    <system_name>Garnladan</system_name>
    <api_version>${FRAKTJAKT_API_VERSION}</api_version>
  </consignor>
  <shipping_product_id>${shippingProductId}</shipping_product_id>
  <reference>${escapeXml(order.id)}</reference>
  <address_to>
    <street_address_1>${escapeXml(order.customer.address)}</street_address_1>
    <postal_code>${escapeXml(order.customer.postalCode)}</postal_code>
    <city_name>${escapeXml(order.customer.city)}</city_name>
    <country_code>SE</country_code>
    <language>sv</language>
  </address_to>
  <recipient>
    <name_to>${escapeXml(`${order.customer.firstName} ${order.customer.lastName}`)}</name_to>
    <email_to>${escapeXml(order.customer.email)}</email_to>
  </recipient>
  <commodities>
    <commodity>
      <name>Garn och stickmaterial</name>
      <quantity>${totalQuantity}</quantity>
      <weight>${weightKg.toFixed(3)}</weight>
      <description>Garn och stickmaterial, order ${escapeXml(order.id)}</description>
    </commodity>
  </commodities>
  <parcels>
    <parcel>
      <weight>${weightKg.toFixed(3)}</weight>
    </parcel>
  </parcels>
</CreateShipment>`;

  const result = await postXml("/shipments/shipment_xml", xml);

  const trackingNumber = (result.tracking_number as string | undefined) ?? null;
  return {
    shipmentId: Number(result.shipment_id),
    accessCode: String(result.access_code),
    accessLink: String(result.access_link ?? ""),
    trackingNumber,
    trackingLink: String(result.tracking_link ?? ""),
    booked: Boolean(trackingNumber),
  };
}

/**
 * Kollar om en tidigare skapad sändning hunnit bokas klart (dvs. fått ett
 * riktigt spårningsnummer hos transportören) — används när
 * createFraktjaktShipment() returnerade booked=false, så admin kan
 * uppdatera ordern efter att själv ha slutfört köpet i Fraktjakt.
 */
export async function fetchFraktjaktTrackingNumber(shipmentId: number): Promise<string | null> {
  const { id, key } = getConsignor();
  const result = await getXml("/trace/xml_trace", {
    consignor_id: id,
    consignor_key: key,
    shipment_id: String(shipmentId),
    locale: "sv",
  });
  return (result.tracking_number as string | undefined) ?? null;
}

/**
 * Bygger länken till en sändning i Fraktjakts eget gränssnitt utifrån
 * sändnings-id + access_code — används för att återskapa access_link utan
 * att behöva spara den separat i databasen (bara shipmentId/accessCode
 * sparas på ordern, se saveFraktjaktShipment i lib/data/orderStore.ts).
 * Exakt samma format som Fraktjakt själva returnerar i access_link.
 */
export function buildFraktjaktAccessLink(shipmentId: number, accessCode: string): string {
  return `https://www.fraktjakt.se/shipments/show/${shipmentId}?access_code=${encodeURIComponent(accessCode)}`;
}

export interface FraktjaktLabel {
  typeId: number;
  typeName: string;
  formatName: string;
  /** Base64-avkodad PDF-innehåll. */
  pdf: Buffer;
}

/**
 * Hämtar fraktetiketten (och ev. andra frakthandlingar) för en köpt/bokad
 * sändning. Finns bara tillgängligt efter att sändningen faktiskt betalats
 * i Fraktjakt (annars tom lista) — se FraktjaktShipmentResult.booked.
 */
export async function fetchFraktjaktLabel(shipmentId: number): Promise<FraktjaktLabel | null> {
  const { id, key } = getConsignor();
  const result = await getXml("/shipping_documents/xml_get", {
    consignor_id: id,
    consignor_key: key,
    shipment_id: String(shipmentId),
    locale: "sv",
  });

  const docs = asArray(result.shipping_documents?.shipping_document);
  if (docs.length === 0) return null;

  // Föredra den faktiska fraktetiketten (type_id 3) — annars fraktsedeln
  // (type_id 4) — annars första tillgängliga dokumentet.
  const label =
    docs.find((d) => Number(d.type_id) === 3) ??
    docs.find((d) => Number(d.type_id) === 4) ??
    docs[0];

  return {
    typeId: Number(label.type_id),
    typeName: String(label.type_name),
    formatName: String(label.format_name ?? ""),
    pdf: Buffer.from(String(label.file), "base64"),
  };
}
