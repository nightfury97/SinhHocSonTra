const NAV_ITEMS = [
  {
    key: 'dashboard',
    label: 'Tổng quan',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6">
        <rect x="2" y="2" width="6" height="6" rx="1.4" />
        <rect x="10" y="2" width="6" height="6" rx="1.4" />
        <rect x="2" y="10" width="6" height="6" rx="1.4" />
        <rect x="10" y="10" width="6" height="6" rx="1.4" />
      </svg>
    ),
  },
  {
    key: 'map',
    label: 'Bản đồ phân bố',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M9 2c2.5 0 4.5 2 4.5 4.5C13.5 10 9 16 9 16S4.5 10 4.5 6.5C4.5 4 6.5 2 9 2z" />
        <circle cx="9" cy="6.5" r="1.7" />
      </svg>
    ),
  },
  {
    key: 'species',
    label: 'Danh mục loài',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6">
        <circle cx="9" cy="9" r="7" />
        <path d="M9 5.5v7M5.5 9h7" />
      </svg>
    ),
  },
  {
    key: 'entry',
    label: 'Nhập liệu quan sát',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6">
        <rect x="3" y="2.5" width="12" height="13" rx="2" />
        <path d="M6 6.5h6M6 9.5h6M6 12.5h3.5" />
      </svg>
    ),
  },
];

export default function Sidebar({ screen, navOpen, onNavigate }) {
  return (
    <aside
      data-nav="true"
      data-open={navOpen}
      style={{
        width: 250,
        flex: 'none',
        background: 'var(--color-surface-dark)',
        color: 'var(--color-ink-on-dark)',
        display: 'flex',
        flexDirection: 'column',
        padding: 'var(--space-lg) var(--space-md)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', padding: 'var(--space-2xs) var(--space-xs) var(--space-lg)' }}>
        <span
          style={{
            width: 34,
            height: 34,
            borderRadius: 11,
            background: 'var(--color-accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flex: 'none',
          }}
        >
          <span
            style={{
              width: 13,
              height: 13,
              borderRadius: '50%',
              background: 'var(--color-paper)',
              boxShadow: '0 0 0 3px var(--color-surface-dark), 0 0 0 5px var(--color-accent)',
            }}
          />
        </span>
        <span style={{ lineHeight: 1.15 }}>
          <span style={{ display: 'block', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 'var(--text-lg)', letterSpacing: 0.2 }}>
            Sơn Trà
          </span>
          <span className="eyebrow" style={{ display: 'block', color: 'var(--color-ink-on-dark-2)' }}>
            ĐA DẠNG SINH HỌC
          </span>
        </span>
      </div>

      <div className="eyebrow" style={{ padding: '0 var(--space-xs) var(--space-xs)' }}>
        HỆ THỐNG
      </div>

      {NAV_ITEMS.map((item) => (
        <button
          key={item.key}
          onClick={() => onNavigate(item.key)}
          className={`nav-link${screen === item.key ? ' is-active' : ''}`}
        >
          {item.icon}
          {item.label}
        </button>
      ))}

      <div
        style={{
          marginTop: 'auto',
          border: '1px solid var(--color-surface-dark-3)',
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--space-sm)',
        }}
      >
        <div className="eyebrow" style={{ marginBottom: 'var(--space-xs)' }}>
          TÌNH TRẠNG HỆ THỐNG
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)', fontSize: 'var(--text-sm)', color: 'var(--color-ink-on-dark-2)' }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--status-lc-fg)' }} /> 5 trạm quan trắc trực tuyến
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)', fontSize: 'var(--text-sm)', color: 'var(--color-ink-on-dark-2)', marginTop: 'var(--space-2xs)' }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--status-vu-fg)' }} /> 3 báo cáo chờ duyệt
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)', padding: 'var(--space-sm) var(--space-xs) 0' }}>
        <span
          style={{
            width: 30,
            height: 30,
            borderRadius: '50%',
            background: 'var(--color-surface-dark-2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 'var(--text-sm)',
            color: 'var(--color-ink-on-dark-2)',
            fontWeight: 600,
          }}
        >
          NA
        </span>
        <span style={{ lineHeight: 1.2 }}>
          <span style={{ display: 'block', fontSize: 'var(--text-sm)', color: 'var(--color-ink-on-dark)' }}>Nguyễn Văn An</span>
          <span style={{ display: 'block', fontSize: 'var(--text-xs)', color: 'var(--color-ink-on-dark-2)' }}>Kiểm lâm · Hạt Sơn Trà</span>
        </span>
      </div>
    </aside>
  );
}
