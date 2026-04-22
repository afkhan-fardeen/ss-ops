import { SESSION_COOKIE_NAME } from "./constants";

type Payload = { exp: number; v: 1 };

function base64UrlToString(b64url: string): string {
  const pad = b64url.length % 4 === 0 ? "" : "=".repeat(4 - (b64url.length % 4));
  const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/") + pad;
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

function hexToBytes(hex: string): Uint8Array | null {
  if (hex.length % 2 !== 0) return null;
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    const byte = Number.parseInt(hex.slice(i, i + 2), 16);
    if (Number.isNaN(byte)) return null;
    out[i / 2] = byte;
  }
  return out;
}

function timingSafeEqualBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i]! ^ b[i]!;
  return diff === 0;
}

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.digest("SHA-256", enc.encode(secret));
  const key = await crypto.subtle.importKey(
    "raw",
    keyMaterial,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function verifySessionTokenEdge(token: string, secret: string): Promise<boolean> {
  const i = token.lastIndexOf(".");
  if (i <= 0) return false;
  const payloadB64 = token.slice(0, i);
  const sigHex = token.slice(i + 1);
  const expectedHex = await hmacSha256Hex(secret, payloadB64);
  const sigBytes = hexToBytes(sigHex);
  const expBytes = hexToBytes(expectedHex);
  if (!sigBytes || !expBytes || !timingSafeEqualBytes(sigBytes, expBytes)) return false;
  let parsed: Payload;
  try {
    parsed = JSON.parse(base64UrlToString(payloadB64)) as Payload;
  } catch {
    return false;
  }
  if (parsed.v !== 1 || typeof parsed.exp !== "number") return false;
  if (parsed.exp <= Date.now()) return false;
  return true;
}

export { SESSION_COOKIE_NAME };
