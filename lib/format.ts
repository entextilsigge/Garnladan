const sek = new Intl.NumberFormat("sv-SE", {
  style: "currency",
  currency: "SEK",
  maximumFractionDigits: 0,
});

export function formatPrice(amount: number): string {
  return sek.format(amount);
}

/** Fri frakt-gräns i SEK */
export const FREE_SHIPPING_THRESHOLD = 499;

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
