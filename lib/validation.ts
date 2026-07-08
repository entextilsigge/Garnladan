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

// ---------------------------------------------------------------------------
// Produktvalidering — används av BÅDE POST (skapa) och PUT (uppdatera) under
// app/api/admin/products, så att ett formulärfel (t.ex. tom colorways-array
// eller ett pris som råkat bli en sträng) inte kan spara en trasig produkt
// via redigeringsvägen bara för att den vägen tidigare saknade samma kontroll
// som skapandet redan hade. Längdgränserna är generösa (admin är en betrodd
// användare, inte en publik yta) men förhindrar att ett extremt långt
// namn/beskrivning från ett klipp-och-klistra-misstag förstör layouten på
// produktsidan.
// ---------------------------------------------------------------------------

const MAX_PRODUCT_NAME_LENGTH = 150;
const MAX_TAGLINE_LENGTH = 200;
const MAX_DESCRIPTION_LENGTH = 3000;
const MAX_SHORT_FIELD_LENGTH = 300;

export function validateProductInput(body: unknown): string | null {
  if (!body || typeof body !== "object") return "Ogiltig produktdata.";
  const input = body as Record<string, unknown>;

  if (!isNonEmptyString(input.name, MAX_PRODUCT_NAME_LENGTH)) {
    return `Namn krävs (max ${MAX_PRODUCT_NAME_LENGTH} tecken).`;
  }
  if (typeof input.price !== "number" || !Number.isFinite(input.price) || input.price <= 0) {
    return "Ogiltigt pris.";
  }
  if (
    typeof input.costPrice !== "number" ||
    !Number.isFinite(input.costPrice) ||
    input.costPrice < 0
  ) {
    return "Ogiltigt inköpspris.";
  }
  if (input.tagline !== undefined && input.tagline !== "" && !isNonEmptyString(input.tagline, MAX_TAGLINE_LENGTH)) {
    return `Ingressen är för lång (max ${MAX_TAGLINE_LENGTH} tecken).`;
  }
  if (
    input.description !== undefined &&
    input.description !== "" &&
    !isNonEmptyString(input.description, MAX_DESCRIPTION_LENGTH)
  ) {
    return `Beskrivningen är för lång (max ${MAX_DESCRIPTION_LENGTH} tecken).`;
  }
  for (const field of ["composition", "needleSize", "gauge", "care"] as const) {
    const value = input[field];
    if (value !== undefined && value !== "" && !isNonEmptyString(value, MAX_SHORT_FIELD_LENGTH)) {
      return `Fältet är för långt (max ${MAX_SHORT_FIELD_LENGTH} tecken).`;
    }
  }
  if (!Array.isArray(input.colorways) || input.colorways.length === 0) {
    return "Minst en färgvariant krävs.";
  }
  for (const c of input.colorways) {
    if (!c || typeof c !== "object") {
      return "Varje färgvariant behöver namn, hexkod, färggrupp och ett giltigt (icke-negativt) lagerantal.";
    }
    const colorway = c as Record<string, unknown>;
    if (
      !colorway.name ||
      !colorway.hex ||
      !colorway.group ||
      typeof colorway.stock !== "number" ||
      colorway.stock < 0
    ) {
      return "Varje färgvariant behöver namn, hexkod, färggrupp och ett giltigt (icke-negativt) lagerantal.";
    }
  }
  return null;
}
