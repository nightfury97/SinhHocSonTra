const CHECK_ICON = (
  <svg width="10" height="10" viewBox="0 0 10 10" stroke="var(--color-paper-2)" strokeWidth="1.8" fill="none">
    <path d="M2 5.2l2 2 4-4.4" />
  </svg>
);

export default function MapFilterPanel({ filters }) {
  return (
    <div style={{ width: 270, flex: 'none', borderRight: '1px solid var(--color-rule)', background: 'var(--color-paper-3)', padding: 'var(--space-md)', overflowY: 'auto' }}>
      <div className="eyebrow" style={{ marginBottom: 'var(--space-sm)' }}>NHÓM LOÀI</div>
      {filters.map((f) => (
        <label key={f.label} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)', padding: 'var(--space-xs) 0', fontSize: 'var(--text-base)', cursor: 'pointer' }}>
          <span
            style={{
              width: 16,
              height: 16,
              borderRadius: 5,
              border: `1.5px solid ${f.color}`,
              background: f.color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {CHECK_ICON}
          </span>
          <span style={{ flex: 1 }}>{f.label}</span>
          <span className="eyebrow" style={{ letterSpacing: 0, fontVariantNumeric: 'tabular-nums' }}>{f.count}</span>
        </label>
      ))}
      <hr className="divider" style={{ margin: 'var(--space-md) 0' }} />
      <div className="eyebrow" style={{ marginBottom: 'var(--space-sm)' }}>LỚP DỮ LIỆU</div>
      <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)', padding: 'var(--space-xs) 0', fontSize: 'var(--text-base)', cursor: 'pointer' }}>
        <span style={{ width: 16, height: 16, borderRadius: 5, border: '1.5px solid var(--color-accent-2)', background: 'var(--color-accent-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {CHECK_ICON}
        </span>
        Trạm quan trắc
      </label>
      <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)', padding: 'var(--space-xs) 0', fontSize: 'var(--text-base)', cursor: 'pointer' }}>
        <span style={{ width: 16, height: 16, borderRadius: 5, border: '1.5px solid var(--color-rule)' }} />
        Phân khu chức năng
      </label>
      <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)', padding: 'var(--space-xs) 0', fontSize: 'var(--text-base)', cursor: 'pointer' }}>
        <span style={{ width: 16, height: 16, borderRadius: 5, border: '1.5px solid var(--color-rule)' }} />
        Đường mòn tuần tra
      </label>
    </div>
  );
}
