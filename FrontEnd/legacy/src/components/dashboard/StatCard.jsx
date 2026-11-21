export default function StatCard({ label, value, dot, trend, up }) {
  const trendColor = up === null ? 'var(--color-ink-2)' : up ? 'var(--status-lc-fg)' : 'var(--color-accent)';
  return (
    <div className="panel">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-ink-2)' }}>{label}</span>
        <span style={{ width: 9, height: 9, borderRadius: 3, background: dot }} />
      </div>
      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'var(--text-display)',
          fontWeight: 600,
          margin: 'var(--space-xs) 0 var(--space-3xs)',
          letterSpacing: '-0.02em',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value}
      </div>
      <div className="eyebrow" style={{ color: trendColor, letterSpacing: 0 }}>
        {trend}
      </div>
    </div>
  );
}
