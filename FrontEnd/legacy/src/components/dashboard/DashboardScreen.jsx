import StatCard from './StatCard.jsx';
import PopulationChart from './PopulationChart.jsx';
import EnvMonitoring from './EnvMonitoring.jsx';
import RecentObservations from './RecentObservations.jsx';
import FeaturedSpecies from './FeaturedSpecies.jsx';
import { STATS, POP_BARS, ENV_STATIONS, OBSERVATIONS } from '../../data/dashboard.js';

export default function DashboardScreen({ onGoEntry, onGoVooc }) {
  return (
    <section
      data-screen-label="Tổng quan"
      style={{ padding: 'var(--space-lg) clamp(var(--space-md), 4vw, var(--space-lg)) var(--space-xl)', maxWidth: 1240 }}
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(210px,100%),1fr))', gap: 'var(--space-md)' }}>
        {STATS.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>

      <div className="stack-mobile" style={{ display: 'grid', gridTemplateColumns: '1.55fr 1fr', gap: 'var(--space-md)', marginTop: 'var(--space-md)' }}>
        <PopulationChart bars={POP_BARS} />
        <EnvMonitoring stations={ENV_STATIONS} />
      </div>

      <div className="stack-mobile" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)', marginTop: 'var(--space-md)' }}>
        <RecentObservations observations={OBSERVATIONS} onViewAll={onGoEntry} />
        <FeaturedSpecies onViewProfile={onGoVooc} />
      </div>
    </section>
  );
}
