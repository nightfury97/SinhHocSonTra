export default function MapSelectionCard({ selection }) {
  return (
    <div
      className="panel"
      style={{
        position: 'absolute',
        right: 16,
        top: 16,
        background: 'oklch(99% 0.006 90 / 0.93)',
        padding: 'var(--space-sm) var(--space-md)',
        width: 216,
        boxShadow: 'var(--shadow-whisper)',
      }}
    >
      <div className="eyebrow">ĐIỂM GHI NHẬN</div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-md)', fontWeight: 600, margin: 'var(--space-2xs) 0 var(--space-3xs)' }}>{selection.name}</div>
      <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-ink-2)', marginBottom: 'var(--space-xs)' }}>{selection.zone}</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-sm)', padding: 'var(--space-2xs) 0', borderTop: '1px solid var(--color-rule-2)' }}>
        <span style={{ color: 'var(--color-ink-2)' }}>Cá thể</span>
        <span className="eyebrow" style={{ letterSpacing: 0, color: 'var(--color-ink)' }}>{selection.count}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-sm)', padding: 'var(--space-2xs) 0', borderTop: '1px solid var(--color-rule-2)' }}>
        <span style={{ color: 'var(--color-ink-2)' }}>Lần cuối</span>
        <span className="eyebrow" style={{ letterSpacing: 0, color: 'var(--color-ink)' }}>{selection.last}</span>
      </div>
    </div>
  );
}
