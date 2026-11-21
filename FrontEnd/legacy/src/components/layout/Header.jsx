export default function Header({ title, subtitle, onToggleNav }) {
  return (
    <header
      style={{
        flex: 'none',
        height: 64,
        borderBottom: '1px solid var(--color-rule)',
        background: 'var(--color-paper-3)',
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-sm)',
        padding: '0 var(--space-lg)',
      }}
    >
      <button data-burger="true" onClick={onToggleNav} className="icon-btn" style={{ display: 'none', width: 38, height: 38, flex: 'none' }}>
        <svg width="18" height="18" viewBox="0 0 18 18" stroke="var(--color-surface-dark)" strokeWidth="1.7">
          <path d="M3 5h12M3 9h12M3 13h12" />
        </svg>
      </button>
      <div style={{ minWidth: 0, overflow: 'hidden', flex: '1 1 auto' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)', fontWeight: 600, lineHeight: 1.1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</div>
        <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-ink-2)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{subtitle}</div>
      </div>
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 'var(--space-xs)', flex: 'none' }}>
        <div
          className="header-search"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-xs)',
            background: 'var(--color-paper-2)',
            border: '1px solid var(--color-rule)',
            borderRadius: 'var(--radius-sm)',
            padding: 'var(--space-xs) var(--space-sm)',
            minWidth: 0,
          }}
        >
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="var(--color-ink-3)" strokeWidth="1.5">
            <circle cx="6.5" cy="6.5" r="4.5" />
            <path d="M10 10l3 3" />
          </svg>
          <input
            placeholder="Tìm loài, khu vực, báo cáo…"
            style={{ border: 'none', outline: 'none', font: 'inherit', fontSize: 'var(--text-sm)', background: 'transparent', width: 190, color: 'var(--color-ink)' }}
          />
        </div>
        <button className="icon-btn" style={{ width: 38, height: 38, position: 'relative' }}>
          <svg width="17" height="17" viewBox="0 0 18 18" fill="none" stroke="var(--color-surface-dark)" strokeWidth="1.6">
            <path d="M9 2a4.5 4.5 0 0 0-4.5 4.5c0 3.5-1.5 5-1.5 5h12s-1.5-1.5-1.5-5A4.5 4.5 0 0 0 9 2z" />
            <path d="M7.5 15a1.5 1.5 0 0 0 3 0" />
          </svg>
          <span
            style={{
              position: 'absolute',
              top: 7,
              right: 8,
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: 'var(--color-accent)',
              border: '1.5px solid var(--color-paper-2)',
            }}
          />
        </button>
      </div>
    </header>
  );
}
