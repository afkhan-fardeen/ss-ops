/** localStorage-backed boolean read/write, tolerant of storage being unavailable (SSR, private mode, quota). */

export function readPersistedBoolean(key: string, fallback: boolean): boolean {
  try {
    const v = window.localStorage.getItem(key);
    if (v === "0") return false;
    if (v === "1") return true;
  } catch {
    /* ignore */
  }
  return fallback;
}

export function writePersistedBoolean(key: string, value: boolean): void {
  try {
    window.localStorage.setItem(key, value ? "1" : "0");
  } catch {
    /* ignore */
  }
}
