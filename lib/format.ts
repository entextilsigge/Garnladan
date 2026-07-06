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
