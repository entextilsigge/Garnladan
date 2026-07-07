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

  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_COOKIE_NAME, computeSessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ADMIN_COOKIE_MAX_AGE,
  });
  return response;
}
