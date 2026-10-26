"use client";

import { AlertCircle, AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { Toaster as Sonner } from "sonner";
import { Spinner } from "@/components/ui/Spinner";

/**
 * App-wide toasts: white card, coloured status icon + left accent, readable sizes, bottom-centre above the
 * phone navigation bar (bottom-right on desktop feels detached, so we keep one position everywhere).
 */
export function Toaster() {
  return (
    <Sonner
      position="bottom-center"
      offset={24}
      mobileOffset={{ bottom: "calc(var(--mobile-nav-h) + 12px)" }}
      gap={8}
      visibleToasts={3}
      duration={4500}
      icons={{
        success: <CheckCircle2 className="text-success" />,
        error: <AlertCircle className="text-danger" />,
        warning: <AlertTriangle className="text-warning" />,
        info: <Info className="text-info" />,
        loading: <Spinner size={20} className="text-primary" />,
      }}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            "flex w-full items-start gap-3 rounded-card border border-line border-l-4 bg-white p-3.5 shadow-pop md:w-[380px]",
          icon: "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center [&>svg]:h-5 [&>svg]:w-5",
          content: "min-w-0 flex-1",
          title: "text-body font-semibold text-ink",
          description: "mt-0.5 text-body-sm text-muted",
          actionButton:
            "ml-2 shrink-0 self-center rounded-control bg-ink px-3 py-1.5 text-body-sm font-medium text-white",
          cancelButton:
            "ml-2 shrink-0 self-center rounded-control border border-line px-3 py-1.5 text-body-sm font-medium text-ink",
          closeButton: "!border-line !bg-white !text-muted",
          success: "!border-l-success",
          error: "!border-l-danger",
          warning: "!border-l-warning",
          info: "!border-l-info",
          loading: "!border-l-primary",
        },
      }}
    />
  );
}
