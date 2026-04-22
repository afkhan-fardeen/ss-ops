/** Ubex JSON bodies sometimes use numeric 200, string "200", or even status on HTTP layer only. */
export function ubexJsonStatusOk(status: unknown): boolean {
  if (status === 200 || status === "200") return true;
  const n = Number(status);
  return Number.isFinite(n) && n === 200;
}
