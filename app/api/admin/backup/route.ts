import fs from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import JSZip from "jszip";
import { isAuthorizedRequest } from "@/lib/adminAuth";

// ---------------------------------------------------------------------------
// Manuell databackup — zippar alla JSON-datafiler i data/ till en
// nedladdningsbar fil. Helt manuell (admin klickar och sparar filen själv,
// t.ex. i Google Drive) — INGEN schemalagd/molnbaserad backup här, det får
// vänta tills nya konton/tokens är okej att lägga till.
//
// Läser katalogen dynamiskt (inte en hårdkodad filnamnslista) så att den
// alltid innehåller ALLA datastore-filer, inklusive framtida tillskott.
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  if (!isAuthorizedRequest(request)) {
    return NextResponse.json({ error: "Ej inloggad." }, { status: 401 });
  }

  const dataDir = path.join(process.cwd(), "data");
  const files = fs.existsSync(dataDir)
    ? fs.readdirSync(dataDir).filter((name) => name.endsWith(".json"))
    : [];

  const zip = new JSZip();
  for (const file of files) {
    const content = fs.readFileSync(path.join(dataDir, file));
    zip.file(file, content);
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
