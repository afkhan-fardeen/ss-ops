/**
 * Verify Zoho Books connectivity and Barcode Sync prerequisites.
 *
 * Run: npx tsx scripts/zoho-check-permissions.ts
 *
 * Checks:
 * - Env vars present
 * - Token refresh
 * - ZohoBooks.settings.READ (list + get item — Items API uses settings scope)
 * - ZOHO_UBEX_BARCODE_CF_ID validated via settings/fields?entity=item
 * - ZohoBooks.settings.UPDATE (noop PUT to /item/{id}/customfields — same as production)
 */
import { readFileSync } from "node:fs";
import { isZohoConfigured, zohoFetch } from "../lib/zoho/client";
import {
  classifyZohoResponse,
  parseZohoErrorResponse,
} from "../lib/zoho/classify-error";
import {
  getUbexBarcodeFieldId,
  readUbexBarcodeFromItem,
  resolveFieldDefinitionId,
} from "../lib/zoho/barcode-field";
import {
  fetchItemCustomFieldDefinitions,
  findItemFieldById,
  findItemFieldByLabel,
} from "../lib/zoho/fetch-item-custom-field-definitions";

function loadEnv(path: string) {
  try {
    const text = readFileSync(path, "utf8");
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!(key in process.env)) process.env[key] = value;
    }
  } catch {
    /* no env file */
  }
}

loadEnv(".env.local");
loadEnv(".env");

function mask(s: string | undefined, show = 4): string {
  if (!s) return "(missing)";
  if (s.length <= show * 2) return "***";
  return `${s.slice(0, show)}…${s.slice(-show)}`;
}

function ok(label: string, detail?: string) {
  console.log(`✓ ${label}${detail ? ` — ${detail}` : ""}`);
}

function fail(label: string, detail: string) {
  console.log(`✗ ${label}`);
  console.log(`  ${detail}`);
}

async function main() {
  console.log("Zoho Books — permission & config check\n");

  const vars = [
    "ZOHO_CLIENT_ID",
    "ZOHO_CLIENT_SECRET",
    "ZOHO_REFRESH_TOKEN",
    "ZOHO_ORG_ID",
    "ZOHO_UBEX_BARCODE_CF_ID",
  ] as const;

  console.log("Environment:");
  for (const v of vars) {
    const val = process.env[v]?.trim();
    const required = v !== "ZOHO_UBEX_BARCODE_CF_ID";
    const status = val ? "set" : required ? "MISSING" : "not set (run zoho-discover-barcode-field.ts)";
    console.log(`  ${v}: ${val ? mask(val) : status}`);
  }
  console.log("");

  if (!isZohoConfigured()) {
    fail("Zoho credentials", "Set ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, ZOHO_REFRESH_TOKEN, ZOHO_ORG_ID");
    process.exit(1);
  }
  ok("Zoho credentials", "all four core vars present");

  const orgId = process.env.ZOHO_ORG_ID!.trim();
  const fieldId = getUbexBarcodeFieldId();

  // --- settings.READ: field definitions ---
  const defsResult = await fetchItemCustomFieldDefinitions();
  if (!defsResult.ok) {
    fail("settings/fields (item custom fields)", `${defsResult.error.category}: ${defsResult.error.userMessage}`);
    console.log(`  Detail: ${defsResult.error.detail}`);
    process.exit(1);
  }
  ok("settings/fields", `${defsResult.fields.length} item custom field definition(s)`);

  if (!fieldId) {
    console.log("\nItem custom fields (add ZOHO_UBEX_BARCODE_CF_ID to .env):");
    for (const f of defsResult.fields) {
      const id = resolveFieldDefinitionId(f);
      console.log(`  label: ${f.label ?? "—"}`);
      console.log(`  customfield_id: ${id ?? "—"}`);
      if (f.api_name) console.log(`  api_name: ${f.api_name} (Inventory-style — not used for Books writes)`);
      console.log("");
    }
    const ubex = findItemFieldByLabel(defsResult.fields, "Ubex Barcode");
    const ubexId = ubex ? resolveFieldDefinitionId(ubex) : null;
    if (ubexId) {
      console.log(`Suggested: ZOHO_UBEX_BARCODE_CF_ID=${ubexId}`);
    }
  } else {
    const hit = findItemFieldById(defsResult.fields, fieldId);
    if (hit) {
      ok("Ubex Barcode field", `customfield_id=${fieldId} (label: ${hit.label ?? "—"})`);
    } else {
      fail(
        "Ubex Barcode field",
        `ZOHO_UBEX_BARCODE_CF_ID=${fieldId} not found in settings/fields — wrong ID?`,
      );
    }
  }

  // --- settings.READ: list items ---
  let listRes: Response;
  try {
    listRes = await zohoFetch(
      `/books/v3/items?organization_id=${encodeURIComponent(orgId)}&page=1&per_page=3`,
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    fail("Token / network", msg);
    if (msg.includes("too many requests")) {
      console.log("  Wait 5–10 minutes, then run this script once (not both Zoho scripts back-to-back).");
    }
    process.exit(1);
  }

  const listParsed = await parseZohoErrorResponse(listRes);
  if (!listParsed.ok) {
    const err = classifyZohoResponse(listParsed);
    fail("ZohoBooks.settings.READ (list items)", `${err.category}: ${err.userMessage}`);
    console.log(`  Detail: ${err.detail}`);
    process.exit(1);
  }
  ok("ZohoBooks.settings.READ", `HTTP ${listParsed.status}`);

  const listJson = listParsed.body as {
    items?: Array<{
      item_id?: string;
      name?: string;
      sku?: string;
      custom_fields?: Array<{ customfield_id?: string; field_id?: string; value?: string | null }>;
    }>;
  };
  const items = listJson.items ?? [];
  console.log(`  Sample list returned ${items.length} item(s)`);

  if (items.length === 0) {
    console.log("\nNo items in Zoho — cannot test GET/UPDATE on a real item.");
    process.exit(0);
  }

  const sample = items[0]!;
  const itemId = sample.item_id!;

  // --- settings.READ: get one item ---
  let getRes: Response;
  try {
    getRes = await zohoFetch(
      `/books/v3/items/${itemId}?organization_id=${encodeURIComponent(orgId)}`,
    );
  } catch (e) {
    fail("GET item", e instanceof Error ? e.message : String(e));
    process.exit(1);
  }

  const getParsed = await parseZohoErrorResponse(getRes);
  if (!getParsed.ok) {
    const err = classifyZohoResponse(getParsed);
    fail("ZohoBooks.settings.READ (get item)", `${err.category}: ${err.userMessage}`);
    process.exit(1);
  }
  ok("GET item", `${sample.name ?? itemId}`);

  const itemBody = getParsed.body as {
    item?: {
      custom_fields?: Array<{
        customfield_id?: string;
        field_id?: string;
        label?: string;
        value?: string | null;
      }>;
    };
  };
  const customFields = itemBody.item?.custom_fields ?? [];

  if (fieldId) {
    const onItem = readUbexBarcodeFromItem(customFields, fieldId);
    console.log(
      `  Ubex Barcode on sample item: ${onItem ? `"${onItem}"` : "(empty or omitted — both mean unfilled)"}`,
    );
  }

  // --- settings.UPDATE: PUT customfields endpoint (safe noop) ---
  if (!fieldId) {
    console.log("\nSkipping UPDATE test — set ZOHO_UBEX_BARCODE_CF_ID first.");
    process.exit(0);
  }

  const currentValue = readUbexBarcodeFromItem(customFields, fieldId);
  let putRes: Response;
  try {
    putRes = await zohoFetch(
      `/books/v3/item/${encodeURIComponent(itemId)}/customfields?organization_id=${encodeURIComponent(orgId)}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          custom_fields: [{ customfield_id: fieldId, value: currentValue || "" }],
        }),
      },
    );
  } catch (e) {
    fail("PUT item/customfields", e instanceof Error ? e.message : String(e));
    process.exit(1);
  }

  const putParsed = await parseZohoErrorResponse(putRes);
  if (!putParsed.ok) {
    const err = classifyZohoResponse(putParsed);
    fail("ZohoBooks.settings.UPDATE", `${err.category}: ${err.userMessage}`);
    console.log(`  Detail: ${err.detail}`);
    process.exit(1);
  }
  ok(
    "ZohoBooks.settings.UPDATE",
    `HTTP ${putParsed.status} (wrote same value back via /item/{id}/customfields — no change)`,
  );

  console.log("\nAll checks passed — Barcode Sync should work with this connection.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
