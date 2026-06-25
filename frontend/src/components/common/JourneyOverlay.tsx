import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { JourneyBeforeAfter, JourneyDataFlow } from './JourneyDataFlow';

type JourneyStep = {
  key: string;
  label: string;
  route: string;
  anchor: string;
  title: string;
  body: string;
};

const steps: JourneyStep[] = [
  { key: 'upload', label: 'Upload', route: '/workflow', anchor: 'upload', title: 'Start with a safe dataset', body: 'The platform accepts derived metadata and BoW feature files, then falls back to sample data when nothing is uploaded.' },
  { key: 'inspect', label: 'Inspect', route: '/workflow', anchor: 'inspect', title: 'Inspect schema and data quality', body: 'Column types, missing values, duplicates, and category balance explain whether the dataset is ready for analysis.' },
  { key: 'clean', label: 'Clean', route: '/workflow', anchor: 'clean', title: 'Clean before modeling', body: 'The cleaning preview shows what changes before analysis starts, without exposing raw protected lyrics.' },
  { key: 'tfidf', label: 'TF-IDF', route: '/ml-lab', anchor: 'tfidf', title: 'Convert text signals into weighted terms', body: 'TF-IDF raises distinctive terms and reduces generic terms, producing vectors for clustering and classification.' },
  { key: 'classification', label: 'Models', route: '/ml-lab', anchor: 'classification', title: 'Compare models on held-out data', body: 'The model lab uses train-only vectorizer fitting, then evaluates classifiers on a held-out split to avoid data leakage.' },
  { key: 'tree', label: 'Tree', route: '/ml-lab', anchor: 'tree', title: 'Read the decision path', body: 'Tree nodes split from top to bottom. Depth color, branch labels, samples, and class bars explain each decision.' },
  { key: 'cluster', label: 'Clusters', route: '/ml-lab', anchor: 'cluster', title: 'See how songs group together', body: 'Projection points show relative distance in compressed TF-IDF space; centroid and profile cards explain each group.' },
  { key: 'evaluate', label: 'Evaluate', route: '/evaluation', anchor: 'evaluation', title: 'Validate the result', body: 'Evaluation charts show accuracy, confusion, per-class behavior, retrieval quality, and leakage audit status.' },
  { key: 'report', label: 'Report', route: '/evaluation', anchor: 'report', title: 'Turn analysis into a report', body: 'The final view combines visual evidence, caveats, and metadata-only drilldowns for an explainable report.' }
];

export function JourneyOverlay() {
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [index, setIndex] = useState(0);
  const step = steps[index];
  const progress = useMemo(() => ((index + 1) / steps.length) * 100, [index]);

  useEffect(() => {
    if (!open) return;
    if (location.pathname !== step.route) {
      navigate(step.route);
      return;
    }
    const timer = window.setTimeout(() => {
      document.querySelectorAll('.journey-focus').forEach((node) => node.classList.remove('journey-focus'));
      const target = document.querySelector(`[data-journey-anchor="${step.anchor}"]`);
      target?.classList.add('journey-focus');
      target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 120);
    return () => window.clearTimeout(timer);
  }, [location.pathname, navigate, open, step]);

  useEffect(() => {
    if (!open || !playing) return;
    const timer = window.setTimeout(() => setIndex((current) => Math.min(steps.length - 1, current + 1)), 5200);
    if (index === steps.length - 1) setPlaying(false);
    return () => window.clearTimeout(timer);
  }, [index, open, playing]);

  const move = (next: number) => setIndex(Math.max(0, Math.min(steps.length - 1, next)));

  return (
    <div className={`journey-shell ${open ? 'open' : ''}`}>
      {!open && <button className="journey-launch" type="button" onClick={() => setOpen(true)}>Data Journey</button>}
      {open && (
        <aside className="journey-overlay" aria-label="Data journey guide">
          <div className="journey-orbit" aria-hidden="true">
            <span /><span /><span /><span />
          </div>
          <div className="journey-header">
            <strong>Pipeline journey</strong>
            <button className="secondary compact-button" type="button" onClick={() => setOpen(false)}>Close</button>
          </div>
          <div className="journey-progress"><span style={{ width: `${progress}%` }} /></div>
          <JourneyDataFlow activeKey={step.key} />
          <div className="journey-tabs">
            {steps.map((item, itemIndex) => (
              <button className={itemIndex === index ? 'active' : ''} key={item.key} type="button" onClick={() => move(itemIndex)}>{item.label}</button>
            ))}
          </div>
          <article className="journey-card">
            <span className="badge">{index + 1} / {steps.length}</span>
            <h2>{step.title}</h2>
            <p>{step.body}</p>
          </article>
          <JourneyBeforeAfter activeKey={step.key} />
          <div className="journey-controls">
            <button className="secondary" type="button" onClick={() => move(index - 1)} disabled={index === 0}>Back</button>
            <button type="button" onClick={() => setPlaying((value) => !value)}>{playing ? 'Pause' : 'Autoplay'}</button>
            <button type="button" onClick={() => move(index + 1)} disabled={index === steps.length - 1}>Next</button>
          </div>
        </aside>
      )}
    </div>
  );
}
