type Props = {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
};

export function ChartCard({ title, description, children, className = "" }: Props) {
  return (
    <div
      className={`rounded-card border border-[#EBEBEB] bg-white p-4 shadow-soft ${className}`}
    >
      <h2 className="text-[13px] font-semibold text-[#111111]">{title}</h2>
      {description ? (
        <p className="mt-0.5 text-[12px] text-[#999999]">{description}</p>
      ) : null}
      <div className="mt-3 h-[220px] w-full">{children}</div>
    </div>
  );
}
