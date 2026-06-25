import { useTranslation } from 'react-i18next';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { TopicSummary } from '../../api/types';

export function TopicBubbleChart({ data }: { data: TopicSummary[] }) {
  const { t } = useTranslation();
  return (
    <section className="chart-panel">
      <h2>{t('charts.topicDistribution')}</h2>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="topic_label" />
          <YAxis />
          <Tooltip labelFormatter={() => t('charts.topicDistribution')} />
          <Bar dataKey="song_count" fill="#2563eb" />
        </BarChart>
      </ResponsiveContainer>
    </section>
  );
}
