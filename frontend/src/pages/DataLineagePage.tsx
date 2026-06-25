import { useState } from 'react';
import { ExecutiveSummary } from '../components/analysis/ExecutiveSummary';
import { ErrorState } from '../components/common/ErrorState';
import { LoadingState } from '../components/common/LoadingState';
import { useLineageReplay } from '../hooks/useAnalysis';

function JsonPreview({ value }: { value: Record<string, unknown> }) {
  return <pre className="json-preview">{JSON.stringify(value, null, 2)}</pre>;
}

export function DataLineagePage() {
  const [songId, setSongId] = useState<string>();
  const lineage = useLineageReplay(songId);
  const [activeStep, setActiveStep] = useState<string>();
  if (lineage.isLoading) return <LoadingState />;
  if (lineage.isError || !lineage.data) return <ErrorState />;
  const data = lineage.data;
  const selectedStep = data.steps.find((step) => step.key === activeStep) ?? data.steps[0];
  return (
    <section className="page">
      <div data-guide-anchor="lineage-replay">
        <ExecutiveSummary
        title="Dataset Journey Replay"
        body="Follow one song from safe metadata through validation, cleaning, BoW, TF-IDF, topics, model prediction, and final report evidence."
        actions={[data.selected_song.title ?? data.selected_song.song_id, data.selected_song.genre ?? 'unknown genre', 'Pipeline replay']}
        />
      </div>
      <div className="filter-panel compact-filter">
        <label>
          <span>Track one song through the pipeline</span>
          <select value={data.selected_song.song_id} onChange={(event) => { setSongId(event.target.value); setActiveStep(undefined); }}>
            {data.song_options.map((song) => <option key={song.song_id} value={song.song_id}>{song.title} · {song.genre}</option>)}
          </select>
        </label>
      </div>
      <div className="lineage-layout">
        <section className="content-panel lineage-rail">
          <h2>Replay steps</h2>
          {data.steps.map((step, index) => (
            <button className={selectedStep.key === step.key ? 'lineage-step active' : 'lineage-step'} key={step.key} onClick={() => setActiveStep(step.key)} type="button">
              <span>{index + 1}</span>
              <strong>{step.label}</strong>
            </button>
          ))}
        </section>
        <section className="content-panel lineage-detail" data-guide-anchor="lineage-detail">
          <div className="lineage-animation" aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
          </div>
          <h2>{selectedStep.label}</h2>
          <p>{selectedStep.explanation}</p>
          <div className="two-column">
            <article className="analysis-card">
              <h2>Input</h2>
              <JsonPreview value={selectedStep.input} />
            </article>
            <article className="analysis-card">
              <h2>Output</h2>
              <JsonPreview value={selectedStep.output} />
            </article>
          </div>
          <div className="comparison-grid">
            <article className="analysis-card compact">
              <h2>Kept fields</h2>
              <div className="pill-row">{selectedStep.field_changes.kept.map((field) => <span className="badge" key={field}>{field}</span>)}</div>
            </article>
            <article className="analysis-card compact">
              <h2>Removed / excluded</h2>
              <div className="pill-row">{selectedStep.field_changes.removed.map((field) => <span className="badge warning" key={field}>{field}</span>)}</div>
            </article>
          </div>
        </section>
      </div>
    </section>
  );
}
