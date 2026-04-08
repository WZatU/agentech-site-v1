type MetricCardProps = {
  label: string;
  value: string;
  delta: string;
};

export function MetricCard({ label, value, delta }: MetricCardProps) {
  return (
    <article className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-panel">
      <p className="text-sm text-slate">{label}</p>
      <p className="mt-4 text-3xl font-semibold text-white">{value}</p>
      <p className="mt-3 text-sm text-accent">{delta}</p>
    </article>
  );
}
