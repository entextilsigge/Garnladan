import { NextRequest, NextResponse } from "next/server";
import { addSubscriber } from "@/lib/data/newsletterStore";
import { EMAIL_RE } from "@/lib/validation";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

const MAX_EMAIL_LENGTH = 254;
// 5 signup-försök per minut och IP — gott om marginal för en riktig kund
// som råkar skriva fel, men stoppar naiva skript som spammar formuläret.
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 60_000;

export async function POST(request: NextRequest) {
  if (!checkRateLimit(`newsletter:${getClientIp(request)}`, RATE_LIMIT, RATE_WINDOW_MS)) {
    return NextResponse.json(
      { error: "För många förfrågningar. Försök igen om en stund." },
      { status: 429 }
    );
  }

  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim() : "";

  if (!email || email.length > MAX_EMAIL_LENGTH || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Ogiltig e-postadress." }, { status: 400 });
  }

  const { added } = await addSubscriber(email);
  return NextResponse.json({ ok: true, added });
}
