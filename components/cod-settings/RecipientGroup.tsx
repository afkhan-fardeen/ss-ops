"use client";

import { Plus, Trash2, Mail, Save, Loader2, CheckCircle } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function RecipientGroup({
  settingKey,
  initialRecipients,
  placeholder = "name@example.com",
  saveLabel = "Save",
}: {
  settingKey: string;
  initialRecipients: string[];
  placeholder?: string;
  saveLabel?: string;
}) {
  const router = useRouter();
  const [recipients, setRecipients] = useState<string[]>(initialRecipients);
  const [newEmail, setNewEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function addEmail() {
    const e = newEmail.trim().toLowerCase();
    if (!e.includes("@")) { toast.error("Enter a valid email address"); return; }
    if (recipients.includes(e)) { toast.error("Already in the list"); return; }
    setRecipients((prev) => [...prev, e]);
    setNewEmail("");
    setSaved(false);
  }

  function remove(email: string) {
    setRecipients((prev) => prev.filter((r) => r !== email));
    setSaved(false);
  }

  async function save() {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/cod-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: settingKey, recipients }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Save failed");
      setSaved(true);
      toast.success("Saved");
      // Invalidate the Next.js Router Cache so the server component re-fetches
      // fresh data from Supabase on the next navigation to this page.
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3 rounded-card border border-line bg-white p-5 shadow-soft">
      {/* Recipient list */}
      <ul className="space-y-2">
        {recipients.length === 0 ? (
          <li className="rounded-lg border border-dashed border-line px-4 py-5 text-center text-[13px] text-muted">
            No recipients yet — add one below.
          </li>
        ) : (
          recipients.map((email) => (
            <li key={email} className="flex items-center justify-between gap-3 rounded-lg border border-line px-4 py-2.5">
              <div className="flex items-center gap-2">
                <Mail size={14} className="shrink-0 text-muted" />
                <span className="text-[13px] text-ink">{email}</span>
              </div>
              <button
                type="button"
                onClick={() => remove(email)}
                className="focus-ring inline-flex h-7 w-7 items-center justify-center rounded-lg text-muted transition hover:bg-canvas hover:text-[#C25151]"
                aria-label={`Remove ${email}`}
              >
                <Trash2 size={14} />
              </button>
            </li>
          ))
        )}
      </ul>

      {/* Add + Save row */}
      <div className="flex gap-2">
        <div className="flex flex-1 items-center rounded-card border border-line bg-white transition focus-within:border-ink focus-within:shadow-[0_0_0_3px_rgba(17,17,17,0.08)]">
          <span className="inline-flex h-full items-center pl-3 text-muted">
            <Mail size={15} />
          </span>
          <input
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addEmail(); } }}
            placeholder={placeholder}
            className="min-h-11 flex-1 bg-transparent px-2 text-base text-ink outline-none placeholder:text-muted"
          />
        </div>
        <button
          type="button"
          onClick={addEmail}
          className="focus-ring inline-flex min-h-11 items-center gap-1.5 rounded-card border border-line bg-white px-3 text-[13px] font-medium text-ink transition hover:bg-canvas"
        >
          <Plus size={14} />
          Add
        </button>
      </div>

      <div className="flex items-center justify-end gap-3 pt-1">
        {saved && (
          <span className="flex items-center gap-1.5 text-[12px] font-medium text-[#4CAF50]">
            <CheckCircle size={13} />
            Saved
          </span>
        )}
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving}
          className="focus-ring inline-flex h-9 items-center gap-2 rounded-card bg-ink px-4 text-[13px] font-medium text-white shadow-soft transition hover:bg-ink/90 disabled:opacity-60"
        >
          {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
          {saving ? "Saving…" : saveLabel}
        </button>
      </div>
    </div>
  );
}
