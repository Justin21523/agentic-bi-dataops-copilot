import { useNavigate } from 'react-router-dom';
import type { AnalysisInsight } from '../../api/types';

const severityClass: Record<string, string> = {
  high: 'danger',
  warning: 'warning',
  medium: 'medium',
  info: 'success'
};

export function InsightCardGrid({ insights, selectable, selectedIds = [], onToggle }: { insights?: AnalysisInsight[]; selectable?: boolean; selectedIds?: string[]; onToggle?: (id: string) => void }) {
  const navigate = useNavigate();
  return (
    <div className="story-grid">
      {(insights ?? []).map((insight) => (
        <article className={`story-card ${severityClass[insight.severity] ?? 'medium'}`} key={insight.id}>
          <div className="story-card-header">
            {selectable ? (
              <input
                aria-label={`Select ${insight.title}`}
                checked={selectedIds.includes(insight.id)}
                onChange={() => onToggle?.(insight.id)}
                type="checkbox"
              />
            ) : null}
            <span className="badge">{insight.story_type}</span>
            <span className="confidence-chip">{insight.confidence}</span>
          </div>
          <h2>{insight.title}</h2>
          <p>{insight.summary}</p>
          <div className="evidence-row">
            {insight.evidence.map((item) => (
              <button className="evidence-chip" key={`${insight.id}-${item.label}`} onClick={() => navigate(`${item.route}#${item.anchor}`)} type="button">
                {item.label}: {String(item.value)}
              </button>
            ))}
          </div>
          <div className="next-action">{insight.next_action}</div>
        </article>
      ))}
    </div>
  );
}
