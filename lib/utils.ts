export function formatMoneyGbp(amount: string): string {
  const n = Number.parseFloat(amount);
  if (Number.isNaN(n)) return "£0.00";
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(n);
}
