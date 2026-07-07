import { NextResponse } from "next/server";
import { addSubscriber } from "@/lib/data/newsletterStore";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim() : "";

  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Ogiltig e-postadress." }, { status: 400 });
  }

  const { added } = addSubscriber(email);
  return NextResponse.json({ ok: true, added });
}
