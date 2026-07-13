import { TableSkeleton } from "@/components/ui/TableSkeleton";

export default function PortalLoading() {
  return (
    <div className="space-y-5">
      <div className="h-6 w-48 animate-pulse rounded bg-line" />
      <TableSkeleton rows={6} columns={6} />
    </div>
  );
}
