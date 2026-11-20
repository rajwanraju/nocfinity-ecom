/** Money is stored as integer cents everywhere; format only at the edge. */
export function formatMoney(cents: number, currency = "USD"): string {
  const wholeDollars = cents % 100 === 0;

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: wholeDollars ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

/** Rounded percentage saved between the list price and the current price. */
export function discountPercent(price: number, currentPrice: number): number {
  if (price <= 0 || currentPrice >= price) {
    return 0;
  }

  return Math.round((1 - currentPrice / price) * 100);
}
