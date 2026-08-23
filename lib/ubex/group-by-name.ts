import type { UbexInventoryItem } from "./inventory";

export type UbexProductGroup = {
  name: string;
  totalStock: number;
  variantCount: number;
  variants: UbexInventoryItem[];
};

export function groupUbexItemsByName(items: UbexInventoryItem[]): UbexProductGroup[] {
  const map = new Map<string, UbexInventoryItem[]>();
  for (const item of items) {
    const key = item.name.trim();
    const list = map.get(key) ?? [];
    list.push(item);
    map.set(key, list);
  }
  return Array.from(map.entries()).map(([name, variants]) => ({
    name,
    totalStock: variants.reduce((sum, v) => sum + v.stock, 0),
    variantCount: variants.length,
    variants,
  }));
}
