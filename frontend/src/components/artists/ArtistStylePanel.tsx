import { StyleRadarChart } from '../charts/StyleRadarChart';

export function ArtistStylePanel({ data }: { data: Record<string, number> }) {
  return <StyleRadarChart data={data} />;
}
