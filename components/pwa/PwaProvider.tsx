"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type PwaState = {
  /** Browser (Chrome/Edge/Android) can show its native install dialog. */
  canPrompt: boolean;
  /** iOS Safari: no install API — show "Share → Add to Home Screen" instructions instead. */
  isIos: boolean;
  /** Already running as an installed app. */
  isStandalone: boolean;
  online: boolean;
  promptInstall: () => Promise<void>;
};

const PwaContext = createContext<PwaState>({
  canPrompt: false,
  isIos: false,
  isStandalone: false,
  online: true,
  promptInstall: async () => {},
});

export function usePwa(): PwaState {
  return useContext(PwaContext);
}

function detectStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true;
}

function detectIos(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const iPadOs = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  return /iPhone|iPad|iPod/i.test(ua) || iPadOs;
}

/**
 * Registers the service worker and exposes install / online state to the UI.
 * The service worker only caches static assets (see public/sw.js) — never pages or API data.
 */
export function PwaProvider({ children }: { children: React.ReactNode }) {
  const deferred = useRef<BeforeInstallPromptEvent | null>(null);
  const [canPrompt, setCanPrompt] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [online, setOnline] = useState(true);

  useEffect(() => {
    setIsIos(detectIos());
    setIsStandalone(detectStandalone());
    setOnline(navigator.onLine);

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      deferred.current = e as BeforeInstallPromptEvent;
      setCanPrompt(true);
    };
    const onInstalled = () => {
      deferred.current = null;
      setCanPrompt(false);
      setIsStandalone(true);
      toast.success("Seissense Ops installed");
    };
    const onOnline = () => {
      setOnline(true);
      toast.success("Back online");
    };
    const onOffline = () => {
      setOnline(false);
      toast.error("You're offline", { description: "Live data won't load until you reconnect." });
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    const hadController = Boolean(navigator.serviceWorker.controller);
    const onControllerChange = () => {
      // A new version took over. Only announce it for returning sessions, not the very first install.
      if (!hadController) return;
      toast("A new version is ready", {
        duration: 15000,
        action: { label: "Reload", onClick: () => window.location.reload() },
      });
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
      /* non-critical: the app works without it */
    });
    return () => navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
  }, []);

  const promptInstall = useCallback(async () => {
    const evt = deferred.current;
    if (!evt) return;
    await evt.prompt();
    await evt.userChoice.catch(() => null);
    deferred.current = null;
    setCanPrompt(false);
  }, []);

  const value = useMemo<PwaState>(
    () => ({ canPrompt, isIos, isStandalone, online, promptInstall }),
    [canPrompt, isIos, isStandalone, online, promptInstall],
  );

  return <PwaContext.Provider value={value}>{children}</PwaContext.Provider>;
}
