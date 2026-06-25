import { useTranslation } from 'react-i18next';
import type { ModelResult } from '../../api/types';

export function ModelExplanationPanel({ model }: { model?: ModelResult }) {
  const { t } = useTranslation();
  if (!model) return null;
  return (
    <section className="content-panel">
      <h2>{t('analysis.modelExplanation')}</h2>
      <div className="comparison-grid">
        <article className="analysis-card compact">
          <h2>{t('analysis.whatHappened')}</h2>
          <p>{model.label} reached {(model.accuracy * 100).toFixed(1)}% accuracy and {(model.macro_f1 * 100).toFixed(1)}% macro-F1 on the held-out split.</p>
          <div className="card-footer-note">{model.notes}</div>
        </article>
        <article className="analysis-card compact">
          <h2>{t('analysis.whyPrediction')}</h2>
          <div className="list-panel">
            {model.top_features.slice(0, 6).map((feature) => (
              <div key={feature.feature}>
                <strong>{feature.feature}</strong>
                <div className="progress-bar"><span style={{ width: `${Math.min(100, feature.score * 100)}%` }} /></div>
              </div>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}
