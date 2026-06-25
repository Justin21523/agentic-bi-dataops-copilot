import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { TopicDecade } from '../../api/types';
import { HeatmapChart, heatmapKey, type HeatmapCell } from './HeatmapChart';

type Props = {
  data: TopicDecade[];
  activeKey?: string;
  onSelect: (selection: { topic_id: number; decade: string; title: string }) => void;
};

export function DecadeTopicHeatmap({ data, activeKey, onSelect }: Props) {
  const { t } = useTranslation();
  const topics = useMemo(() => {
    const byTopic = new Map<string, { topic_id: number; topic_label: string; total: number }>();
    for (const item of data) {
      const current = byTopic.get(item.topic_label) ?? { topic_id: item.topic_id, topic_label: item.topic_label, total: 0 };
      current.total += item.song_count;
      byTopic.set(item.topic_label, current);
    }
    return Array.from(byTopic.values()).sort((a, b) => b.total - a.total).slice(0, 10);
  }, [data]);
  const decades = Array.from(new Set(data.map((item) => String(item.decade)))).sort();
  const topicIdByLabel = new Map(topics.map((topic) => [topic.topic_label, topic.topic_id]));
  const cells: HeatmapCell[] = data
    .filter((item) => topicIdByLabel.has(item.topic_label))
    .map((item) => ({
      row: item.topic_label,
      column: String(item.decade),
      value: item.song_count,
      label: String(item.song_count),
      detail: `${t('common.score')}: ${item.average_score.toFixed(2)}`,
      hue: 230
    }));

  return (
    <HeatmapChart
      title={t('charts.decadeTopicHeatmap')}
      rows={topics.map((topic) => topic.topic_label)}
      columns={decades}
      cells={cells}
      activeKey={activeKey}
      onCellClick={(cell) => {
        const topicId = topicIdByLabel.get(cell.row);
        if (topicId === undefined) return;
        onSelect({ topic_id: topicId, decade: cell.column, title: `${cell.row} / ${cell.column}` });
      }}
    />
  );
}

export const decadeTopicKey = (topicLabel: string, decade: string) => heatmapKey(topicLabel, decade);
