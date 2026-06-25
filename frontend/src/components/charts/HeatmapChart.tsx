import { useTranslation } from 'react-i18next';
import { formatNumber, intensityColor } from './chartUtils';

export type HeatmapCell = {
  row: string;
  column: string;
  value: number;
  label?: string;
  detail?: string;
  hue?: number;
};

type Props = {
  title: string;
  rows: string[];
  columns: string[];
  cells: HeatmapCell[];
  activeKey?: string;
  onCellClick?: (cell: HeatmapCell) => void;
};

const keyFor = (row: string, column: string) => `${row}::${column}`;

export function HeatmapChart({ title, rows, columns, cells, activeKey, onCellClick }: Props) {
  const { t } = useTranslation();
  const max = Math.max(0, ...cells.map((cell) => cell.value));
  const byKey = new Map(cells.map((cell) => [keyFor(cell.row, cell.column), cell]));

  return (
    <section className="chart-panel heatmap-panel">
      <h2>{title}</h2>
      <div className="heatmap" style={{ gridTemplateColumns: `minmax(110px, 1.15fr) repeat(${columns.length}, minmax(68px, 1fr))` }}>
        <div className="heatmap-corner" />
        {columns.map((column) => <div className="heatmap-label column-label" key={column}>{column}</div>)}
        {rows.map((row) => (
          <div className="heatmap-row" key={row}>
            <div className="heatmap-label row-label">{row}</div>
            {columns.map((column) => {
              const cell = byKey.get(keyFor(row, column)) ?? { row, column, value: 0 };
              const key = keyFor(row, column);
              return (
                <button
                  type="button"
                  className={`heatmap-cell ${activeKey === key ? 'selected-cell' : ''}`}
                  key={key}
                  onClick={() => onCellClick?.(cell)}
                  style={{ background: intensityColor(cell.value, max, cell.hue) }}
                  title={`${row} / ${column}: ${formatNumber(cell.value, 2)}${cell.detail ? ` · ${cell.detail}` : ''}`}
                >
                  <strong>{cell.label ?? formatNumber(cell.value, 1)}</strong>
                  <span>{cell.detail ?? t('common.song')}</span>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </section>
  );
}

export const heatmapKey = keyFor;
