/**
 * One-shot lookup: finds the numeric customfield_id of a Zoho Books item custom
 * field by its visible label, so it can be set as ZOHO_UBEX_BARCODE_CF_ID.
 *
 * Uses GET /books/v3/settings/fields?entity=item — the authoritative source for
 * field definitions. Do not discover via a sample item's custom_fields: empty
 * fields are omitted from item payloads, and Books writes require customfield_id
 * (not api_name — that convention is Zoho Inventory).
 *
 * Run with:
 *   npx tsx scripts/zoho-discover-barcode-field.ts ["Field Label"]
 *
 * Defaults to searching for a field labeled "Ubex Barcode" if no argument
 * is given. Reads env from .env.local / .env (same pattern as
 * scripts/backfill-orders-cache.ts).
 *
 * Requires ZOHO_CLIENT_ID / ZOHO_CLIENT_SECRET / ZOHO_REFRESH_TOKEN /
 * ZOHO_ORG_ID already set, with a token that has at least
 * ZohoBooks.settings.READ scope. See zoho-bc.md, Section 7.
 */
import { readFileSync } from "node:fs";

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
    /* no env file — real env vars may already be set */
  }
}

loadEnv(".env.local");
loadEnv(".env");

const ZOHO_BASE_URL = (process.env.ZOHO_BASE_URL ?? "https://www.zohoapis.com").replace(/\/$/, "");
const ZOHO_ACCOUNTS_URL = (process.env.ZOHO_ACCOUNTS_URL ?? "https://accounts.zoho.com").replace(
  /\/$/,
  "",
);

const CLIENT_ID = process.env.ZOHO_CLIENT_ID?.trim();
const CLIENT_SECRET = process.env.ZOHO_CLIENT_SECRET?.trim();
const REFRESH_TOKEN = process.env.ZOHO_REFRESH_TOKEN?.trim();
const ORG_ID = process.env.ZOHO_ORG_ID?.trim();

const targetLabel = (process.argv[2] ?? "Ubex Barcode").trim();

type ZohoFieldDefinition = {
  customfield_id?: string;
  field_id?: string;
  label?: string;
  api_name?: string;
  data_type?: string;
  is_active?: boolean;
};

function resolveFieldId(field: ZohoFieldDefinition): string | null {
  const id = field.customfield_id ?? field.field_id;
  return id?.trim() || null;
}

function booksHeaders(accessToken: string): Record<string, string> {
  return {
    Authorization: `Zoho-oauthtoken ${accessToken}`,
    Accept: "application/json",
    "X-com-zoho-books-organizationid": ORG_ID!,
  };
}

async function getAccessToken(): Promise<string> {
  if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN) {
    throw new Error(
      "Missing ZOHO_CLIENT_ID / ZOHO_CLIENT_SECRET / ZOHO_REFRESH_TOKEN — check .env.local / .env.",
    );
  }

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    refresh_token: REFRESH_TOKEN,
  });

  const res = await fetch(`${ZOHO_ACCOUNTS_URL}/oauth/v2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  const json = (await res.json()) as {
    access_token?: string;
    error?: string;
    error_description?: string;
  };

  if (!res.ok || !json.access_token) {
    const detail = json.error_description ?? json.error ?? String(res.status);
    throw new Error(
      `Token refresh failed (${detail}). ` +
        `If this says "invalid_grant" or similar, the refresh token has been ` +
        `revoked or expired — re-generate via Zoho's OAuth flow.`,
    );
  }

  return json.access_token;
}

async function main() {
  if (!ORG_ID) {
    throw new Error("Missing ZOHO_ORG_ID — check .env.local / .env.");
  }

  console.log(`Looking for item custom field labeled "${targetLabel}"...\n`);
  console.log(`Using GET /books/v3/settings/fields?entity=item (Books field definitions)\n`);

  const accessToken = await getAccessToken();

  async function loadFieldDefinitions(): Promise<ZohoFieldDefinition[]> {
    const fieldsRes = await fetch(
      `${ZOHO_BASE_URL}/books/v3/settings/fields?organization_id=${encodeURIComponent(ORG_ID!)}&entity=item`,
      { headers: booksHeaders(accessToken) },
    );
    const fieldsJson = (await fieldsRes.json()) as {
      code?: number;
      message?: string;
      fields?: ZohoFieldDefinition[];
    };

    if (fieldsRes.ok && fieldsJson.code === 0 && fieldsJson.fields) {
      return fieldsJson.fields;
    }

    const msg = fieldsJson.message ?? "";
    const tryCustomFields =
      fieldsRes.status === 400 &&
      msg.toLowerCase().includes("permission") &&
      msg.toLowerCase().includes("item");

    if (!tryCustomFields) {
      console.error(`Zoho rejected the settings/fields request.`);
      console.error(`HTTP status: ${fieldsRes.status}`);
      console.error(`Zoho message: ${msg || "(none)"}`);
      console.error(
        `\nIf this mentions permission/scope, add ZohoBooks.settings.READ and re-authorize — see zoho-bc.md, Section 7.`,
      );
      process.exit(1);
    }

    console.log(`settings/fields denied for Item entity — trying settings/customfields...\n`);

    const cfRes = await fetch(
      `${ZOHO_BASE_URL}/books/v3/settings/customfields?organization_id=${encodeURIComponent(ORG_ID!)}&entity=item`,
      { headers: booksHeaders(accessToken) },
    );
    const cfJson = (await cfRes.json()) as {
      code?: number;
      message?: string;
      customfields?: { item?: ZohoFieldDefinition[] };
    };

    if (!cfRes.ok || cfJson.code !== 0) {
      console.error(`Zoho rejected settings/customfields as well.`);
      console.error(`HTTP status: ${cfRes.status}`);
      console.error(`Zoho message: ${cfJson.message ?? "(none)"}`);
      process.exit(1);
    }

    return cfJson.customfields?.item ?? [];
  }

  const fields = await loadFieldDefinitions();

  if (fields.length === 0) {
    console.error(
      `No item custom fields returned. Create "${targetLabel}" under ` +
        `Zoho Settings → Items → Field Customization, then run this again.`,
    );
    process.exit(1);
  }

  console.log(`All item custom fields (${fields.length}):\n`);
  for (const field of fields) {
    const id = resolveFieldId(field);
    console.log(
      `  label: "${field.label ?? "—"}"  →  customfield_id: ${id ?? "(missing id)"}` +
        (field.api_name ? `  (api_name: ${field.api_name})` : ""),
    );
  }

  const match = fields.find(
    (f) => (f.label ?? "").trim().toLowerCase() === targetLabel.toLowerCase(),
  );

  if (match) {
    const fieldId = resolveFieldId(match);
    if (!fieldId) {
      console.error(`\nFound label "${match.label}" but no customfield_id on the definition.`);
      process.exit(1);
    }
    console.log(`\n✓ Found it. Set this in Vercel (and .env locally):\n`);
    console.log(`  ZOHO_UBEX_BARCODE_CF_ID=${fieldId}\n`);
    console.log(
      `Note: Books writes use customfield_id on PUT /books/v3/item/{id}/customfields — not api_name on PUT /items/{id}.`,
    );
  } else {
    console.log(
      `\nNo field labeled exactly "${targetLabel}" was found. ` +
        `Check the exact label in Zoho Settings → Items → Field Customization, or pass the label:\n` +
        `  npx tsx scripts/zoho-discover-barcode-field.ts "Exact Label Here"`,
    );
  }
}

main().catch((err) => {
  console.error(`\nFailed: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
