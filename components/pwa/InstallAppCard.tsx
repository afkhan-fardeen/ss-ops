"use client";

import { useEffect, useState } from "react";
import { Download, Share, SquarePlus, X } from "lucide-react";
import { usePwa } from "@/components/pwa/PwaProvider";
import { btn } from "@/components/ui/button-styles";

const DISMISS_KEY = "pwa.install.dismissed";
const DISMISS_DAYS = 14;

function readDismissed(): boolean {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY));
    return Number.isFinite(at) && at > 0 && Date.now() - at < DISMISS_DAYS * 86_400_000;
  } catch {
    return false;
  }
}

/**
 * "Install the app" call-to-action. Renders nothing when the app is already installed or the browser
 * can't install it. `dismissible` banners stay hidden for two weeks after being closed.
 */
export function InstallAppCard({ dismissible = false }: { dismissible?: boolean }) {
  const { canPrompt, isIos, isStandalone, promptInstall } = usePwa();
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => setDismissed(dismissible ? readDismissed() : false), [dismissible]);

  if (isStandalone || dismissed || (!canPrompt && !isIos)) return null;

  function dismiss() {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* ignore */
    }
  }

  return (
    <section className="relative rounded-card border border-primary/20 bg-primary-soft p-4 md:hidden">
      {dismissible ? (
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          className="absolute right-2 top-2 grid h-9 w-9 place-items-center rounded-full text-muted active:bg-white/60"
        >
          <X size={17} />
        </button>
      ) : null}
      <div className="flex items-start gap-3 pr-8">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-card bg-primary text-white">
          <Download size={20} />
        </div>
        <div className="min-w-0">
          <h2 className="text-heading font-semibold text-ink">Install Seissense Ops</h2>
          {canPrompt ? (
            <>
              <p className="mt-0.5 text-body text-muted">Open it like an app from your home screen — full screen, no browser bar.</p>
              <button
                type="button"
                onClick={() => void promptInstall()}
                className={btn("primary", "md", "mt-3")}
              >
                <Download size={16} />
                Install app
              </button>
            </>
          ) : (
            <p className="mt-1 text-body leading-relaxed text-muted">
              In Safari tap <Share size={14} className="mx-0.5 inline -translate-y-px text-primary" />{" "}
              <span className="font-medium text-ink">Share</span>, then{" "}
              <SquarePlus size={14} className="mx-0.5 inline -translate-y-px text-primary" />{" "}
              <span className="font-medium text-ink">Add to Home Screen</span>.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
