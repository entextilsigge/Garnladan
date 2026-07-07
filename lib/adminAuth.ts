import crypto from "crypto";
import type { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Adminautentisering.
//
// Lösenordet läses från miljövariabeln ADMIN_PASSWORD (sätt den i
// .env.local lokalt, och under Project Settings → Environment Variables i
// Vercel för produktion — se .env.example). Saknas den faller vi tillbaka på
// ett dev-lösenord och varnar i konsolen; det duger för att testa lokalt men
// ska ALDRIG lämnas så i en riktig driftsättning.
//
// Sessionen är en stateless, signerad cookie — värdet är en hash av
// lösenordet + en salt, så ingen serverside sessionslagring behövs. Det
// räcker för en enkel enanvändar-adminpanel utan känslig delad data; för
// flera adminkonton med olika roller/behörigheter, byt ut mot NextAuth eller
// Clerk.
// ---------------------------------------------------------------------------

const FALLBACK_DEV_PASSWORD = "garn";
const SALT = "garnladan-admin-salt-v1";

export const ADMIN_COOKIE_NAME = "garnladan_admin";
export const ADMIN_COOKIE_MAX_AGE = 60 * 60 * 8; // 8 timmar

function getConfiguredPassword(): string {
  const fromEnv = process.env.ADMIN_PASSWORD?.trim();
  if (fromEnv) return fromEnv;
  if (process.env.NODE_ENV !== "production") {
    console.warn(
      '[admin] ADMIN_PASSWORD är inte satt — använder dev-lösenordet "garn". Sätt ADMIN_PASSWORD i .env.local (och i Vercel) innan produktion.'
    );
  }
  return FALLBACK_DEV_PASSWORD;
}

export function isCorrectPassword(candidate: string): boolean {
  return candidate === getConfiguredPassword();
}

export function computeSessionToken(): string {
  return crypto.createHash("sha256").update(`${getConfiguredPassword()}:${SALT}`).digest("hex");
}

export function isValidSessionToken(token: string | undefined | null): boolean {
  if (!token) return false;
  return token === computeSessionToken();
}

/** Kollar adminsessionen på ett inkommande Route Handler-request. */
export function isAuthorizedRequest(request: NextRequest): boolean {
  return isValidSessionToken(request.cookies.get(ADMIN_COOKIE_NAME)?.value);
}
