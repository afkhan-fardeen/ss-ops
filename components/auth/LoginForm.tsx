"use client";

import { LogIn, Mail } from "lucide-react";
import { useState } from "react";
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
        setError(data.error ?? "Could not sign in");
        return;
      }
      window.location.href = data.next ?? "/cod-list";
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4">
      <label className="block">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-portal-text3">Password</span>
        <input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="focus-ring mt-2 w-full rounded-card border border-portal-border bg-portal-bg px-3 py-2.5 text-sm text-portal-text placeholder:text-portal-text3"
          placeholder="Enter portal password"
          required
        />
      </label>
      {error ? <ErrorBanner message={error} /> : null}
      <SubmitButton loading={loading} label="Continue" />
    </form>
  );
}

function SupabaseLoginForm({ nextPath }: { nextPath: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"password" | "magic">("password");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      const supabase = getBrowserSupabase();
      if (mode === "password") {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) {
          setError(err.message);
          return;
        }
        window.location.href = nextPath;
        return;
      }
      // Magic link
      const redirectTo = `${window.location.origin}/api/auth/callback?next=${encodeURIComponent(nextPath)}`;
      const { error: err } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: redirectTo },
      });
      if (err) {
        setError(err.message);
        return;
      }
      setInfo("Check your email for the sign-in link.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4">
      <label className="block">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-portal-text3">Email</span>
        <input
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="focus-ring mt-2 w-full rounded-card border border-portal-border bg-portal-bg px-3 py-2.5 text-sm text-portal-text placeholder:text-portal-text3"
          placeholder="you@seissense.com"
          required
        />
      </label>
      {mode === "password" ? (
        <label className="block">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-portal-text3">Password</span>
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="focus-ring mt-2 w-full rounded-card border border-portal-border bg-portal-bg px-3 py-2.5 text-sm text-portal-text placeholder:text-portal-text3"
            placeholder="••••••••"
            required={mode === "password"}
          />
        </label>
      ) : null}

      <button
        type="button"
        onClick={() => {
          setError(null);
          setInfo(null);
          setMode((m) => (m === "password" ? "magic" : "password"));
        }}
        className="focus-ring inline-flex items-center gap-1.5 rounded text-[12px] font-medium text-portal-accent hover:underline"
      >
        <Mail size={12} />
        {mode === "password" ? "Use magic link instead" : "Use password instead"}
      </button>

      {error ? <ErrorBanner message={error} /> : null}
      {info ? (
        <div className="rounded-card border border-portal-accent/30 bg-portal-accentSoft px-3 py-2 text-[13px] text-portal-accent">
          {info}
        </div>
      ) : null}

      <SubmitButton loading={loading} label={mode === "password" ? "Sign in" : "Send magic link"} />
    </form>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="rounded-card border border-portal-red/25 bg-portal-redSoft px-3 py-2 text-[13px] text-portal-red">
      {message}
    </div>
  );
}

function SubmitButton({ loading, label }: { loading: boolean; label: string }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="focus-ring inline-flex h-10 w-full items-center justify-center gap-2 rounded-card bg-portal-accent px-4 text-[13px] font-semibold text-portal-accentContrast shadow-soft transition hover:opacity-95 disabled:opacity-60"
    >
      {loading ? (
        <span className="animate-spin-slow inline-block h-4 w-4 rounded-full border-2 border-white/50 border-t-white" />
      ) : (
        <LogIn size={15} strokeWidth={2.2} />
      )}
      <span>{loading ? "Signing in…" : label}</span>
    </button>
  );
}
