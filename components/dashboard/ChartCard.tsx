type Props = {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
};

export function ChartCard({ title, description, children, className = "" }: Props) {
  return (
    <div
      className={`rounded-card border border-line bg-white p-4 shadow-soft ${className}`}
    >
      <h2 className="text-fs13 font-medium text-ink">{title}</h2>
      {description ? (
        <p className="mt-0.5 text-fs12 text-muted">{description}</p>
      ) : null}
      <div className="mt-3 h-[220px] w-full">{children}</div>
    </div>
  );
}
