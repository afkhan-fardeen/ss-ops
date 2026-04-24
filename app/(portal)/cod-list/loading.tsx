import { StripSkeleton, TableSkeleton } from "@/components/ui/TableSkeleton";

export default function CODListLoading() {
  return (
    <div className="space-y-5">
      <StripSkeleton />
      <div className="h-5 w-64 animate-pulse rounded bg-[#EBEBEB]" />
      <TableSkeleton rows={8} columns={8} />
    </div>
  );
}
