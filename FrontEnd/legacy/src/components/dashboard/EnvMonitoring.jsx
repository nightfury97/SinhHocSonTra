import { envLevelColor } from '../../data/dashboard.js';

export default function EnvMonitoring({ stations }) {
  return (
    <div className="panel">
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)', fontWeight: 600 }}>Quan trắc môi trường</div>
      <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-ink-2)', marginBottom: 'var(--space-md)' }}>Chỉ số trung bình 24 giờ qua</div>
      {stations.map((e) => {
        const color = envLevelColor(e.level);
        return (
          <div key={e.name} style={{ marginBottom: 'var(--space-md)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 'var(--space-xs)' }}>
              <span style={{ fontSize: 'var(--text-sm)' }}>{e.name}</span>
              <span className="eyebrow" style={{ color, letterSpacing: 0 }}>{e.rating}</span>
            </div>
            <div style={{ height: 6, borderRadius: 5, background: 'var(--color-rule-2)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: e.w, borderRadius: 5, background: color }} />
            </div>
            <div className="eyebrow" style={{ marginTop: 'var(--space-2xs)', letterSpacing: 0 }}>{e.metric}</div>
          </div>
        );
      })}
    </div>
  );
}
