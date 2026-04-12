export function formatCurrency(amount: number, currency: string): string {
  const normalizedCurrency =
    typeof currency === "string" && currency.trim().length > 0
      ? currency.trim().toUpperCase()
      : "AED";

  try {
    return new Intl.NumberFormat("en-AE", {
      style: "currency",
      currency: normalizedCurrency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount / 100);
  } catch {
    return `${normalizedCurrency} ${(amount / 100).toFixed(2)}`;
  }
}
