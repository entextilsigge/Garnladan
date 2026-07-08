import { NextRequest, NextResponse } from "next/server";
import JSZip from "jszip";
import { isAuthorizedRequest } from "@/lib/adminAuth";
import { getSupabaseServiceClient, throwIfSupabaseError } from "@/lib/supabase";

// ---------------------------------------------------------------------------
// Manuell databackup — hämtar en full dump av varje tabell från Supabase
// (uppdrag 13; ersätter den tidigare versionen som zippade lokala
// data/*.json-filer, vilket slutade vara meningsfullt efter migreringen
// bort från dem) och zippar till en nedladdningsbar fil, en .json-fil per
// datamängd — samma filnamn och användarupplevelse som innan. Helt manuell
// (admin klickar och sparar filen själv, t.ex. i Google Drive) — INGEN
// schemalagd/molnbaserad backup här, det får vänta tills nya konton/tokens
// är okej att lägga till.
// ---------------------------------------------------------------------------

const TABLES: { table: string; filename: string; select: string }[] = [
  { table: "products", filename: "products.json", select: "*, product_variants(*)" },
  { table: "orders", filename: "orders.json", select: "*, order_items(*), order_refunds(*)" },
  { table: "checkout_sessions", filename: "checkoutSessions.json", select: "*" },
  { table: "campaigns", filename: "campaigns.json", select: "*" },
  { table: "newsletter_subscribers", filename: "newsletter.json", select: "*" },
  { table: "settings", filename: "settings.json", select: "*" },
  { table: "webhook_events", filename: "webhookEvents.json", select: "*" },
  { table: "error_logs", filename: "errors.json", select: "*" },
];

export async function GET(request: NextRequest) {
  if (!isAuthorizedRequest(request)) {
    return NextResponse.json({ error: "Ej inloggad." }, { status: 401 });
  }

  const client = getSupabaseServiceClient();
  const zip = new JSZip();

  for (const { table, filename, select } of TABLES) {
    const { data, error } = await client.from(table).select(select);
    throwIfSupabaseError(error);
    zip.file(filename, JSON.stringify(data ?? [], null, 2));
  }

  const buffer = await zip.generateAsync({ type: "nodebuffer" });
  const date = new Date().toISOString().slice(0, 10);

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="garnladan-backup-${date}.zip"`,
    },
  });
}
