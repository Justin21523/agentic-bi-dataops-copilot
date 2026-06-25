import { useTranslation } from 'react-i18next';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { BucketMetric } from '../../api/types';

export function SentimentTrendChart({ data }: { data: BucketMetric[] }) {
  const { t } = useTranslation();
  return (
    <section className="chart-panel">
      <h2>{t('charts.sentimentTrend')}</h2>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="bucket" />
          <YAxis domain={[-1, 1]} />
          <Tooltip labelFormatter={(value) => `${t('common.year')}: ${value}`} />
          <Line type="monotone" dataKey="sentiment_score" stroke="#0f766e" strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </section>
  );
}
