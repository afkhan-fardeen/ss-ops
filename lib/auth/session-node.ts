import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { SESSION_COOKIE_NAME } from "./constants";

export { SESSION_COOKIE_NAME };

type Payload = { exp: number; v: 1 };

function encodePayload(p: Payload): string {
  return Buffer.from(JSON.stringify(p), "utf8").toString("base64url");
}

function signPayload(payloadB64: string, secret: string): string {
  const key = createHash("sha256").update(secret, "utf8").digest();
  return createHmac("sha256", key).update(payloadB64).digest("hex");
}

export function createSessionToken(secret: string, maxAgeMs = 7 * 24 * 60 * 60 * 1000): string {
  const payload: Payload = { v: 1, exp: Date.now() + maxAgeMs };
  const payloadB64 = encodePayload(payload);
  const sig = signPayload(payloadB64, secret);
  return `${payloadB64}.${sig}`;
}

export function verifySessionToken(token: string, secret: string): Payload | null {
  const i = token.lastIndexOf(".");
  if (i <= 0) return null;
  const payloadB64 = token.slice(0, i);
  const sig = token.slice(i + 1);
  const expected = signPayload(payloadB64, secret);
  const a = Buffer.from(sig, "hex");
  const b = Buffer.from(expected, "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  let parsed: Payload;
  try {
    parsed = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8")) as Payload;
  } catch {
    return null;
  }
  if (parsed.v !== 1 || typeof parsed.exp !== "number") return null;
  if (parsed.exp <= Date.now()) return null;
  return parsed;
}

export function sessionCookieOptions(maxAgeSec: number) {
  return {
    name: SESSION_COOKIE_NAME,
    httpOnly: true as const,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/" as const,
    maxAge: maxAgeSec,
  };
}

export function randomCsrfToken(): string {
  return randomBytes(32).toString("hex");
}
