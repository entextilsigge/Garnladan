import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_COOKIE_MAX_AGE,
  ADMIN_COOKIE_NAME,
  clearLoginAttempts,
  computeSessionToken,
  isCorrectPassword,
  loginLockoutSecondsRemaining,
  recordFailedLogin,
} from "@/lib/adminAuth";
import { getClientIp } from "@/lib/rateLimit";

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);

  const lockedSeconds = loginLockoutSecondsRemaining(ip);
  if (lockedSeconds > 0) {
    return NextResponse.json(
      { error: `För många felaktiga försök. Försök igen om ${lockedSeconds} sekunder.` },
      { status: 429 }
    );
  }

  const body = await request.json().catch(() => null);
  const password = typeof body?.password === "string" ? body.password : "";

  if (!isCorrectPassword(password)) {
    recordFailedLogin(ip);
    return NextResponse.json({ error: "Fel lösenord." }, { status: 401 });
  }

  clearLoginAttempts(ip);

  const token = computeSessionToken();
  if (!token) {
    // Kan bara hända om ADMIN_PASSWORD försvann mellan isCorrectPassword-
    // kollen ovan och den här raden (t.ex. miljövariabeln togs bort mitt i
    // en request) — extremt osannolikt, men hellre ett tydligt fel än en
    // trasig session-cookie.
    return NextResponse.json({ error: "Serverfel vid inloggning. Försök igen." }, { status: 500 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ADMIN_COOKIE_MAX_AGE,
  });
  return response;
}
