const sek = new Intl.NumberFormat("sv-SE", {
  style: "currency",
  currency: "SEK",
  maximumFractionDigits: 0,
});

export function formatPrice(amount: number): string {
  return sek.format(amount);
}

/** Svensk momssats för garn/stickmaterial och frakt (25%). */
export const VAT_RATE = 0.25;

/**
 * Momsbeloppet i kr som ingår i ett bruttopris (våra priser är alltid
 * inkl. moms). Krävs för att kvitton/orderbekräftelser ska visa moms som
 * ett separat radbelopp, inte bara dolt i totalsumman.
 */
export function calculateVatAmount(grossAmount: number): number {
  return Math.round(grossAmount - grossAmount / (1 + VAT_RATE));
}

/**
 * Fullständigt utskrivet köpdatum (t.ex. "8 juli 2026") — krävs för att
 * bekräftelsemejlet/-sidan ska duga som kvitto (uppdrag 14). Samma format
 * som redan användes på packsedeln (app/admin/packlista/[id]/page.tsx).
 */
export function formatOrderDate(iso: string): string {
  return new Date(iso).toLocaleDateString("sv-SE", { dateStyle: "long" });
}
