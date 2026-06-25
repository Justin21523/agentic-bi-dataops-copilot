import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { FeatureScore } from '../../api/types';

export function FeatureImportanceChart({ title, features }: { title: string; features?: FeatureScore[] }) {
  const rows = (features ?? []).slice(0, 14).map((feature) => ({
    feature: feature.feature,
    score: feature.score
  }));

  return (
    <section className="chart-panel">
      <h2>{title}</h2>
      <div className="recharts-panel compact-chart">
        <ResponsiveContainer>
          <BarChart data={rows} layout="vertical" margin={{ top: 8, right: 28, left: 80, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#d9e1e8" />
            <XAxis type="number" />
            <YAxis dataKey="feature" type="category" width={92} tick={{ fontSize: 12 }} />
            <Tooltip formatter={(value: number) => value.toFixed(4)} />
            <Bar dataKey="score" fill="#1696D2" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
