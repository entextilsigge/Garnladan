// Klientsäker hjälpare för marknadsföringsattribution. Ingen "fs" här — kan
// importeras från både "use client"-komponenter (UtmCapture, CheckoutFlow)
// och delas mellan dem.

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

/**
 * Läser utm_source/utm_medium/utm_campaign från en URL:s query-sträng. Om
 * minst en av dem finns, sparas de i en cookie (senaste träff vinner) så de
 * följer besökaren fram till checkout, även över flera sidvisningar.
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
  setCookie(UTM_COOKIE_NAME, JSON.stringify(value), COOKIE_MAX_AGE_DAYS);
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
