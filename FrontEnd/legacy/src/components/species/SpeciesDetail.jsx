import { statusStyle, groupSwatch } from '../../theme.js';

export default function SpeciesDetail({ species }) {
  const [statusBg, statusFg] = statusStyle(species.statusShort);
  const [thumbBg, thumbFg] = species.featured ? ['var(--swatch-featured-bg)', 'var(--swatch-featured-fg)'] : groupSwatch(species.group);

  return (
    <div style={{ width: 340, flex: 'none', padding: 'var(--space-lg)', background: 'var(--color-paper-3)' }}>
      <div
        style={{
          height: 150,
          borderRadius: 'var(--radius-lg)',
          background: thumbBg,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 'var(--space-2xs)',
          marginBottom: 'var(--space-md)',
        }}
      >
        <span className="eyebrow" style={{ color: thumbFg, letterSpacing: 0 }}>◇ ảnh loài — {species.tag}</span>
        <span className="eyebrow" style={{ letterSpacing: 0 }}>thả ảnh thực địa vào đây</span>
      </div>
      <span className="badge" style={{ background: statusBg, color: statusFg, marginBottom: 'var(--space-xs)' }}>{species.status}</span>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)', fontWeight: 600, lineHeight: 1.15, marginTop: 'var(--space-xs)' }}>{species.name}</div>
      <div style={{ fontStyle: 'italic', fontFamily: 'var(--font-display)', color: 'var(--color-ink-2)', fontSize: 'var(--text-base)', marginBottom: 'var(--space-sm)' }}>{species.sci}</div>
      <p style={{ fontSize: 'var(--text-sm)', lineHeight: 1.65, color: 'var(--color-ink)', margin: '0 0 var(--space-md)' }}>{species.desc}</p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-xs)', marginBottom: 'var(--space-md)' }}>
        <div className="panel" style={{ padding: 'var(--space-sm)' }}>
          <div className="eyebrow">LỚP</div>
          <div style={{ fontSize: 'var(--text-base)', fontWeight: 500, marginTop: 'var(--space-3xs)' }}>{species.group}</div>
        </div>
        <div className="panel" style={{ padding: 'var(--space-sm)' }}>
          <div className="eyebrow">GHI NHẬN</div>
          <div style={{ fontSize: 'var(--text-base)', fontWeight: 500, marginTop: 'var(--space-3xs)' }}>{species.count}</div>
        </div>
      </div>
      <div className="eyebrow" style={{ marginBottom: 'var(--space-xs)' }}>SINH CẢNH</div>
      <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-ink)', marginBottom: 'var(--space-md)' }}>{species.habitat}</div>
      <div className="eyebrow" style={{ marginBottom: 'var(--space-xs)' }}>MỐI ĐE DỌA</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-xs)' }}>
        {species.threats.map((t) => (
          <span key={t} style={{ fontSize: 'var(--text-sm)', padding: 'var(--space-2xs) var(--space-sm)', borderRadius: 'var(--radius-sm)', background: 'var(--tag-hazard-bg)', color: 'var(--tag-hazard-fg)' }}>
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}
