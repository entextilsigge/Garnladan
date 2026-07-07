// ---------------------------------------------------------------------------
// Server-side indata-validering för publika endpoints. Klient-validering
// (required/pattern-attribut i formulären) är bara en UX-genväg — den går
// alltid att kringgå (curl, ändrad JS, m.m.), så den här är den som
// faktiskt skyddar datan. Används av app/api/checkout/session/route.ts.
// ---------------------------------------------------------------------------

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SWEDISH_POSTAL_CODE_RE = /^\d{3}\s?\d{2}$/;

const MAX_NAME_LENGTH = 80;
const MAX_ADDRESS_LENGTH = 200;
const MAX_CITY_LENGTH = 100;
const MAX_EMAIL_LENGTH = 254;

function isNonEmptyString(value: unknown, maxLength: number): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= maxLength;
}

/** Returnerar ett felmeddelande om leveransuppgifterna är ogiltiga, annars null. */
export function validateShippingDetails(shipping: unknown): string | null {
  if (!shipping || typeof shipping !== "object") return "Leveransuppgifter saknas.";
  const s = shipping as Record<string, unknown>;

  if (!isNonEmptyString(s.firstName, MAX_NAME_LENGTH)) return "Förnamn krävs.";
  if (!isNonEmptyString(s.lastName, MAX_NAME_LENGTH)) return "Efternamn krävs.";
  if (
    typeof s.email !== "string" ||
    s.email.length > MAX_EMAIL_LENGTH ||
    !EMAIL_RE.test(s.email.trim())
  ) {
    return "Ogiltig e-postadress.";
  }
  if (!isNonEmptyString(s.address, MAX_ADDRESS_LENGTH)) return "Adress krävs.";
  if (typeof s.postalCode !== "string" || !SWEDISH_POSTAL_CODE_RE.test(s.postalCode.trim())) {
    return "Ogiltigt postnummer (ange fem siffror, t.ex. 793 31).";
  }
  if (!isNonEmptyString(s.city, MAX_CITY_LENGTH)) return "Ort krävs.";

  return null;
}
