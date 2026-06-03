type Props = {
  label: string;
  value: string;
  hint?: string;
};

export function StatCard({ label, value, hint }: Props) {
  return (
    <div className="rounded-card border border-[#EBEBEB] bg-white p-4 shadow-soft">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-[#999999]">
        {label}
      </p>
      <p className="mt-1 text-[18px] font-semibold tabular-nums text-[#111111]">{value}</p>
      {hint ? <p className="mt-1 text-[12px] text-[#555555]">{hint}</p> : null}
    </div>
  );
}
