import { useTranslation } from 'react-i18next';
import { HeatmapChart, heatmapKey, type HeatmapCell } from './HeatmapChart';

type ConfusionMatrix = {
  labels?: string[];
  matrix?: number[][];
};

type Props = {
  data?: ConfusionMatrix;
  activeKey?: string;
  onSelect: (selection: { genre: string; predicted_genre: string; title: string }) => void;
};

export function ConfusionMatrixHeatmap({ data, activeKey, onSelect }: Props) {
  const { t } = useTranslation();
  const labels = data?.labels ?? [];
  const cells: HeatmapCell[] = labels.flatMap((actual, rowIndex) =>
    labels.map((predicted, columnIndex) => ({
      row: actual,
      column: predicted,
      value: data?.matrix?.[rowIndex]?.[columnIndex] ?? 0,
      label: String(data?.matrix?.[rowIndex]?.[columnIndex] ?? 0),
      detail: actual === predicted ? t('charts.correctPrediction') : t('charts.misclassification'),
      hue: actual === predicted ? 165 : 18
    }))
  );

  return (
    <HeatmapChart
      title={t('pages.evaluation.confusionMatrix')}
      rows={labels}
      columns={labels}
      cells={cells}
      activeKey={activeKey}
      onCellClick={(cell) => onSelect({ genre: cell.row, predicted_genre: cell.column, title: `${cell.row} -> ${cell.column}` })}
    />
  );
}

export const confusionMatrixKey = (genre: string, predictedGenre: string) => heatmapKey(genre, predictedGenre);
