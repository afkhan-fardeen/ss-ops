import { isStore2Configured } from "@/lib/store2/client";

export type ShopifyStoreId = 1 | 2;

type ShopifyEnv = {
  domain: string;
  token: string;
  version: string;
};

function getEnv(storeId: ShopifyStoreId = 1): ShopifyEnv {
  if (storeId === 2) {
    const domain = process.env.SHOPIFY_STORE2_DOMAIN;
    const token = process.env.SHOPIFY_STORE2_ACCESS_TOKEN;
    const version = process.env.SHOPIFY_STORE2_API_VERSION ?? "2024-01";
    if (!domain || !token) {
      throw new Error("Missing SHOPIFY_STORE2_DOMAIN or SHOPIFY_STORE2_ACCESS_TOKEN");
    }
    return { domain, token, version };
  }

  const domain = process.env.SHOPIFY_STORE_DOMAIN;
  const token = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
  const version = process.env.SHOPIFY_API_VERSION ?? "2024-01";
  if (!domain || !token) {
    throw new Error("Missing SHOPIFY_STORE_DOMAIN or SHOPIFY_ADMIN_ACCESS_TOKEN");
  }
  return { domain, token, version };
}

async function shopifyRestFetch<T>(path: string, storeId: ShopifyStoreId = 1): Promise<T> {
  const { domain, token, version } = getEnv(storeId);
  const url = `https://${domain}/admin/api/${version}${path}`;
  const res = await fetch(url, {
    headers: {
      "X-Shopify-Access-Token": token,
      Accept: "application/json",
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Shopify REST ${res.status}: ${text.slice(0, 500)}`);
  }
  return (await res.json()) as T;
}

async function shopifyGraphql<T>(
  query: string,
  variables: Record<string, unknown>,
  storeId: ShopifyStoreId = 1,
): Promise<T> {
  const { domain, token, version } = getEnv(storeId);
  const url = `https://${domain}/admin/api/${version}/graphql.json`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "X-Shopify-Access-Token": token,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
  });
  const json = (await res.json()) as { data?: T; errors?: Array<{ message: string }> };
  if (!res.ok) {
    throw new Error(`Shopify GraphQL HTTP ${res.status}: ${JSON.stringify(json).slice(0, 500)}`);
  }
  if (json.errors?.length) {
    throw new Error(`Shopify GraphQL: ${json.errors.map((e) => e.message).join("; ")}`);
  }
  if (!json.data) {
    throw new Error("Shopify GraphQL: empty data");
  }
  return json.data;
}

export type ShopifyLocation = {
  id: number;
  name: string;
  active: boolean;
};

export type ShopifyVariantInventory = {
  variantId: string;
  barcode: string;
  displayName: string;
  inventoryItemId: string;
  onHand: number;
  available: number;
  committed: number;
};

type LocationsResponse = {
  locations: Array<{ id: number; name: string; active: boolean; legacy?: boolean }>;
};

const cachedLocationByStore = new Map<ShopifyStoreId, ShopifyLocation>();

/** Resolve default Shopify location for a store (env override for store 1 only). */
export async function getDefaultShopifyLocation(
  storeId: ShopifyStoreId = 1,
): Promise<ShopifyLocation> {
  const cached = cachedLocationByStore.get(storeId);
  if (cached) return cached;

  if (storeId === 2 && !isStore2Configured()) {
    throw new Error("Store 2 is not configured");
  }

  const envId = storeId === 1 ? process.env.SHOPIFY_LOCATION_ID?.trim() : undefined;
  const { locations } = await shopifyRestFetch<LocationsResponse>("/locations.json", storeId);

  if (envId) {
    const numeric = Number.parseInt(envId, 10);
    const hit = locations.find((l) => String(l.id) === envId || l.id === numeric);
    if (hit) {
      const loc = { id: hit.id, name: hit.name, active: hit.active };
      cachedLocationByStore.set(storeId, loc);
      return loc;
    }
  }

  const active = locations.filter((l) => l.active);
  const nonLegacy = active.find((l) => !l.legacy);
  const pick = nonLegacy ?? active[0];
  if (!pick) {
    throw new Error(`No active Shopify location found for store ${storeId}`);
  }
  const loc = { id: pick.id, name: pick.name, active: pick.active };
  cachedLocationByStore.set(storeId, loc);
  return loc;
}

function locationGid(numericId: number): string {
  return `gid://shopify/Location/${numericId}`;
}

function quantityMap(
  quantities: Array<{ name: string; quantity: number }> | undefined,
): { onHand: number; available: number; committed: number } {
  let onHand = 0;
  let available = 0;
  let committed = 0;
  for (const q of quantities ?? []) {
    if (q.name === "on_hand") onHand = q.quantity;
    else if (q.name === "available") available = q.quantity;
    else if (q.name === "committed") committed = q.quantity;
  }
  return { onHand, available, committed };
}

const VARIANT_BY_BARCODE_QUERY = `
query VariantInventoryByBarcode($query: String!, $locationId: ID!) {
  productVariants(first: 10, query: $query) {
    nodes {
      id
      barcode
      displayName
      inventoryItem {
        id
        inventoryLevel(locationId: $locationId) {
          quantities(names: ["on_hand", "available", "committed"]) {
            name
            quantity
          }
        }
      }
    }
  }
}
`;

type VariantQueryData = {
  productVariants: {
    nodes: Array<{
      id: string;
      barcode: string | null;
      displayName: string;
      inventoryItem: {
        id: string;
        inventoryLevel: {
          quantities: Array<{ name: string; quantity: number }>;
        } | null;
      } | null;
    }>;
  };
};

function normalizeBarcode(barcode: string): string {
  return barcode.trim();
}

/** Read-only: find variant(s) by exact barcode and inventory buckets at location. */
export async function fetchShopifyVariantsByBarcode(
  barcode: string,
  locationId: number,
  storeId: ShopifyStoreId = 1,
): Promise<ShopifyVariantInventory[]> {
  const bc = normalizeBarcode(barcode);
  if (!bc) return [];

  const data = await shopifyGraphql<VariantQueryData>(
    VARIANT_BY_BARCODE_QUERY,
    {
      query: `barcode:${bc}`,
      locationId: locationGid(locationId),
    },
    storeId,
  );

  const out: ShopifyVariantInventory[] = [];
  for (const node of data.productVariants.nodes) {
    const nodeBc = normalizeBarcode(node.barcode ?? "");
    if (nodeBc !== bc) continue;
    const item = node.inventoryItem;
    if (!item) continue;
    const q = item.inventoryLevel
      ? quantityMap(item.inventoryLevel.quantities)
      : { onHand: 0, available: 0, committed: 0 };
    out.push({
      variantId: node.id,
      barcode: bc,
      displayName: node.displayName,
      inventoryItemId: item.id,
      ...q,
    });
  }
  return out;
}

const CONCURRENCY = 12;

/** Batch read by barcode with limited concurrency. Read-only. */
export async function fetchShopifyInventoryByBarcodes(
  barcodes: string[],
  locationId: number,
  storeId: ShopifyStoreId = 1,
): Promise<Map<string, ShopifyVariantInventory[]>> {
  const unique = [...new Set(barcodes.map(normalizeBarcode).filter(Boolean))];
  const out = new Map<string, ShopifyVariantInventory[]>();

  let i = 0;
  async function worker() {
    while (i < unique.length) {
      const bc = unique[i++]!;
      try {
        const variants = await fetchShopifyVariantsByBarcode(bc, locationId, storeId);
        out.set(bc, variants);
      } catch (e) {
        console.warn(
          `[shopify-inventory] store ${storeId} barcode ${bc}:`,
          e instanceof Error ? e.message : e,
        );
        out.set(bc, []);
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, unique.length) }, () => worker()));
  return out;
}

const ALL_VARIANTS_QUERY = `
query AllVariantsInventory($locationId: ID!, $cursor: String) {
  productVariants(first: 250, after: $cursor) {
    pageInfo {
      hasNextPage
      endCursor
    }
    nodes {
      id
      barcode
      displayName
      inventoryItem {
        id
        inventoryLevel(locationId: $locationId) {
          quantities(names: ["on_hand", "available", "committed"]) {
            name
            quantity
          }
        }
      }
    }
  }
}
`;

type AllVariantsQueryData = {
  productVariants: {
    pageInfo: { hasNextPage: boolean; endCursor: string | null };
    nodes: Array<{
      id: string;
      barcode: string | null;
      displayName: string;
      inventoryItem: {
        id: string;
        inventoryLevel: {
          quantities: Array<{ name: string; quantity: number }>;
        } | null;
      } | null;
    }>;
  };
};

function nodeToVariant(
  node: AllVariantsQueryData["productVariants"]["nodes"][number],
): ShopifyVariantInventory | null {
  const bc = normalizeBarcode(node.barcode ?? "");
  if (!bc) return null;
  const item = node.inventoryItem;
  if (!item) return null;
  const q = item.inventoryLevel
    ? quantityMap(item.inventoryLevel.quantities)
    : { onHand: 0, available: 0, committed: 0 };
  return {
    variantId: node.id,
    barcode: bc,
    displayName: node.displayName,
    inventoryItemId: item.id,
    ...q,
  };
}

/** Paginate all Shopify variants at a location — O(variant pages) not O(barcodes). */
export async function fetchAllShopifyInventoryAtLocation(
  locationId: number,
  storeId: ShopifyStoreId = 1,
): Promise<Map<string, ShopifyVariantInventory[]>> {
  const out = new Map<string, ShopifyVariantInventory[]>();
  let cursor: string | null = null;
  let hasNext = true;

  while (hasNext) {
    const data: AllVariantsQueryData = await shopifyGraphql(
      ALL_VARIANTS_QUERY,
      {
        locationId: locationGid(locationId),
        cursor,
      },
      storeId,
    );

    for (const node of data.productVariants.nodes) {
      const variant = nodeToVariant(node);
      if (!variant) continue;
      const list = out.get(variant.barcode) ?? [];
      list.push(variant);
      out.set(variant.barcode, list);
    }

    hasNext = data.productVariants.pageInfo.hasNextPage;
    cursor = data.productVariants.pageInfo.endCursor;
  }

  return out;
}
