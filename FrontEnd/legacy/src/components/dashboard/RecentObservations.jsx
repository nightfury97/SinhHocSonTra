import { groupSwatch } from '../../theme.js';

export default function RecentObservations({ observations, onViewAll }) {
  return (
    <div className="panel">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-sm)' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)', fontWeight: 600 }}>Quan sát gần đây</div>
        <button onClick={onViewAll} className="btn-ghost btn">Xem tất cả →</button>
      </div>
      {observations.map((o, i) => {
        const [bg, fg] = o.featured ? ['var(--swatch-featured-bg)', 'var(--swatch-featured-fg)'] : groupSwatch(o.group);
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', padding: 'var(--space-sm) 0', borderTop: '1px solid var(--color-rule-2)' }}>
            <span
              style={{
                width: 38,
                height: 38,
                borderRadius: 'var(--radius-md)',
                flex: 'none',
                background: bg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--text-sm)',
                fontWeight: 600,
                color: fg,
              }}
            >
              {o.tag}
            </span>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 'var(--text-base)', fontWeight: 500 }}>{o.name}</div>
              <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-ink-2)' }}>{o.place} · {o.by}</div>
            </div>
            <span className="eyebrow" style={{ whiteSpace: 'nowrap', letterSpacing: 0 }}>{o.time}</span>
          </div>
        );
      })}
    </div>
  );
}
