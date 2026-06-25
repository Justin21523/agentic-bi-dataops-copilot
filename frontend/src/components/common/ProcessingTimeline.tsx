import type { PipelineStep } from '../../api/types';

const fallbackSteps: PipelineStep[] = [
  { step: 'validation', label: 'Validation', status: 'pending', duration_ms: 0, outputs: [], metrics: {}, message: 'Checking files and schema.' },
  { step: 'cleaning', label: 'Cleaning', status: 'pending', duration_ms: 0, outputs: [], metrics: {}, message: 'Preparing safe derived columns.' },
  { step: 'feature_generation', label: 'Feature generation', status: 'pending', duration_ms: 0, outputs: [], metrics: {}, message: 'Building TF-IDF, topics, similarity, and predictions.' },
  { step: 'training', label: 'Training', status: 'pending', duration_ms: 0, outputs: [], metrics: {}, message: 'Training and evaluating models.' },
  { step: 'evaluation', label: 'Evaluation', status: 'pending', duration_ms: 0, outputs: [], metrics: {}, message: 'Writing quality and evaluation reports.' }
];

export function ProcessingTimeline({ steps, suggestions = [], running = false }: { steps?: PipelineStep[]; suggestions?: string[]; running?: boolean }) {
  const rows = steps?.length ? steps : fallbackSteps.map((step, index) => ({ ...step, status: running && index === 0 ? 'running' as const : step.status }));
  return (
    <section className="processing-timeline" aria-label="Processing timeline">
      {rows.map((step, index) => (
        <article className={`pipeline-step ${step.status}`} key={`${step.step}-${index}`}>
          <span className="pipeline-index">{index + 1}</span>
          <div>
            <strong>{step.label}</strong>
            <p>{step.message}</p>
            <div className="pipeline-meta">
              <span>{step.duration_ms ? `${step.duration_ms} ms` : step.status}</span>
              {step.outputs.map((output) => <span key={output}>{output}</span>)}
              {Object.entries(step.metrics).map(([key, value]) => <span key={key}>{key}: {String(value)}</span>)}
            </div>
          </div>
        </article>
      ))}
      {suggestions.length > 0 && (
        <div className="pipeline-suggestions">
          <strong>Fix suggestions</strong>
          {suggestions.map((suggestion) => <p key={suggestion}>{suggestion}</p>)}
        </div>
      )}
    </section>
  );
}
