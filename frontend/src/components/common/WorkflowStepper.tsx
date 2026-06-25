import { useTranslation } from 'react-i18next';
import type { WorkflowStepStatus } from '../../api/types';

const defaultSteps: Array<{ key: string; labelKey: string; descriptionKey: string; status: WorkflowStepStatus }> = [
  { key: 'upload', labelKey: 'workflow.upload', descriptionKey: 'workflow.uploadDescription', status: 'complete' },
  { key: 'inspect', labelKey: 'workflow.inspect', descriptionKey: 'workflow.inspectDescription', status: 'complete' },
  { key: 'clean', labelKey: 'workflow.clean', descriptionKey: 'workflow.cleanDescription', status: 'active' },
  { key: 'analyze', labelKey: 'workflow.analyze', descriptionKey: 'workflow.analyzeDescription', status: 'pending' },
  { key: 'visualize', labelKey: 'workflow.visualize', descriptionKey: 'workflow.visualizeDescription', status: 'pending' }
];

export function WorkflowStepper({ steps }: { steps?: Array<{ step: string; status: WorkflowStepStatus }> }) {
  const { t } = useTranslation();
  const statusByStep = new Map(steps?.map((item) => [item.step, item.status]));
  return (
    <section className="workflow-strip" aria-label={t('workflow.title')}>
      <div>
        <strong>{t('workflow.title')}</strong>
        <p>{t('workflow.subtitle')}</p>
      </div>
      <div className="workflow-steps">
        {defaultSteps.map((step) => {
          const status = statusByStep.get(step.key) ?? step.status;
          return (
            <article className={`workflow-step ${status}`} key={step.key}>
              <strong>{t(step.labelKey)}</strong>
              <span>{t(step.descriptionKey)}</span>
            </article>
          );
        })}
      </div>
    </section>
  );
}
