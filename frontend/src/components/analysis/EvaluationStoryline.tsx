type Confusion = { labels?: string[]; matrix?: number[][] };
type PerGenre = Record<string, { f1: number; precision: number; recall: number }>;
type RetrievalExample = { title: string; genre: string; matches: Array<{ title: string; genre: string; similarity_score: number }> };

export function EvaluationStoryline({ confusion, perGenre, badExamples }: { confusion?: Confusion; perGenre?: PerGenre; badExamples?: RetrievalExample[] }) {
  const labels = confusion?.labels ?? [];
  const mistakes = labels.flatMap((actual, rowIndex) =>
    labels.map((predicted, colIndex) => ({
      actual,
      predicted,
      count: actual === predicted ? 0 : confusion?.matrix?.[rowIndex]?.[colIndex] ?? 0
    }))
  ).sort((a, b) => b.count - a.count);
  const topMistake = mistakes[0];
  const weakest = Object.entries(perGenre ?? {}).sort(([, a], [, b]) => a.f1 - b.f1)[0];
  const example = badExamples?.[0];

  return (
    <section className="content-panel storyline-panel" data-journey-anchor="error-story">
      <div className="chart-heading-row">
        <h2>Error case storyline</h2>
        {topMistake && <span className="badge warning">{topMistake.actual} → {topMistake.predicted}</span>}
      </div>
      <div className="storyline-grid">
        <article>
          <strong>Most visible confusion</strong>
          <p>{topMistake && topMistake.count > 0 ? `${topMistake.actual} is most often predicted as ${topMistake.predicted} (${topMistake.count} cases).` : 'The current confusion matrix has no off-diagonal mistakes.'}</p>
        </article>
        <article>
          <strong>Weakest class signal</strong>
          <p>{weakest ? `${weakest[0]} has the lowest F1 (${weakest[1].f1}). Check whether this class needs more examples or clearer terms.` : 'Per-class metrics are unavailable.'}</p>
        </article>
        <article>
          <strong>Retrieval warning</strong>
          <p>{example ? `${example.title} has neighbors from ${example.matches.map((match) => match.genre).slice(0, 3).join(', ')}. Inspect shared terms before trusting similarity.` : 'No difficult retrieval examples are available.'}</p>
        </article>
        <article>
          <strong>Improve next</strong>
          <p>Add more examples for weak classes, review genre definitions, compare model families, and add terms that separate the confused pair.</p>
        </article>
      </div>
    </section>
  );
}
