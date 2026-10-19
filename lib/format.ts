const priceFormatters = new Map<string, Intl.NumberFormat>();

export function formatPrice(amount: number, currency = "USD"): string {
  let formatter = priceFormatters.get(currency);
  if (!formatter) {
    formatter = new Intl.NumberFormat("en-US", { style: "currency", currency });
    priceFormatters.set(currency, formatter);
  }
  return formatter.format(amount);
}
