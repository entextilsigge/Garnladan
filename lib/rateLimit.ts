import type { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Enkel in-memory rate limiting (fast räknare per nyckel, i minnet).
//
// Räcker för att stoppa naivt missbruk (skript som spammar ett formulär),
// men delas INTE mellan flera serverless-instanser eller överlever inte en
// cold start på Vercel — för det krävs en delad backend (Redis/Upstash),
// vilket är ett nytt konto vi medvetet väntar med. Se README.md
// "Rate limiting & admin-lockout" för detaljer.
// ---------------------------------------------------------------------------

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

/** true = tillåten, false = över gränsen (be anroparen svara 429). */
export function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (bucket.count >= limit) return false;
  bucket.count += 1;
  return true;
}

/** Bästa möjliga klient-IP från de headers Vercel/de flesta proxies sätter. */
export function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}
