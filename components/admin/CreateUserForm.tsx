"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, UserPlus } from "lucide-react";

const SELECTABLE_MODULES: { id: string; label: string }[] = [
  { id: "cod", label: "COD" },
  { id: "fulfillment", label: "Fulfillment" },
  { id: "awb", label: "AWB Lookup" },
  { id: "stock", label: "Stock Balance" },
];

type SubmitState = "idle" | "saving" | "saved" | "error";

export function CreateUserForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set(["cod", "fulfillment", "awb"]));
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  function toggle(moduleId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(moduleId)) next.delete(moduleId);
      else next.add(moduleId);
      return next;
    });
    setSubmitState("idle");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (selected.size === 0) {
      setErrorMsg("Select at least one module");
      setSubmitState("error");
      return;
    }

    setSubmitState("saving");
    setErrorMsg("");

    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password,
          full_name: fullName.trim() || undefined,
          allowed_modules: [...selected],
        }),
      });
      const json = (await res.json()) as { ok: boolean; error?: string };
      if (!json.ok) throw new Error(json.error ?? "Create failed");

      setEmail("");
      setPassword("");
      setFullName("");
      setSelected(new Set(["cod", "fulfillment", "awb"]));
      setSubmitState("saved");
      router.refresh();
      setTimeout(() => setSubmitState("idle"), 2500);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Create failed");
      setSubmitState("error");
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-card border border-line bg-white p-5 shadow-soft"
    >
      <div className="flex items-center gap-2">
        <UserPlus size={16} className="text-muted" />
        <h2 className="text-sm font-medium text-ink">Add user</h2>
      </div>
      <p className="text-[13px] text-muted">
        Create a staff account with email and password. They will only see the modules you select —
        with full access inside those modules.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <label htmlFor="create-email" className="block text-[12px] font-medium uppercase tracking-wider text-muted">
            Email
          </label>
          <input
            id="create-email"
            type="email"
            required
            autoComplete="off"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={submitState === "saving"}
            className="w-full rounded-lg border border-line bg-canvas px-3 py-2 text-sm text-ink focus:border-awb focus:outline-none focus:ring-2 focus:ring-awb/40"
            placeholder="staff@example.com"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="create-password" className="block text-[12px] font-medium uppercase tracking-wider text-muted">
            Password
          </label>
          <input
            id="create-password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={submitState === "saving"}
            className="w-full rounded-lg border border-line bg-canvas px-3 py-2 font-mono text-sm text-ink focus:border-awb focus:outline-none focus:ring-2 focus:ring-awb/40"
            placeholder="Min. 8 characters"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="create-name" className="block text-[12px] font-medium uppercase tracking-wider text-muted">
            Full name <span className="normal-case tracking-normal text-muted/70">(optional)</span>
          </label>
          <input
            id="create-name"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            disabled={submitState === "saving"}
            className="w-full rounded-lg border border-line bg-canvas px-3 py-2 text-sm text-ink focus:border-awb focus:outline-none focus:ring-2 focus:ring-awb/40"
            placeholder="Display name"
          />
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-[12px] font-medium uppercase tracking-wider text-muted">Modules</p>
        <div className="flex flex-wrap gap-2">
          {SELECTABLE_MODULES.map((m) => {
            const checked = selected.has(m.id);
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => toggle(m.id)}
                disabled={submitState === "saving"}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-medium transition-colors ${
                  checked
                    ? "bg-awb-bg text-awb"
                    : "bg-canvas text-muted hover:bg-line/30"
                }`}
              >
                {checked && <Check size={11} strokeWidth={2.5} />}
                {m.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={submitState === "saving" || !email.trim() || password.length < 8}
          className="flex items-center gap-2 rounded-lg bg-awb px-4 py-2 text-[13px] font-medium text-white shadow-soft transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitState === "saving" ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <UserPlus size={14} />
          )}
          {submitState === "saving" ? "Creating…" : "Create user"}
        </button>
        {submitState === "saved" && (
          <span className="text-[12px] text-cod">User created — they can log in now.</span>
        )}
        {submitState === "error" && (
          <span className="text-[12px] text-fulfillment">{errorMsg}</span>
        )}
      </div>
    </form>
  );
}
