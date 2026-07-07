// Klientsäker hjälpare för marknadsföringsattribution. Ingen "fs" här — kan
// importeras från både "use client"-komponenter (UtmCapture, CheckoutFlow)
// och delas mellan dem.
//
// UTM-cookien är en icke-nödvändig spårningscookie (se /integritetspolicy)
// och får därför INTE sättas förrän besökaren samtyckt till icke-nödvändiga
// cookies (lib/consent.ts). Innan samtycke finns mellanlagras eventuella
// utm_*-parametrar bara i sessionStorage — rensas när fliken stängs, skickas
// aldrig till servern, och skrivs över till en riktig cookie först om/när
// samtycke ges (se applyPendingAttributionIfConsented, anropad från
// UtmCapture när samtycket ändras).

import { hasMarketingConsent } from "@/lib/consent";

export interface Attribution {
  source: string;
  medium: string;
  campaign: string;
}

export const DEFAULT_ATTRIBUTION: Attribution = {
  source: "direkt",
  medium: "okänt",
  campaign: "okänd",
};

export const UTM_COOKIE_NAME = "garnladan_utm";
const PENDING_STORAGE_KEY = "garnladan_utm_pending";
const COOKIE_MAX_AGE_DAYS = 30;

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function setCookie(name: string, value: string, days: number) {
  if (typeof document === "undefined") return;
  const maxAge = days * 24 * 60 * 60;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

function deleteCookie(name: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax`;
}

function readPending(): Attribution | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(PENDING_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Attribution) : null;
  } catch {
    return null;
  }
}

function writePending(value: Attribution) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(PENDING_STORAGE_KEY, JSON.stringify(value));
}

function clearPending() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(PENDING_STORAGE_KEY);
}

/**
 * Läser utm_source/utm_medium/utm_campaign från en URL:s query-sträng. Om
 * minst en av dem finns: sätts UTM-cookien direkt om marknadsföringssamtycke
 * redan finns, annars mellanlagras värdet i sessionStorage tills samtycke ges.
 */
export function captureUtmFromSearch(search: string): void {
  const params = new URLSearchParams(search);
  const source = params.get("utm_source");
  const medium = params.get("utm_medium");
  const campaign = params.get("utm_campaign");

  if (!source && !medium && !campaign) return;

  const value: Attribution = {
    source: source || DEFAULT_ATTRIBUTION.source,
    medium: medium || DEFAULT_ATTRIBUTION.medium,
    campaign: campaign || DEFAULT_ATTRIBUTION.campaign,
  };

  if (hasMarketingConsent()) {
    setCookie(UTM_COOKIE_NAME, JSON.stringify(value), COOKIE_MAX_AGE_DAYS);
  } else {
    writePending(value);
  }
}

/** Skriver en väntande attribution till cookien om samtycke nu finns. */
export function applyPendingAttributionIfConsented(): void {
  if (!hasMarketingConsent()) return;
  const pending = readPending();
  if (pending) {
    setCookie(UTM_COOKIE_NAME, JSON.stringify(pending), COOKIE_MAX_AGE_DAYS);
    clearPending();
  }
}

/** Städar bort ev. väntande/redan satt attribution om besökaren tackat nej. */
export function clearAttributionIfConsentDeclined(): void {
  if (hasMarketingConsent()) return;
  clearPending();
  deleteCookie(UTM_COOKIE_NAME);
}

/** Läser sparad attribution för aktuell besökare, med defaults om inget sparats. */
export function readStoredAttribution(): Attribution {
  const raw = getCookie(UTM_COOKIE_NAME);
  if (!raw) return { ...DEFAULT_ATTRIBUTION };
  try {
    const parsed = JSON.parse(raw);
    return {
      source: typeof parsed.source === "string" ? parsed.source : DEFAULT_ATTRIBUTION.source,
      medium: typeof parsed.medium === "string" ? parsed.medium : DEFAULT_ATTRIBUTION.medium,
      campaign: typeof parsed.campaign === "string" ? parsed.campaign : DEFAULT_ATTRIBUTION.campaign,
    };
  } catch {
    return { ...DEFAULT_ATTRIBUTION };
  }
}
