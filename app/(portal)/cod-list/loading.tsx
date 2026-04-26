import { TableSkeleton } from "@/components/ui/TableSkeleton";

export default function CODListLoading() {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-2 lg:items-stretch">
        <div className="rounded-card border border-[#EBEBEB] bg-white p-5 shadow-soft">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-2">
              <div className="h-2.5 w-20 animate-pulse rounded bg-[#EBEBEB]" />
              <div className="h-5 w-48 animate-pulse rounded bg-[#EBEBEB]" />
            </div>
            <div className="h-3 w-40 animate-pulse rounded bg-[#EBEBEB]" />
          </div>
        </div>
        <div className="hidden min-h-[100px] rounded-card border border-[#EBEBEB] bg-white p-5 shadow-soft lg:block">
          <div className="h-3 w-24 animate-pulse rounded bg-[#EBEBEB]" />
          <div className="mt-4 h-8 w-full max-w-sm animate-pulse rounded bg-[#EBEBEB]" />
        </div>
      </div>
      <div className="h-5 w-64 max-w-full animate-pulse rounded bg-[#EBEBEB]" />
      <TableSkeleton rows={8} columns={8} />
    </div>
  );
}
