import { useTranslation } from 'react-i18next';
import type { Song } from '../../api/types';

export function SongResultCard({ song, onSelect }: { song: Song; onSelect?: (song: Song) => void }) {
  const { t } = useTranslation();
  return (
    <button className="result-card" type="button" onClick={() => onSelect?.(song)}>
      <strong>{song.title}</strong>
      <span>{t('common.artist')}: {song.artist_name}</span>
      <span>{t('common.genre')}: {song.genre} · {t('common.year')}: {song.year}</span>
    </button>
  );
}
