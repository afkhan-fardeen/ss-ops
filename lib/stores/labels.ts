/** User-facing store names. Internal ids remain 1 / 2. */
export const STORE_LABELS = {
  1: "International Store",
  2: "Seissense GCC Store",
} as const;

export type StoreId = keyof typeof STORE_LABELS;

export function storeLabel(storeId: 1 | 2 | "1" | "2" | number): string {
  const id = Number(storeId) === 2 ? 2 : 1;
  return STORE_LABELS[id];
}
