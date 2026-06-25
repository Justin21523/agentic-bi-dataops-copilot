type Explanation = {
  title?: string;
  what: string;
  how: string;
  why: string;
  caveat: string;
};

export function ExplanationPanel({ title = 'How to interpret this result', what, how, why, caveat }: Explanation) {
  const items = [
    ['What it shows', what],
    ['How to read', how],
    ['Why it matters', why],
    ['Caveat / next step', caveat]
  ];

  return (
    <section className="content-panel explanation-panel">
      <h2>{title}</h2>
      <div className="explanation-grid">
        {items.map(([label, body]) => (
          <article key={label}>
            <strong>{label}</strong>
            <p>{body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
