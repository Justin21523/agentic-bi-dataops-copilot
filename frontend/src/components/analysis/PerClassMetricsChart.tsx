import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

type Metrics = Record<string, { precision: number; recall: number; f1: number; support?: number }>;

export function PerClassMetricsChart({ metrics, title = 'Per-class evaluation' }: { metrics?: Metrics; title?: string }) {
  const rows = Object.entries(metrics ?? {}).map(([genre, values]) => ({
    genre,
    precision: values.precision,
    recall: values.recall,
    f1: values.f1,
    support: values.support ?? 0
  }));

  return (
    <section className="chart-panel">
      <h2>{title}</h2>
      <div className="recharts-panel">
        <ResponsiveContainer>
          <BarChart data={rows} margin={{ top: 8, right: 18, left: 0, bottom: 40 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#d9e1e8" />
            <XAxis dataKey="genre" angle={-24} textAnchor="end" interval={0} height={64} tick={{ fontSize: 12 }} />
            <YAxis domain={[0, 1]} tickFormatter={(value) => `${Math.round(Number(value) * 100)}%`} />
            <Tooltip formatter={(value: number) => value.toFixed(3)} />
            <Legend />
            <Bar dataKey="precision" fill="#1696D2" radius={[4, 4, 0, 0]} />
            <Bar dataKey="recall" fill="#FDBF11" radius={[4, 4, 0, 0]} />
            <Bar dataKey="f1" name="F1" fill="#55B748" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
