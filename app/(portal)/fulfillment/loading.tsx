import { FilterChipSkeleton, TableSkeleton } from "@/components/ui/TableSkeleton";

export default function FulfillmentLoading() {
  return (
    <div className="space-y-5">
      <div className="h-5 w-64 animate-pulse rounded bg-[#EBEBEB]" />
      <FilterChipSkeleton count={5} />
      <TableSkeleton rows={8} columns={7} />
    </div>
  );
}
