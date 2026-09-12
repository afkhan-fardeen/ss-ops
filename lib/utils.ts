export function formatMoneyGbp(amount: string): string {
  const n = Number.parseFloat(amount);
  if (Number.isNaN(n)) return "£0.00";
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(n);
}

export function formatMoneyAed(amount: string): string {
  const n = Number.parseFloat(amount);
  if (Number.isNaN(n)) return "AED 0.00";
  return new Intl.NumberFormat("en-AE", {
    style: "currency",
    currency: "AED",
  }).format(n);
}
