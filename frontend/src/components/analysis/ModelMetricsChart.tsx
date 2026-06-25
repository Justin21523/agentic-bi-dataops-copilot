import { Bar, BarChart, CartesianGrid, Cell, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { ModelResult } from '../../api/types';

type Props = {
  models: ModelResult[];
  baselineAccuracy?: number;
  selectedModelId?: string;
  onSelect?: (model: ModelResult) => void;
};

export function ModelMetricsChart({ models, baselineAccuracy, selectedModelId, onSelect }: Props) {
  const rows = models.map((model) => ({
    id: model.model_id,
    label: model.label.replace(' Classifier', ''),
    accuracy: model.accuracy,
    macro_f1: model.macro_f1,
    model
  }));

  return (
    <section className="chart-panel">
      <div className="chart-heading-row">
        <h2>Model comparison</h2>
        {baselineAccuracy !== undefined && <span className="badge">Baseline {baselineAccuracy.toFixed(3)}</span>}
      </div>
      <div className="recharts-panel tall">
        <ResponsiveContainer>
          <BarChart data={rows} margin={{ top: 10, right: 24, left: 0, bottom: 54 }} onClick={(state) => state?.activePayload?.[0]?.payload?.model && onSelect?.(state.activePayload[0].payload.model)}>
            <CartesianGrid strokeDasharray="3 3" stroke="#d9e1e8" />
            <XAxis dataKey="label" angle={-28} textAnchor="end" interval={0} height={80} tick={{ fontSize: 12 }} />
            <YAxis domain={[0, 1]} tickFormatter={(value) => `${Math.round(Number(value) * 100)}%`} />
            <Tooltip formatter={(value: number) => value.toFixed(3)} />
            <Legend />
            <Bar dataKey="accuracy" name="Accuracy" radius={[4, 4, 0, 0]}>
              {rows.map((row) => <Cell key={`acc-${row.id}`} fill={row.id === selectedModelId ? '#EC008B' : '#1696D2'} />)}
            </Bar>
            <Bar dataKey="macro_f1" name="Macro-F1" fill="#55B748" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
