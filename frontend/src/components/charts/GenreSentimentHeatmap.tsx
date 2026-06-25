import { useTranslation } from 'react-i18next';
import type { GenreSentiment } from '../../api/types';
import { HeatmapChart, heatmapKey, type HeatmapCell } from './HeatmapChart';

type SentimentLabel = 'negative' | 'neutral' | 'positive';

type Props = {
  data: GenreSentiment[];
  activeKey?: string;
  onSelect: (selection: { genre: string; sentiment_label: SentimentLabel; title: string }) => void;
};

const columns: SentimentLabel[] = ['negative', 'neutral', 'positive'];

export function GenreSentimentHeatmap({ data, activeKey, onSelect }: Props) {
  const { t } = useTranslation();
  const genres = Array.from(new Set(data.map((item) => item.genre))).sort();
  const totals = new Map<string, Record<SentimentLabel, number>>();
  for (const item of data) {
    const current = totals.get(item.genre) ?? { negative: 0, neutral: 0, positive: 0 };
    current.negative += item.negative_count ?? 0;
    current.neutral += item.neutral_count ?? 0;
    current.positive += item.positive_count ?? 0;
    totals.set(item.genre, current);
  }
  const cells: HeatmapCell[] = genres.flatMap((genre) => {
    const counts = totals.get(genre) ?? { negative: 0, neutral: 0, positive: 0 };
    const total = columns.reduce((sum, column) => sum + counts[column], 0);
    return columns.map((column) => {
      const ratio = total ? counts[column] / total : 0;
      return {
        row: genre,
        column,
        value: ratio,
        label: `${Math.round(ratio * 100)}%`,
        detail: `${counts[column]} songs`,
        hue: column === 'positive' ? 165 : column === 'neutral' ? 205 : 18
      };
    });
  });

  return (
    <HeatmapChart
      title={t('charts.genreSentimentHeatmap')}
      rows={genres}
      columns={columns}
      cells={cells}
      activeKey={activeKey}
      onCellClick={(cell) => {
        const sentiment = cell.column as SentimentLabel;
        onSelect({
          genre: cell.row,
          sentiment_label: sentiment,
          title: `${cell.row} / ${sentiment}`
        });
      }}
    />
  );
}

export const genreSentimentKey = (genre: string, sentiment: string) => heatmapKey(genre, sentiment);
