export function formatOrderDate(orderDate: string | null | undefined): string {
  if (!orderDate) return "—";
  return new Date(orderDate).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
