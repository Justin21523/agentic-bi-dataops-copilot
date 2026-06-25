type Props = {
  activeKey: string;
};

const flowNodes = [
  { key: 'upload', label: 'Upload' },
  { key: 'clean', label: 'Clean' },
  { key: 'tfidf', label: 'TF-IDF' },
  { key: 'classification', label: 'Model' },
  { key: 'report', label: 'Report' }
];

export function JourneyDataFlow({ activeKey }: Props) {
  const activeIndex = Math.max(0, flowNodes.findIndex((node) => node.key === activeKey || (activeKey === 'tree' && node.key === 'classification') || (activeKey === 'cluster' && node.key === 'classification') || (activeKey === 'evaluate' && node.key === 'report')));
  return (
    <div className="journey-flow" aria-label="Animated data flow">
      <div className="journey-flow-line" />
      <span className="journey-particle p1" />
      <span className="journey-particle p2" />
      <span className="journey-particle p3" />
      {flowNodes.map((node, index) => (
        <div className={`journey-flow-node ${index <= activeIndex ? 'complete' : ''} ${index === activeIndex ? 'active' : ''}`} key={node.key}>
          <i />
          <span>{node.label}</span>
        </div>
      ))}
    </div>
  );
}

export function JourneyBeforeAfter({ activeKey }: Props) {
  const data: Record<string, { before: string; after: string; caption: string }> = {
    upload: { before: 'Local CSV files', after: 'Safe dataset_id', caption: 'Files become a session dataset without replacing sample data.' },
    inspect: { before: 'Unknown schema', after: 'Typed columns', caption: 'Schema and quality checks explain readiness.' },
    clean: { before: 'Missing values', after: 'Cleaning plan', caption: 'Cleaning previews the effect before modeling.' },
    tfidf: { before: 'Term counts', after: 'Weighted signals', caption: 'Distinctive terms become stronger model features.' },
    classification: { before: 'Majority baseline', after: 'Held-out models', caption: 'Models are compared after train-only vectorizer fitting.' },
    tree: { before: 'Black-box score', after: 'Decision path', caption: 'Tree splits show how terms route examples.' },
    cluster: { before: 'Many vectors', after: 'Interpretable groups', caption: 'Centroids and profiles explain each projected group.' },
    evaluate: { before: 'Predictions', after: 'Error pattern', caption: 'Confusion and per-class metrics show where results fail.' },
    report: { before: 'Charts', after: 'Evidence narrative', caption: 'The report ties metrics, caveats, and examples together.' }
  };
  const current = data[activeKey] ?? data.upload;
  return (
    <div className="journey-before-after">
      <div><strong>Before</strong><span>{current.before}</span></div>
      <b>→</b>
      <div><strong>After</strong><span>{current.after}</span></div>
      <p>{current.caption}</p>
    </div>
  );
}
