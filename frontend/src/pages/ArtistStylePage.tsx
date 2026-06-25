import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { lyricsApi } from '../api/lyricsApi';
import type { Artist } from '../api/types';
import { ArtistStyleDeepDive } from '../components/artists/ArtistStyleDeepDive';
import { ArtistProfileCard } from '../components/artists/ArtistProfileCard';
import { ArtistStylePanel } from '../components/artists/ArtistStylePanel';
import { ArtistNetworkGraph } from '../components/charts/ArtistNetworkGraph';
import { ArtistClusterScatter } from '../components/charts/ArtistClusterScatter';
import { DrilldownPanel } from '../components/charts/DrilldownPanel';
import { ErrorState } from '../components/common/ErrorState';
import { ExplanationPanel } from '../components/common/ExplanationPanel';
import { FilterPanel } from '../components/common/FilterPanel';
import { SongSearchBox } from '../components/songs/SongSearchBox';
import { useArtistStyleClusters, useDrilldownSongs } from '../hooks/useAnalytics';
import { useUrlFilters } from '../hooks/useUrlFilters';

export function ArtistStylePage() {
  const { t } = useTranslation();
  const { filters, setFilter, resetFilters } = useUrlFilters();
  const [q, setQ] = useState('Sample');
  const [artist, setArtist] = useState<Artist | null>(null);
  const [clusterSelection, setClusterSelection] = useState<{ artist_id: string; title: string }>();
  const artists = useQuery({ queryKey: ['artists', q], queryFn: () => lyricsApi.searchArtists(q) });
  const style = useQuery({ queryKey: ['artist-style', artist?.artist_id], queryFn: () => lyricsApi.artistStyle(artist?.artist_id ?? ''), enabled: Boolean(artist) });
  const clusters = useArtistStyleClusters(filters);
  const drilldown = useDrilldownSongs(clusterSelection ? { ...filters, artist_id: clusterSelection.artist_id } : undefined);
  useEffect(() => {
    if (!artist && artists.data?.length) {
      setArtist(artists.data[0]);
    }
  }, [artist, artists.data]);
  if (artists.isError) return <ErrorState />;
  return (
    <section className="page">
      <FilterPanel filters={filters} setFilter={setFilter} resetFilters={resetFilters} />
      <SongSearchBox onSearch={setQ} placeholderKey="pages.artist.searchPlaceholder" />
      <div className="analytics-layout">
        <div className="analytics-main">
          <ArtistNetworkGraph data={clusters.data ?? []} />
          <ArtistClusterScatter
            data={clusters.data ?? []}
            activeArtistId={clusterSelection?.artist_id}
            onSelect={setClusterSelection}
          />
          <div className="two-column">
            <div className="list-panel">{artists.data?.map((item) => <button className="result-card" key={item.artist_id} onClick={() => setArtist(item)}>{item.artist_name}</button>)}</div>
            <div>
              {artist && <section className="content-panel"><h2>{t('pages.artist.profile')}</h2><ArtistProfileCard artist={artist} /></section>}
              {style.data && <div data-guide-anchor="artist-fingerprint"><ArtistStylePanel data={style.data.fingerprint} /></div>}
            </div>
          </div>
          {style.data && (
            <ArtistStyleDeepDive
              fingerprint={style.data.fingerprint}
              artistId={artist?.artist_id}
              clusters={clusters.data ?? []}
            />
          )}
          <ExplanationPanel
            title="Artist style interpretation"
            what="The style view compares artist-level topic diversity, sentiment intensity, genre consistency, complexity, and uniqueness."
            how="Use the scatter to locate peer clusters, then read fingerprint bars against cluster averages."
            why="This shows whether an artist is genre-focused, cross-style, or unusually distinctive."
            caveat="The fingerprint is derived from metadata and feature vectors, not complete lyrics."
          />
        </div>
        {clusterSelection && (
          <DrilldownPanel
            title={clusterSelection.title}
            subtitle={t('charts.drilldownSubtitle')}
            songs={drilldown.data}
            isLoading={drilldown.isLoading}
            onClose={() => setClusterSelection(undefined)}
          />
        )}
      </div>
    </section>
  );
}
