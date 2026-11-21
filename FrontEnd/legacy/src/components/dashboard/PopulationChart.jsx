export default function PopulationChart({ bars }) {
  return (
    <div className="panel">
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-2xs)' }}>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)', fontWeight: 600 }}>Quần thể Voọc chà vá chân nâu</div>
          <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-ink-2)' }}>Ước tính số cá thể ghi nhận theo năm</div>
        </div>
        <div className="eyebrow" style={{ color: 'var(--status-lc-fg)', letterSpacing: 0 }}>↗ +28,6% từ 2019</div>
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: 'var(--space-sm)',
          height: 186,
          marginTop: 'var(--space-lg)',
          paddingBottom: 'var(--space-lg)',
          borderBottom: '1px solid var(--color-rule-2)',
          position: 'relative',
        }}
      >
        {bars.map((b, i) => (
          <div
            key={b.year}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%', position: 'relative' }}
          >
            <span className="eyebrow" style={{ color: 'var(--color-ink)', marginBottom: 'var(--space-2xs)', letterSpacing: 0, fontVariantNumeric: 'tabular-nums' }}>
              {b.val}
            </span>
            <div
              style={{
                width: '100%',
                maxWidth: 46,
                height: b.h,
                borderRadius: '7px 7px 3px 3px',
                background: b.peak ? 'var(--color-accent)' : 'var(--color-accent-2)',
                opacity: b.peak ? 1 : 0.3 + (0.5 * i) / (bars.length - 1),
              }}
            />
            <span className="eyebrow" style={{ position: 'absolute', bottom: -24, letterSpacing: 0 }}>{b.year}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
