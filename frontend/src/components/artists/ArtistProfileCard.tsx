import { useTranslation } from 'react-i18next';
import type { Artist } from '../../api/types';

export function ArtistProfileCard({ artist }: { artist: Artist }) {
  const { t } = useTranslation();
  return (
    <article className="list-row">
      <strong>{artist.artist_name}</strong>
      <span>{t('common.year')}: {artist.active_start_year} - {artist.active_end_year ?? ''}</span>
    </article>
  );
}
