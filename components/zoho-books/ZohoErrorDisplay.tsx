"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { ZohoErrorResult } from "@/lib/zoho/classify-error";

type Props = {
  title?: string;
  error: ZohoErrorResult;
};

export function ZohoErrorBanner({ title = "Can't connect to Zoho", error }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-card border border-amber-200 bg-amber-50/80 p-4 shadow-soft">
      <p className="text-sm font-medium text-ink">{title}</p>
      <p className="mt-1 text-[13px] text-muted">{error.userMessage}</p>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="mt-3 inline-flex items-center gap-1 text-[12px] font-medium text-zoho-books hover:underline"
      >
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        Technical detail
      </button>
      {open && (
        <pre className="mt-2 overflow-x-auto rounded-lg border border-line bg-white p-3 font-mono text-[11px] text-muted">
          {error.httpStatus != null ? `HTTP ${error.httpStatus}\n` : ""}
          {error.detail}
        </pre>
      )}
    </div>
  );
}

type RowErrorProps = {
  error: ZohoErrorResult;
};

export function ZohoRowError({ error }: RowErrorProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-1 text-[12px] text-red-700">
      <p>{error.userMessage}</p>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="mt-0.5 inline-flex items-center gap-0.5 text-[11px] text-muted hover:text-ink"
      >
        {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        Technical detail
      </button>
      {open && (
        <p className="mt-1 font-mono text-[10px] text-muted">
          {error.httpStatus != null ? `HTTP ${error.httpStatus} — ` : ""}
          {error.detail}
        </p>
      )}
    </div>
  );
}
