"use client";

import { Loader2, Lock, LogIn, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { getBrowserSupabase } from "@/lib/supabase/browser";

export function LoginForm({
  nextPath,
  authMode,
}: {
  nextPath: string;
  authMode: "supabase" | "shared";
}) {
  if (authMode === "supabase") {
    return <SupabaseLoginForm nextPath={nextPath} />;
  }
  return <SharedPasswordForm nextPath={nextPath} />;
}

function SharedPasswordForm({ nextPath }: { nextPath: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, next: nextPath }),
      });
      const data = (await res.json()) as { ok?: boolean; next?: string; error?: string };
      if (!res.ok) {
        const msg = data.error ?? "Could not sign in";
        setError(msg);
        toast.error(msg);
        return;
      }
      const target = data.next ?? "/dashboard";
      router.replace(target);
      router.refresh();
    } catch {
      setError("Network error");
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <fieldset disabled={loading} className={loading ? "pointer-events-none opacity-60" : ""}>
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <Field label="Password" htmlFor="password">
          <PasswordInput
            id="password"
            icon={<Lock size={15} />}
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter portal password"
            required
            invalid={Boolean(error)}
          />
        </Field>
        {error ? <FieldError message={error} /> : null}
        <SubmitButton loading={loading} label="Continue" />
      </form>
    </fieldset>
  );
}

function SupabaseLoginForm({ nextPath }: { nextPath: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"password" | "magic">("password");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const supabase = getBrowserSupabase();
      if (!supabase) {
        const msg = "Supabase is not configured";
        setError(msg);
        toast.error(msg);
        return;
      }
      if (mode === "password") {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) {
          setError(err.message);
          toast.error("Could not sign in", { description: err.message });
          return;
        }
        router.replace(nextPath);
        router.refresh();
        return;
      }
      const redirectTo = `${window.location.origin}/api/auth/callback?next=${encodeURIComponent(nextPath)}`;
      const { error: err } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: redirectTo },
      });
      if (err) {
        setError(err.message);
        toast.error("Could not send magic link", { description: err.message });
        return;
      }
      toast.success("Check your email", {
        description: "We sent you a sign-in link.",
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Network error";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <fieldset disabled={loading} className={loading ? "pointer-events-none opacity-60" : ""}>
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <Field label="Email" htmlFor="email">
          <Input
            id="email"
            type="email"
            icon={<Mail size={15} />}
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@seissense.com"
            required
            invalid={Boolean(error)}
          />
        </Field>

        {mode === "password" ? (
          <Field label="Password" htmlFor="password">
            <PasswordInput
              id="password"
              icon={<Lock size={15} />}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              invalid={Boolean(error)}
            />
          </Field>
        ) : null}

        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => {
              setError(null);
              setMode((m) => (m === "password" ? "magic" : "password"));
            }}
            className="focus-ring inline-flex items-center gap-1.5 rounded px-1 text-[12px] font-medium text-[#555555] transition hover:text-[#111111] hover:underline"
          >
            <Mail size={12} />
            {mode === "password" ? "Use magic link instead" : "Use password instead"}
          </button>
        </div>

        {error ? <FieldError message={error} /> : null}

        <SubmitButton loading={loading} label={mode === "password" ? "Sign in" : "Send magic link"} />
      </form>
    </fieldset>
  );
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-[#999999]"
      >
        {label}
      </label>
      {children}
    </div>
  );
}

function FieldError({ message }: { message: string }) {
  return (
    <p className="text-[12px] font-medium text-[#C25151]" role="alert">
      {message}
    </p>
  );
}

function SubmitButton({ loading, label }: { loading: boolean; label: string }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="focus-ring inline-flex h-11 w-full items-center justify-center gap-2 rounded-card bg-[#111111] px-4 text-[13.5px] font-semibold text-white shadow-soft transition hover:bg-[#333333] disabled:opacity-60"
    >
      {loading ? (
        <Loader2 size={15} className="animate-spin" />
      ) : (
        <LogIn size={15} strokeWidth={2.2} />
      )}
      <span>{loading ? "Signing in…" : label}</span>
    </button>
  );
}
