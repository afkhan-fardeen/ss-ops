"use client";

import { useCallback, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { CodDatePicker, type CodDateOption } from "./CodDatePicker";
import { StatTick } from "./StatTick";

/**
 * Client shell for the Collection card: navigation transition, aria-busy, date picker, COD count.
 */
export function CodListCollectionPanel({
  titleLine,
  subLine,
  options,
  selectedDateKeys,
  ordersScannedInWindow,
  singleIsToday,
}: {
  titleLine: string;
  subLine: string;
  options: CodDateOption[];
  selectedDateKeys: string[];
  ordersScannedInWindow: number;
  singleIsToday: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const onApplyKeys = useCallback(
    (sorted: string[]) => {
      const sp = new URLSearchParams(searchParams.toString());
      if (sorted.length === 1) {
        sp.set("dates", sorted[0]!);
      } else {
        sp.set("dates", sorted.join(","));
      }
      const q = sp.toString();
      startTransition(() => {
        router.push(q ? `${pathname}?${q}` : pathname, { scroll: false });
      });
    },
    [pathname, router, searchParams],
  );

  return (
    <section
      className="flex h-full min-h-0 flex-1 flex-col rounded-card border border-[#EBEBEB] bg-white/95 p-5 shadow-soft backdrop-blur-[2px] transition-shadow duration-300 hover:shadow-md"
      aria-busy={isPending}
    >
      <div
        className={[
          "flex flex-1 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between",
          isPending ? "pointer-events-none opacity-70" : "",
        ].join(" ")}
      >
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#999999]">Collection</p>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
            {singleIsToday ? (
              <span
                className="inline-block h-2 w-2 shrink-0 rounded-full bg-[#4CAF50] animate-pulse-dot"
                title="Includes current collection window (live)"
              />
            ) : null}
            <h2 className="text-[18px] font-semibold text-[#111111]">{titleLine}</h2>
            {isPending ? (
              <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#555555]">
                <Loader2 size={14} className="animate-spin-slow" aria-hidden />
                <span>Updating list…</span>
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 text-[12px] text-[#999999]">{subLine}</p>
          <div className="mt-3">
            <CodDatePicker
              options={options}
              selectedDateKeys={selectedDateKeys}
              onApplyKeys={onApplyKeys}
              isPending={isPending}
            />
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-start gap-3 sm:items-end">
          <p className="text-[12px] text-[#999999]">
            <span className="inline-flex flex-wrap items-baseline gap-x-1.5">
              <StatTick value={ordersScannedInWindow} />
              <span>COD in selection</span>
            </span>
          </p>
        </div>
      </div>
    </section>
  );
}
