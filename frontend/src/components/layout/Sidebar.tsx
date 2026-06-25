import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const links = [
  ['/', 'navigation.overview'],
  ['/stories', 'navigation.stories'],
  ['/workflow', 'navigation.workflow'],
  ['/lineage', 'navigation.lineage'],
  ['/ml-lab', 'navigation.mlLab'],
  ['/explainability', 'navigation.explainability'],
  ['/topics', 'navigation.topicExplorer'],
  ['/sentiment', 'navigation.sentimentTrends'],
  ['/artists', 'navigation.artistStyle'],
  ['/similar', 'navigation.similarSongs'],
  ['/genre-classifier', 'navigation.genreClassifier'],
  ['/timeline', 'navigation.culturalTimeline'],
  ['/evaluation', 'navigation.evaluation'],
  ['/reports', 'navigation.reports'],
  ['/licensing', 'navigation.licensing']
];

export function Sidebar() {
  const { t } = useTranslation();
  return (
    <nav className="top-nav" aria-label={t('a11y.primaryNavigation')}>
      {links.map(([to, key]) => (
        <NavLink key={to} to={to} className={({ isActive }) => (isActive ? 'active' : undefined)}>
          {t(key)}
        </NavLink>
      ))}
    </nav>
  );
}
