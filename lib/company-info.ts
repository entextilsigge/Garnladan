// Central källa för företagsuppgifter som återanvänds på flera ställen
// (ångerrättssidan, packsedeln, villkor, integritetspolicy, footer, m.fl.)
// — ändra bara här.
//
// "Garnladan" är butiksnamnet/varumärket kunden känner igen (används på
// t.ex. returadresser och paketetiketter). "E.N. Textil AB" är den
// juridiska personen bakom butiken — org.nr och copyright ska knytas till
// den, inte varumärkesnamnet.

export const COMPANY_INFO = {
  name: "Garnladan",
  legalName: "E.N. Textil AB",
  orgNumber: "556747-1031",
  email: "kontoret@entextil.se",
  phone: "070-367 33 19",
  // Retur-/avsändaradress för paket som skickas tillbaka till oss.
  // OBS: denna adress är fortfarande en platshållare och behöver bekräftas
  // innan skarp lansering — org.nr/e-post/telefon ovan är däremot riktiga
  // (uppdrag 12).
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
