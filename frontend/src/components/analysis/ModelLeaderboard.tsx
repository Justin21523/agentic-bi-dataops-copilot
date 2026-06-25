import { useTranslation } from 'react-i18next';
import type { ModelResult } from '../../api/types';

export function ModelLeaderboard({ models, selectedModelId, onSelect }: { models: ModelResult[]; selectedModelId?: string; onSelect: (model: ModelResult) => void }) {
  const { t } = useTranslation();
  return (
    <section className="content-panel">
      <h2>{t('analysis.modelLeaderboard')}</h2>
      <table>
        <thead>
          <tr>
            <th>{t('common.method')}</th>
            <th>{t('metrics.accuracy')}</th>
            <th>{t('metrics.macroF1')}</th>
          </tr>
        </thead>
        <tbody>
          {models.map((model) => (
            <tr key={model.model_id} className={model.model_id === selectedModelId ? 'selected' : undefined}>
              <td><button type="button" className="secondary compact-button" onClick={() => onSelect(model)}>{model.label}</button></td>
              <td className="metric-value">{model.accuracy?.toFixed(3)}</td>
              <td className="metric-value">{model.macro_f1?.toFixed(3)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
