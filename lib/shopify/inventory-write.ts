import type { ShopifyStoreId } from "./inventory-read";

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

function locationGid(numericId: number): string {
  return `gid://shopify/Location/${numericId}`;
}

const SET_ON_HAND_MUTATION = `
mutation SetOnHand($input: InventorySetQuantitiesInput!, $idempotencyKey: String!) {
  inventorySetQuantities(input: $input) @idempotent(key: $idempotencyKey) {
    inventoryAdjustmentGroup {
      createdAt
    }
    userErrors {
      field
      message
    }
  }
}
`;

type SetOnHandData = {
  inventorySetQuantities: {
    inventoryAdjustmentGroup: { createdAt: string } | null;
    userErrors: Array<{ field: string[] | null; message: string }>;
  };
};

/** Set Shopify on_hand at a location. Requires write_inventory scope. */
export async function setShopifyOnHand(
  inventoryItemId: string,
  locationId: number,
  quantity: number,
  /** Expected current on_hand for compare-and-swap; pass null to skip the check. */
  changeFromQuantity: number | null,
  idempotencyKey: string,
  storeId: ShopifyStoreId = 1,
): Promise<void> {
  const qty = Math.max(0, Math.floor(quantity));
  const data = await shopifyGraphql<SetOnHandData>(
    SET_ON_HAND_MUTATION,
    {
      input: {
        name: "on_hand",
        reason: "correction",
        quantities: [
          {
            inventoryItemId,
            locationId: locationGid(locationId),
            quantity: qty,
            changeFromQuantity:
              changeFromQuantity === null ? null : Math.max(0, Math.floor(changeFromQuantity)),
          },
        ],
      },
      idempotencyKey,
    },
    storeId,
  );

  const errors = data.inventorySetQuantities.userErrors;
  if (errors.length > 0) {
    throw new Error(errors.map((e) => e.message).join("; "));
  }
}
