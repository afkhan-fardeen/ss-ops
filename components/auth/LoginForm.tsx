"use client";

import { AlertCircle, ArrowRight, Loader2, Lock, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { DEFAULT_POST_LOGIN_PATH, getSafeNextPath } from "@/lib/auth/safe-next-path";
import { getBrowserSupabase } from "@/lib/supabase/browser";

export function LoginForm({
  nextPath,
  authMode,
}: {
  nextPath: string;
  authMode: "supabase" | "shared";
}) {
  const safeNext = getSafeNextPath(nextPath);
  if (authMode === "supabase") {
    return <SupabaseLoginForm nextPath={safeNext} />;
  }
  return <SharedPasswordForm nextPath={safeNext} />;
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
      const target = data.next ?? DEFAULT_POST_LOGIN_PATH;
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
    <fieldset disabled={loading} className={loading ? "pointer-events-none opacity-70" : ""}>
      <form onSubmit={onSubmit} className="mt-7 space-y-4">
        <Field label="Password" htmlFor="password">
          <PasswordInput
            id="password"
            icon={<Lock size={16} />}
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
        // Fire-and-forget login activity for admin panel (do not block navigation).
        void fetch("/api/auth/login-event", { method: "POST" }).catch(() => {});
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
    <fieldset disabled={loading} className={loading ? "pointer-events-none opacity-70" : ""}>
      <form onSubmit={onSubmit} className="mt-7 space-y-4">
        <Field label="Email" htmlFor="email">
          <Input
            id="email"
            type="email"
            inputMode="email"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            icon={<Mail size={16} />}
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
              icon={<Lock size={16} />}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              invalid={Boolean(error)}
            />
          </Field>
        ) : null}

        {error ? <FieldError message={error} /> : null}

        <SubmitButton loading={loading} label={mode === "password" ? "Sign in" : "Send magic link"} />

        <button
          type="button"
          onClick={() => {
            setError(null);
            setMode((m) => (m === "password" ? "magic" : "password"));
          }}
          className="focus-ring inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-control text-body-lg font-medium text-muted transition hover:text-ink"
        >
          {mode === "password" ? "Email me a sign-in link instead" : "Use my password instead"}
        </button>
      </form>
    </fieldset>
  );
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="mb-2 block text-body font-medium text-ink"
      >
        {label}
      </label>
      {children}
    </div>
  );
}

function FieldError({ message }: { message: string }) {
  return (
    <p
      role="alert"
      className="flex items-start gap-2 rounded-control border border-danger-line bg-danger-soft px-3 py-3 text-body text-danger"
    >
      <AlertCircle size={16} className="mt-0.5 shrink-0" />
      <span>{message}</span>
    </p>
  );
}

function SubmitButton({ loading, label }: { loading: boolean; label: string }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="focus-ring inline-flex h-12 w-full items-center justify-center gap-2 rounded-control bg-primary px-4 text-heading font-medium text-white shadow-soft transition hover:bg-primary-strong active:bg-primary-strong disabled:opacity-70 md:h-11 md:text-body-lg"
    >
      {loading ? <Loader2 size={16} className="animate-spin" /> : null}
      <span>{loading ? "Please wait…" : label}</span>
      {loading ? null : <ArrowRight size={16} />}
    </button>
  );
}
