import { getSupabaseService } from "@/lib/supabase/service";
import { ensureCodSettings } from "@/lib/supabase/ensure-cod-settings";
import { CODSettingsForm } from "@/components/cod-settings/CODSettingsForm";

export const dynamic = "force-dynamic";

async function loadRecipients(): Promise<string[]> {
  // Ensure table exists first (no-op if already created)
  await ensureCodSettings();

  const supabase = getSupabaseService();
  if (!supabase) return [];

  try {
    const { data } = await supabase
      .from("cod_settings")
      .select("value")
      .eq("key", "email_recipients")
      .maybeSingle();
    const raw = (data as { value: string } | null)?.value ?? "";
    return raw.split(",").map((e) => e.trim()).filter(Boolean);
  } catch {
    return [];
  }
}

export default async function CODSettingsPage() {
  const recipients = await loadRecipients();
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <h1 className="text-xl font-semibold text-[#111111]">COD Settings</h1>
        <p className="mt-1 text-[13px] text-[#555555]">
          Manage who receives the COD list email when you click &ldquo;Email Ubex&rdquo;.
        </p>
      </header>
      <CODSettingsForm initialRecipients={recipients} />
    </div>
  );
}
