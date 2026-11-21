export default function FeaturedSpecies({ onViewProfile }) {
  return (
    <div className="panel-dark" style={{ position: 'relative', overflow: 'hidden' }}>
      <div className="eyebrow" style={{ color: 'var(--color-ink-on-dark-2)' }}>LOÀI ƯU TIÊN BẢO TỒN</div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)', fontWeight: 600, margin: 'var(--space-xs) 0 var(--space-2xs)' }}>Voọc chà vá chân nâu</div>
      <div style={{ fontStyle: 'italic', fontFamily: 'var(--font-display)', color: 'var(--color-ink-on-dark-2)', fontSize: 'var(--text-base)' }}>Pygathrix nemaeus</div>
      <p style={{ fontSize: 'var(--text-sm)', lineHeight: 1.6, color: 'var(--color-ink-on-dark)', margin: 'var(--space-sm) 0 var(--space-md)', maxWidth: 340 }}>
        Loài linh trưởng đặc hữu Đông Dương, được mệnh danh "nữ hoàng linh trưởng". Sơn Trà là một trong những quần thể lớn nhất Việt Nam.
      </p>
      <div style={{ display: 'flex', gap: 'var(--space-lg)' }}>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xl)', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>~1.350</div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-ink-on-dark-2)' }}>cá thể ước tính</div>
        </div>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xl)', fontWeight: 600, color: 'var(--color-accent)' }}>EN</div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-ink-on-dark-2)' }}>Nguy cấp · IUCN</div>
        </div>
      </div>
      <button onClick={onViewProfile} className="btn btn-on-dark" style={{ marginTop: 'var(--space-md)' }}>
        Xem hồ sơ loài →
      </button>
      <span style={{ position: 'absolute', right: -40, bottom: -40, width: 160, height: 160, borderRadius: '50%', border: '1px solid oklch(94% 0.015 140 / 0.08)' }} />
      <span style={{ position: 'absolute', right: -10, bottom: -10, width: 90, height: 90, borderRadius: '50%', border: '1px solid oklch(94% 0.015 140 / 0.08)' }} />
    </div>
  );
}
