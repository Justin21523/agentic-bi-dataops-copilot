type Props = { label: string; value: string | number };

export function MetricCard({ label, value }: Props) {
  return (
    <article className="metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}
