import type { Order } from "@/lib/data/orderStore";
import { calculateVatAmount } from "@/lib/format";
import { SITE_URL } from "@/lib/seo";

// ---------------------------------------------------------------------------
// Bekräftelsemejl via Resend (https://resend.com).
//
// Anropar Resends REST-API direkt med fetch — inget extra npm-paket behövs.
// Så länge RESEND_API_KEY saknas i miljön är sendOrderConfirmationEmail en
// no-op som bara loggar till konsolen, så bygget och checkout-flödet
// fungerar felfritt utan nyckel. Lägg till RESEND_API_KEY (och valfritt
// RESEND_FROM_EMAIL) i .env.local / Vercels miljövariabler för att faktiskt
// skicka mejl — se .env.example.
// ---------------------------------------------------------------------------

const RESEND_API_URL = "https://api.resend.com/emails";

// OBS: detta URL-format kunde inte slutgiltigt bekräftas mot PostNords
// live-spårningstjänst i den här sessionen (deras publika spårningssida är
// en JS-app som inte gick att inspektera direkt) — verifiera med ett
// riktigt spårningsnummer innan skarp lansering.
function buildTrackingUrl(trackingNumber: string): string {
  return `https://tracking.postnord.com/se/?id=${encodeURIComponent(trackingNumber)}`;
}

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.log(
      `[e-post] RESEND_API_KEY saknas — hoppar över mejl "${subject}" till ${to}. Lägg till RESEND_API_KEY i miljövariablerna för att aktivera riktiga mejl.`
    );
    return;
  }

  const from = process.env.RESEND_FROM_EMAIL || "Garnladan <bestallning@garnladan.se>";

  try {
    const res = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to, subject, html }),
    });
    if (!res.ok) {
      console.error(`[e-post] Resend svarade ${res.status} för mejl "${subject}" till ${to}`);
    }
  } catch (err) {
    console.error(`[e-post] Kunde inte skicka mejl "${subject}"`, err);
  }
}

function buildOrderEmailHtml(order: Order): string {
  const rows = order.items
    .map(
      (item) =>
        `<tr><td style="padding:4px 12px 4px 0">${item.name} · ${item.colorName}</td><td style="padding:4px 0;text-align:right">${item.quantity} st</td></tr>`
    )
    .join("");

  // Priserna inkluderar redan moms — momsbeloppet visas som en egen rad
  // (inte bara som text) för att bekräftelsen ska duga som kvitto.
  const vatAmount = calculateVatAmount(order.total);

  return `
    <div style="font-family:sans-serif;color:#241C14">
      <h1 style="font-size:20px">Tack ${order.customer.firstName}, din beställning är mottagen!</h1>
      <p>Ordernummer <strong>${order.id}</strong>. Vi packar din beställning inom 24 timmar.</p>
      <table style="border-collapse:collapse;margin-top:16px">${rows}</table>
      <table style="border-collapse:collapse;margin-top:16px;width:100%;max-width:320px">
        <tr><td style="padding:2px 12px 2px 0;color:#5E4C3A">Delsumma</td><td style="padding:2px 0;text-align:right">${order.subtotal} kr</td></tr>
        <tr><td style="padding:2px 12px 2px 0;color:#5E4C3A">Frakt (${order.shippingLabel})</td><td style="padding:2px 0;text-align:right">${order.shippingCost} kr</td></tr>
        <tr><td style="padding:2px 12px 2px 0;color:#5E4C3A">Varav moms (25%)</td><td style="padding:2px 0;text-align:right">${vatAmount} kr</td></tr>
        <tr><td style="padding:8px 12px 0 0;font-weight:bold">Totalt (inkl. moms)</td><td style="padding:8px 0 0;text-align:right;font-weight:bold">${order.total} kr</td></tr>
      </table>
      <p style="margin-top:20px;font-size:13px">
        Ångrat dig? Du har 14 dagars ångerrätt —
        <a href="${SITE_URL}/villkor/angerratt" style="color:#A64B33">läs mer och hämta ångerblanketten</a>.
      </p>
      <p style="margin-top:24px;color:#5E4C3A;font-size:13px">Detta är ett automatiskt mejl från Garnladan.</p>
    </div>
  `;
}

export async function sendOrderConfirmationEmail(order: Order): Promise<void> {
  await sendEmail(
    order.customer.email,
    `Din beställning ${order.id} är mottagen`,
    buildOrderEmailHtml(order)
  );
}

function buildShippingEmailHtml(order: Order, trackingNumber: string): string {
  const trackingUrl = buildTrackingUrl(trackingNumber);

  return `
    <div style="font-family:sans-serif;color:#241C14">
      <h1 style="font-size:20px">Din beställning ${order.id} är på väg!</h1>
      <p>Hej ${order.customer.firstName}, din beställning har lämnat ladan och är skickad med PostNord.</p>
      <p style="margin-top:16px">
        Spårningsnummer: <strong>${trackingNumber}</strong><br />
        <a href="${trackingUrl}" style="color:#A64B33">Följ paketet hos PostNord</a>
      </p>
      <p style="margin-top:20px;font-size:13px">
        Ångrat dig? Du har 14 dagars ångerrätt —
        <a href="${SITE_URL}/villkor/angerratt" style="color:#A64B33">läs mer och hämta ångerblanketten</a>.
      </p>
      <p style="margin-top:24px;color:#5E4C3A;font-size:13px">Detta är ett automatiskt mejl från Garnladan.</p>
    </div>
  `;
}

/**
 * Skickas automatiskt när admin sätter en order till "skickad" med ett
 * spårningsnummer (se app/api/admin/orders/[id]/route.ts). Samma
 * no-op-utan-nyckel-beteende som orderbekräftelsen ovan.
 */
export async function sendShippingNotificationEmail(
  order: Order,
  trackingNumber: string
): Promise<void> {
  await sendEmail(
    order.customer.email,
    `Din beställning ${order.id} är skickad`,
    buildShippingEmailHtml(order, trackingNumber)
  );
}

function buildRefundEmailHtml(order: Order, amount: number): string {
  const isFullRefund = order.paymentStatus === "refunded";
  return `
    <div style="font-family:sans-serif;color:#241C14">
      <h1 style="font-size:20px">Din återbetalning är genomförd</h1>
      <p>Hej ${order.customer.firstName}, vi har återbetalat ${amount} kr för beställning <strong>${order.id}</strong>.</p>
      <p style="margin-top:12px">
        ${isFullRefund
          ? "Hela ordersumman är nu återbetald."
          : "Detta är en delåterbetalning av ordern."}
        Pengarna sätts in via samma betalmetod som användes vid köpet, vanligtvis inom några bankdagar.
      </p>
      <p style="margin-top:24px;color:#5E4C3A;font-size:13px">Detta är ett automatiskt mejl från Garnladan.</p>
    </div>
  `;
}

/**
 * Skickas automatiskt när en riktig Stripe-återbetalning lyckats (se
 * app/api/admin/orders/[id]/refund/route.ts) — ALDRIG i förväg, bara efter
 * att stripe.refunds.create() faktiskt gått igenom.
 */
export async function sendRefundConfirmationEmail(order: Order, amount: number): Promise<void> {
  await sendEmail(
    order.customer.email,
    `Din återbetalning för ${order.id} är genomförd`,
    buildRefundEmailHtml(order, amount)
  );
}
