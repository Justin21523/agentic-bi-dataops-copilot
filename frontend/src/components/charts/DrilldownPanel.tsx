import { useTranslation } from 'react-i18next';
import type { Song } from '../../api/types';

type Props = {
  title: string;
  subtitle?: string;
  songs?: Song[];
  isLoading?: boolean;
  onClose: () => void;
};

export function DrilldownPanel({ title, subtitle, songs, isLoading, onClose }: Props) {
  const { t } = useTranslation();
  return (
    <aside className="drilldown-panel" aria-label={title}>
      <div className="drilldown-header">
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        <button type="button" className="secondary compact-button" onClick={onClose}>{t('common.close')}</button>
      </div>
      {isLoading && <p>{t('common.loading')}</p>}
      {!isLoading && !songs?.length && <p>{t('common.empty')}</p>}
      <div className="list-panel">
        {songs?.map((song) => (
          <article className="list-row" key={song.song_id}>
            <strong>{song.title}</strong>
            <span>{t('common.artist')}: {song.artist_name}</span>
            <span>{t('common.genre')}: {song.genre} · {t('common.year')}: {song.year}</span>
            <span>{t('common.languageField')}: {song.language} · {t('common.decade')}: {song.decade}</span>
            {song.predicted_genre && (
              <span>{t('common.predictedGenre')}: {song.predicted_genre} · {t('common.confidence')}: {song.prediction_confidence?.toFixed(2)}</span>
            )}
          </article>
        ))}
      </div>
    </aside>
  );
}
