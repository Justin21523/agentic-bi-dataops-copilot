import { useTranslation } from 'react-i18next';
import type { SimilarSong } from '../../api/types';

export function SimilarSongList({ songs }: { songs: SimilarSong[] }) {
  const { t } = useTranslation();
  return (
    <div className="list-panel">
      {songs.map((song) => (
        <article key={song.similar_song_id} className="list-row">
          <strong>{song.title}</strong>
          <span>{song.artist_name}</span>
          <span>{t('common.score')}: {song.similarity_score.toFixed(2)}</span>
        </article>
      ))}
    </div>
  );
}
