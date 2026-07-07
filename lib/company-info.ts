// Central källa för företagsuppgifter som återanvänds på flera ställen
// (ångerrättssidan, packsedeln, m.fl.) — ändra bara här.
//
// OBS: returadressen nedan är en platshållare och behöver bekräftas innan
// skarp lansering.

export const COMPANY_INFO = {
  name: "Garnladan AB",
  orgNumber: "559123-4567",
  email: "hej@garnladan.se",
  phone: "0521-123 45",
  // Retur-/avsändaradress för paket som skickas tillbaka till oss.
  returAddress: {
    street: "Lövvägen 2",
    postalCode: "468 30",
    city: "Vargön",
  },
} as const;

export function formatReturAddress(): string {
  const { street, postalCode, city } = COMPANY_INFO.returAddress;
  return `${COMPANY_INFO.name}, ${street}, ${postalCode} ${city}`;
}
