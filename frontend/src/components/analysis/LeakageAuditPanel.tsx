export function LeakageAuditPanel({ audit }: { audit?: Record<string, unknown> }) {
  const status = String(audit?.status ?? 'unknown');
  const passed = status === 'pass';
  const items = Object.entries(audit ?? {}).filter(([key]) => key !== 'status');

  return (
    <section className="chart-panel">
      <div className="chart-heading-row">
        <h2>Leakage audit</h2>
        <span className={`badge ${passed ? 'success' : 'warning'}`}>{status}</span>
      </div>
      <div className="audit-grid">
        {items.map(([key, value]) => (
          <article className="audit-item" key={key}>
            <span>{key.split('_').join(' ')}</span>
            <strong>{String(value)}</strong>
          </article>
        ))}
      </div>
      <p className="chart-note">TF-IDF is fit on the training split before test transformation; demo inference uses a separate full-data pipeline and is labeled as demo-only.</p>
    </section>
  );
}
