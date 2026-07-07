"use client";

// ---------------------------------------------------------------------------
// Cookie-samtycke. Sparas i localStorage (inte en cookie i sig — vi vill
// inte sätta ännu en cookie bara för att komma ihåg samtyckesvalet, och
// localStorage räcker för det här syftet).
//
// "necessary" (varukorg, kassans sessionshantering) kräver inget samtycke
// och sätts alltid — se motiveringen i /integritetspolicy. Allt annat
// (idag: attribution/UTM-cookien, se lib/attribution.ts) kräver att
// `marketing` är true här innan det får sättas.
// ---------------------------------------------------------------------------

export interface ConsentState {
  marketing: boolean;
  decidedAt: string;
}

const CONSENT_KEY = "garnladan-cookie-consent";

/** Dispatchas på `window` varje gång samtycket sparas/ändras. */
export const CONSENT_EVENT = "garnladan-consent-changed";

export function readConsent(): ConsentState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CONSENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.marketing !== "boolean") return null;
    return parsed as ConsentState;
  } catch {
    return null;
  }
}

/** true bara om besökaren aktivt tackat ja till icke-nödvändiga cookies. */
export function hasMarketingConsent(): boolean {
  return readConsent()?.marketing === true;
}

export function saveConsent(marketing: boolean): void {
  if (typeof window === "undefined") return;
  const state: ConsentState = { marketing, decidedAt: new Date().toISOString() };
  window.localStorage.setItem(CONSENT_KEY, JSON.stringify(state));
  window.dispatchEvent(new Event(CONSENT_EVENT));
}
