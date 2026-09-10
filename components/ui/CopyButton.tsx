"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

export function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  if (!value) return null;
  function copy(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(value).then(
      () => { setCopied(true); setTimeout(() => setCopied(false), 1400); },
      () => {},
    );
  }
  return (
    <button
      type="button"
      onClick={copy}
      className="focus-ring inline-flex h-6 w-6 items-center justify-center rounded text-muted transition hover:bg-canvas hover:text-ink"
      title={copied ? "Copied" : "Copy"}
      aria-label="Copy"
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
    </button>
  );
}
