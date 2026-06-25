import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { guideSteps, type GuideVisualType } from './guideSteps';

function GuideStepVisual({ type }: { type: GuideVisualType }) {
  return (
    <div className={`guide-visual ${type}`} aria-hidden="true">
      <span className="guide-dot d1" />
      <span className="guide-dot d2" />
      <span className="guide-dot d3" />
      <span className="guide-line l1" />
      <span className="guide-line l2" />
      <span className="guide-node n1" />
      <span className="guide-node n2" />
      <span className="guide-node n3" />
    </div>
  );
}

function findGuideTarget(anchor: string) {
  return document.querySelector(`[data-guide-anchor="${anchor}"]`) ?? document.querySelector(`[data-journey-anchor="${anchor}"]`);
}

export function DemoGuideAssistant() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [index, setIndex] = useState(0);
  const step = guideSteps[index];
  const progress = useMemo(() => ((index + 1) / guideSteps.length) * 100, [index]);

  useEffect(() => {
    if (!open) return;
    if (location.pathname !== step.route) {
      navigate(step.route);
      return;
    }
    let attempts = 0;
    const focusTarget = () => {
      attempts += 1;
      document.querySelectorAll('.guide-focus').forEach((node) => node.classList.remove('guide-focus'));
      const target = findGuideTarget(step.anchor);
      if (!target && attempts < 20) {
        timer = window.setTimeout(focusTarget, 180);
        return;
      }
      target?.classList.add('guide-focus');
      target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };
    let timer = window.setTimeout(focusTarget, 120);
    return () => window.clearTimeout(timer);
  }, [location.pathname, navigate, open, step]);

  useEffect(() => {
    if (!open || !playing) return;
    if (index === guideSteps.length - 1) {
      setPlaying(false);
      return;
    }
    const timer = window.setTimeout(() => setIndex((current) => Math.min(guideSteps.length - 1, current + 1)), 5600);
    return () => window.clearTimeout(timer);
  }, [index, open, playing]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
      if (event.key === 'ArrowLeft') setIndex((current) => Math.max(0, current - 1));
      if (event.key === 'ArrowRight') setIndex((current) => Math.min(guideSteps.length - 1, current + 1));
      if (event.code === 'Space') {
        event.preventDefault();
        setPlaying((value) => !value);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  const move = (next: number) => setIndex(Math.max(0, Math.min(guideSteps.length - 1, next)));
  const restart = () => {
    setIndex(0);
    setPlaying(true);
    setOpen(true);
  };

  return (
    <div className={`demo-guide-shell ${open ? 'open' : ''}`}>
      {!open && (
        <button className="guide-launch" data-testid="guide-launch" type="button" onClick={() => setOpen(true)}>
          {t('guide.launch')}
        </button>
      )}
      {open && (
        <aside className="demo-guide-panel" data-testid="guide-panel" aria-label={t('guide.ariaLabel')}>
          <div className="guide-panel-glow" aria-hidden="true" />
          <div className="guide-header">
            <div>
              <span className="brand-kicker">{t('guide.kicker')}</span>
              <strong>{t('guide.title')}</strong>
            </div>
            <button className="secondary compact-button" data-testid="guide-close" type="button" onClick={() => setOpen(false)}>{t('guide.close')}</button>
          </div>
          <div className="guide-progress" aria-label={t('guide.progressLabel')}>
            <span style={{ width: `${progress}%` }} />
          </div>
          <GuideStepVisual type={step.visualType} />
          <article className="guide-card">
            <div className="guide-card-meta">
              <span className="badge">{index + 1} / {guideSteps.length}</span>
              <span className="confidence-chip">{t(step.actionKey)}</span>
            </div>
            <h2>{t(step.titleKey)}</h2>
            <p>{t(step.bodyKey)}</p>
          </article>
          <div className="guide-step-map">
            {guideSteps.map((item, itemIndex) => (
              <button
                aria-label={`${itemIndex + 1}. ${t(item.titleKey)}`}
                className={itemIndex === index ? 'active' : itemIndex < index ? 'complete' : ''}
                data-testid={`guide-step-${item.key}`}
                key={item.key}
                onClick={() => move(itemIndex)}
                type="button"
              />
            ))}
          </div>
          <div className="guide-controls">
            <button className="secondary" data-testid="guide-prev" type="button" onClick={() => move(index - 1)} disabled={index === 0}>{t('guide.back')}</button>
            <button data-testid="guide-autoplay" type="button" onClick={() => setPlaying((value) => !value)}>{playing ? t('guide.pause') : t('guide.autoplay')}</button>
            <button data-testid="guide-next" type="button" onClick={() => move(index + 1)} disabled={index === guideSteps.length - 1}>{t('guide.next')}</button>
          </div>
          <button className="guide-restart" data-testid="guide-restart" type="button" onClick={restart}>{t('guide.restart')}</button>
        </aside>
      )}
    </div>
  );
}
