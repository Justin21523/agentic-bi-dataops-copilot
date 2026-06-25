import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ExecutiveSummary } from '../components/analysis/ExecutiveSummary';
import { LeakageAuditPanel } from '../components/analysis/LeakageAuditPanel';
import { ErrorState } from '../components/common/ErrorState';
import { LoadingState } from '../components/common/LoadingState';
import { useExplainabilityCenter } from '../hooks/useAnalysis';

export function ExplainabilityCenterPage() {
  const [songId, setSongId] = useState<string>();
  const explainability = useExplainabilityCenter(songId);
  if (explainability.isLoading) return <LoadingState />;
  if (explainability.isError || !explainability.data) return <ErrorState />;
  const data = explainability.data;
  const selectedFeatures = data.feature_comparison[0]?.top_features ?? [];
  return (
    <section className="page">
      <div data-guide-anchor="explainability-center">
        <ExecutiveSummary
          title="Model Explainability Center"
          body="Compare model evidence, inspect per-class behavior, and read disagreement/error cases from held-out evaluation before trusting predictions."
          actions={[data.mode, `Actual genre: ${data.actual_genre ?? 'n/a'}`, 'No raw lyrics displayed']}
        />
      </div>
      <div className="filter-panel compact-filter">
        <label>
          <span>Held-out song case</span>
          <select value={data.selected_song?.song_id ?? ''} onChange={(event) => setSongId(event.target.value)}>
            {data.heldout_options.map((song) => <option key={song.song_id} value={song.song_id}>{song.title} · {song.genre}</option>)}
          </select>
        </label>
      </div>
      <section className="content-panel">
        <h2>Feature importance comparison</h2>
        <div className="comparison-grid">
          {data.feature_comparison.map((model) => (
            <article className="analysis-card compact" key={model.model_id}>
              <h2>{model.label}</h2>
              <p>Accuracy {model.accuracy} · Macro-F1 {model.macro_f1}</p>
              <div className="list-panel">
                {model.top_features.slice(0, 5).map((feature) => (
                  <div key={`${model.model_id}-${feature.feature}`}>
                    <strong>{feature.feature}</strong>
                    <div className="progress-bar"><span style={{ width: `${Math.min(100, feature.score * 100)}%` }} /></div>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>
      <div className="two-column">
        <section className="chart-panel">
          <h2>Selected model top feature weights</h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={selectedFeatures} layout="vertical" margin={{ left: 70 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="feature" type="category" width={90} />
              <Tooltip />
              <Bar dataKey="score" fill="#1696D2" />
            </BarChart>
          </ResponsiveContainer>
        </section>
        <section className="content-panel" data-guide-anchor="model-disagreement">
          <h2>Model disagreement view</h2>
          <div className="list-panel">
            {data.model_disagreement.map((item) => (
              <article className="list-row" key={item.model_id}>
                <strong>{item.label}</strong>
                <span>{item.prediction}</span>
                <span className={`badge ${item.matches_actual ? 'success' : 'warning'}`}>{item.matches_actual ? 'matches actual' : 'disagrees'}</span>
              </article>
            ))}
          </div>
        </section>
      </div>
      <section className="content-panel">
        <h2>Per-class explanation</h2>
        <div className="comparison-grid">
          {data.per_class.map((item) => (
            <article className="analysis-card compact" key={item.label}>
              <h2>{item.label}</h2>
              <p>F1 {item.metrics.f1 ?? 0} · Support {item.metrics.support ?? 0}</p>
              <div className="pill-row">{item.top_terms.slice(0, 4).map((term) => <span className="badge" key={`${item.label}-${term.term}`}>{term.term}</span>)}</div>
              <div className="card-footer-note">Confused with {item.confused_with.map((target) => `${target.predicted} (${target.count})`).join(', ') || 'none'}</div>
            </article>
          ))}
        </div>
      </section>
      <section className="content-panel">
        <h2>Error explanation</h2>
        <div className="list-panel">
          {data.error_explanations.slice(0, 6).map((item) => (
            <article className="list-row" key={item.song.song_id}>
              <strong>{item.song.title}</strong>
              <span>Actual: {item.actual}</span>
              <span>{Object.entries(item.predictions).map(([model, prediction]) => `${model}: ${prediction}`).join(' · ')}</span>
            </article>
          ))}
        </div>
      </section>
      <LeakageAuditPanel audit={data.leakage_audit} />
    </section>
  );
}
