import { getSupabaseService } from "@/lib/supabase/service";
import { CODSettingsForm } from "@/components/cod-settings/CODSettingsForm";

export const dynamic = "force-dynamic";

async function loadRecipients(): Promise<{ recipients: string[]; tableExists: boolean }> {
  const supabase = getSupabaseService();
  if (!supabase) return { recipients: [], tableExists: false };
  try {
    const { data, error } = await supabase
      .from("cod_settings")
      .select("value")
      .eq("key", "email_recipients")
      .maybeSingle();
    if (error) {
      // If table doesn't exist, error.code will be '42P01'
      return { recipients: [], tableExists: false };
    }
    const raw = (data as { value: string } | null)?.value ?? "";
    return {
      recipients: raw.split(",").map((e) => e.trim()).filter(Boolean),
      tableExists: true,
    };
  } catch {
    return { recipients: [], tableExists: false };
  }
}

const SETUP_SQL = `CREATE TABLE IF NOT EXISTS cod_settings (
  key        text PRIMARY KEY,
  value      text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE cod_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY service_role_all ON cod_settings
  FOR ALL TO service_role USING (true) WITH CHECK (true);
INSERT INTO cod_settings (key, value)
VALUES ('email_recipients', '') ON CONFLICT (key) DO NOTHING;`;

export default async function CODSettingsPage() {
  const { recipients, tableExists } = await loadRecipients();
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <h1 className="text-xl font-semibold text-[#111111]">COD Settings</h1>
        <p className="mt-1 text-[13px] text-[#555555]">
          Manage who receives the COD list email when you click &ldquo;Email Ubex&rdquo;.
        </p>
      </header>

      {!tableExists && (
        <div className="rounded-card border border-[#F0B743]/30 bg-[rgba(240,183,67,0.10)] p-4">
          <p className="text-[13px] font-medium text-[#F0B743]">One-time setup required</p>
          <p className="mt-1 text-[12px] text-[#555555]">
            Run this SQL in your{" "}
            <a
              href="https://supabase.com/dashboard/project/ogijozsjbfgbkjtgzsrp/sql"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              Supabase SQL editor
            </a>{" "}
            to create the settings table:
          </p>
          <pre className="mt-2 overflow-x-auto rounded bg-white p-3 text-[11px] text-[#111111] shadow-inner">
            {SETUP_SQL}
          </pre>
        </div>
      )}

      <CODSettingsForm initialRecipients={recipients} />
    </div>
  );
}
