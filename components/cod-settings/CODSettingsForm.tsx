"use client";

import { Plus, Trash2, Mail, Save, Loader2, CheckCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export function CODSettingsForm({ initialRecipients }: { initialRecipients: string[] }) {
  const [recipients, setRecipients] = useState<string[]>(
    initialRecipients.length > 0 ? initialRecipients : [],
  );
  const [newEmail, setNewEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function addEmail() {
    const e = newEmail.trim().toLowerCase();
    if (!e.includes("@")) {
      toast.error("Enter a valid email address");
      return;
    }
    if (recipients.includes(e)) {
      toast.error("Already in the list");
      return;
    }
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
        body: JSON.stringify({ recipients }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Save failed");
      setSaved(true);
      toast.success("Recipients saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Current recipients */}
      <section className="rounded-card border border-[#EBEBEB] bg-white p-5 shadow-soft">
        <h2 className="text-[13px] font-semibold text-[#111111]">Email recipients</h2>
        <p className="mt-0.5 text-[12px] text-[#999999]">
          These addresses receive the COD list Excel when you click &ldquo;Email Ubex&rdquo; on the COD page.
        </p>

        <ul className="mt-4 space-y-2">
          {recipients.length === 0 ? (
            <li className="rounded-lg border border-dashed border-[#EBEBEB] px-4 py-6 text-center text-[13px] text-[#999999]">
              No recipients yet — add one below.
            </li>
          ) : (
            recipients.map((email) => (
              <li
                key={email}
                className="flex items-center justify-between gap-3 rounded-lg border border-[#EBEBEB] px-4 py-2.5"
              >
                <div className="flex items-center gap-2">
                  <Mail size={14} className="shrink-0 text-[#999999]" />
                  <span className="text-[13px] text-[#111111]">{email}</span>
                </div>
                <button
                  type="button"
                  onClick={() => remove(email)}
                  className="focus-ring inline-flex h-7 w-7 items-center justify-center rounded-lg text-[#999999] transition hover:bg-[#F7F7F7] hover:text-[#C25151]"
                  aria-label={`Remove ${email}`}
                >
                  <Trash2 size={14} />
                </button>
              </li>
            ))
          )}
        </ul>
      </section>

      {/* Add recipient */}
      <section className="rounded-card border border-[#EBEBEB] bg-white p-5 shadow-soft">
        <h2 className="text-[13px] font-semibold text-[#111111]">Add recipient</h2>
        <div className="mt-3 flex gap-2">
          <div className="flex flex-1 items-center rounded-card border border-[#EBEBEB] bg-white focus-within:border-[#111111] focus-within:shadow-[0_0_0_3px_rgba(17,17,17,0.08)] transition">
            <span className="inline-flex h-full items-center pl-3 text-[#999999]">
              <Mail size={15} />
            </span>
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addEmail(); } }}
              placeholder="name@example.com"
              className="h-11 flex-1 bg-transparent px-2 text-[13.5px] text-[#111111] outline-none placeholder:text-[#999999]"
            />
          </div>
          <button
            type="button"
            onClick={addEmail}
            className="focus-ring inline-flex h-11 items-center gap-1.5 rounded-card border border-[#EBEBEB] bg-white px-4 text-[13px] font-medium text-[#111111] transition hover:bg-[#F7F7F7]"
          >
            <Plus size={15} />
            Add
          </button>
        </div>
      </section>

      {/* Save */}
      <div className="flex items-center justify-end gap-3">
        {saved && (
          <span className="flex items-center gap-1.5 text-[12px] font-medium text-[#4CAF50]">
            <CheckCircle size={14} />
            Saved
          </span>
        )}
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving}
          className="focus-ring inline-flex h-10 items-center gap-2 rounded-card bg-[#111111] px-5 text-[13px] font-semibold text-white shadow-soft transition hover:bg-[#333333] disabled:opacity-60"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          {saving ? "Saving…" : "Save recipients"}
        </button>
      </div>
    </div>
  );
}
