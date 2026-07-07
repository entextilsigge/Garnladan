import type { Order } from "@/lib/data/orderStore";

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

function buildOrderEmailHtml(order: Order): string {
  const rows = order.items
    .map(
      (item) =>
        `<tr><td style="padding:4px 12px 4px 0">${item.name} · ${item.colorName}</td><td style="padding:4px 0;text-align:right">${item.quantity} st</td></tr>`
    )
    .join("");

  return `
    <div style="font-family:sans-serif;color:#241C14">
      <h1 style="font-size:20px">Tack ${order.customer.firstName}, din beställning är mottagen!</h1>
      <p>Ordernummer <strong>${order.id}</strong>. Vi packar din beställning inom 24 timmar.</p>
      <table style="border-collapse:collapse;margin-top:16px">${rows}</table>
      <p style="margin-top:16px"><strong>Totalt: ${order.total} kr</strong></p>
      <p style="margin-top:24px;color:#5E4C3A;font-size:13px">Detta är ett automatiskt mejl från Garnladan.</p>
    </div>
  `;
}

export async function sendOrderConfirmationEmail(order: Order): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.log(
      `[e-post] RESEND_API_KEY saknas — hoppar över bekräftelsemejl för order ${order.id} till ${order.customer.email}. Lägg till RESEND_API_KEY i miljövariablerna för att aktivera riktiga mejl.`
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
      body: JSON.stringify({
        from,
        to: order.customer.email,
        subject: `Din beställning ${order.id} är mottagen`,
        html: buildOrderEmailHtml(order),
      }),
    });
    if (!res.ok) {
      console.error(`[e-post] Resend svarade ${res.status} för order ${order.id}`);
    }
  } catch (err) {
    console.error("[e-post] Kunde inte skicka bekräftelsemejl", err);
  }
}
