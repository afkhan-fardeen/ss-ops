/** Formats a raw amount in whatever currency the order/order-line actually carries. */
export function formatMoney(amount: string, currency: string): string {
  const n = Number.parseFloat(amount);
  if (Number.isNaN(n)) return `${currency} 0.00`;
  try {
    return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(n);
  } catch {
    return `${currency} ${n.toFixed(2)}`;
  }
}

export function formatMoneyAed(amount: string): string {
  return formatMoney(amount, "AED");
}
