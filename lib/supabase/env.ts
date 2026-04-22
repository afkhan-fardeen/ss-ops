/**
 * Centralised Supabase env. Each helper returns `null` when not configured so Supabase-dependent features are
 * strictly optional during Phase A/B shipping.
 */
export type SupabaseEnv = {
  url: string;
  anonKey: string;
  serviceKey?: string;
};

export function getSupabaseEnv(): SupabaseEnv | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return { url, anonKey, serviceKey };
}

export function isSupabaseConfigured(): boolean {
  return getSupabaseEnv() !== null;
}

export function isSupabaseServiceConfigured(): boolean {
  const env = getSupabaseEnv();
  return Boolean(env && env.serviceKey);
}
