"use client";

import { useState } from "react";
import { Check, RotateCcw, Loader2 } from "lucide-react";
import type { ProfileRow } from "@/lib/supabase/profiles";

const SELECTABLE_MODULES: { id: string; label: string }[] = [
  { id: "cod", label: "COD" },
  { id: "fulfillment", label: "Fulfillment" },
  { id: "awb", label: "AWB Lookup" },
  { id: "stock", label: "Stock Balance" },
  { id: "subscriptions", label: "Subscriptions" },
];

type SaveState = "idle" | "saving" | "saved" | "error";

export function UserModuleEditor({ user }: { user: ProfileRow }) {
  const isUnrestricted = user.allowed_modules === null;

  const [selected, setSelected] = useState<Set<string>>(
    isUnrestricted
      ? new Set(SELECTABLE_MODULES.map((m) => m.id))
      : new Set(user.allowed_modules ?? []),
  );
  // null means "unrestricted" — represented in UI as all checked + a "full access" badge
  const [unrestricted, setUnrestricted] = useState(isUnrestricted);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  function toggle(moduleId: string) {
    if (unrestricted) return; // don't allow partial edits while in unrestricted mode
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(moduleId)) {
        next.delete(moduleId);
      } else {
        next.add(moduleId);
      }
      return next;
    });
    setSaveState("idle");
  }

  async function save(modulesPayload: string[] | null) {
    setSaveState("saving");
    setErrorMsg("");
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ allowed_modules: modulesPayload }),
      });
      const json = (await res.json()) as { ok: boolean; error?: string };
      if (!json.ok) throw new Error(json.error ?? "Save failed");
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 2000);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Save failed");
      setSaveState("error");
    }
  }

  async function handleSave() {
    if (unrestricted) {
      await save(null);
    } else {
      await save([...selected]);
    }
  }

  async function handleReset() {
    setUnrestricted(true);
    setSelected(new Set(SELECTABLE_MODULES.map((m) => m.id)));
    await save(null);
  }

  function handleCheckboxChange(moduleId: string) {
    if (unrestricted) {
      // Switching from unrestricted to restricted: start with all checked minus this one
      const allExcept = new Set(
        SELECTABLE_MODULES.map((m) => m.id).filter((id) => id !== moduleId),
      );
      setSelected(allExcept);
      setUnrestricted(false);
      setSaveState("idle");
    } else {
      toggle(moduleId);
    }
  }

  const isDirty =
    (!unrestricted && isUnrestricted) ||
    (unrestricted && !isUnrestricted) ||
    (!unrestricted &&
      !isUnrestricted &&
      (selected.size !== (user.allowed_modules?.length ?? 0) ||
        [...selected].some((id) => !user.allowed_modules?.includes(id))));

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {SELECTABLE_MODULES.map((m) => {
          const checked = unrestricted || selected.has(m.id);
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => handleCheckboxChange(m.id)}
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

      <div className="flex items-center gap-2">
        {isDirty && saveState !== "saving" && (
          <button
            onClick={handleSave}
            className="rounded-lg bg-awb px-3 py-1 text-[12px] font-medium text-white shadow-soft transition-all hover:opacity-90"
          >
            Save
          </button>
        )}
        {!unrestricted && (
          <button
            onClick={handleReset}
            className="flex items-center gap-1 text-[12px] font-medium text-muted transition-colors hover:text-ink"
          >
            <RotateCcw size={11} />
            Full access
          </button>
        )}
        {saveState === "saving" && (
          <span className="flex items-center gap-1 text-[12px] text-muted">
            <Loader2 size={11} className="animate-spin" />
            Saving…
          </span>
        )}
        {saveState === "saved" && (
          <span className="text-[12px] text-cod">Saved</span>
        )}
        {saveState === "error" && (
          <span className="text-[12px] text-fulfillment">{errorMsg}</span>
        )}
        {unrestricted && saveState === "idle" && (
          <span className="rounded-full bg-cod-bg px-2.5 py-0.5 text-[11px] font-medium text-cod">
            full access
          </span>
        )}
      </div>
    </div>
  );
}
