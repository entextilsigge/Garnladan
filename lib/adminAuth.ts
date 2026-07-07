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

// ---------------------------------------------------------------------------
// Enkel inloggningsspärr — admin-auth är fortfarande bara ett delat
// lösenord utan kontosystem, så utan detta kan någon skriptat prova
// lösenord i all oändlighet. In-memory (samma begränsning som
// lib/rateLimit.ts: delas inte mellan serverless-instanser, nollställs vid
// cold start) — räcker för att stoppa naiv brute force lokalt/på en
// enskild instans.
// ---------------------------------------------------------------------------

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MS = 5 * 60 * 1000; // 5 minuter

interface LoginAttempts {
  failures: number;
  lockedUntil: number;
}

const loginAttemptsByIp = new Map<string, LoginAttempts>();

/** Sekunder kvar av spärren, eller 0 om inloggning inte är spärrad just nu. */
export function loginLockoutSecondsRemaining(ip: string): number {
  const entry = loginAttemptsByIp.get(ip);
  if (!entry || entry.lockedUntil <= Date.now()) return 0;
  return Math.ceil((entry.lockedUntil - Date.now()) / 1000);
}

export function recordFailedLogin(ip: string): void {
  const entry = loginAttemptsByIp.get(ip) ?? { failures: 0, lockedUntil: 0 };
  entry.failures += 1;
  if (entry.failures >= MAX_FAILED_ATTEMPTS) {
    entry.lockedUntil = Date.now() + LOCKOUT_MS;
    entry.failures = 0;
  }
  loginAttemptsByIp.set(ip, entry);
}

export function clearLoginAttempts(ip: string): void {
  loginAttemptsByIp.delete(ip);
}

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
