export default function MyReports({ reports }) {
  return (
    <div>
      <div className="panel">
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-md)', fontWeight: 600, marginBottom: 'var(--space-2xs)' }}>Báo cáo của tôi</div>
        <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-ink-2)', marginBottom: 'var(--space-sm)' }}>Tháng 7/2026</div>
        {reports.map((r) => {
          const bg = r.approved ? 'var(--workflow-approved-bg)' : 'var(--workflow-pending-bg)';
          const fg = r.approved ? 'var(--workflow-approved-fg)' : 'var(--workflow-pending-fg)';
          return (
            <div key={r.name} style={{ padding: 'var(--space-sm) 0', borderTop: '1px solid var(--color-rule-2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 'var(--text-sm)', fontWeight: 500 }}>{r.name}</span>
                <span className="badge" style={{ fontSize: 'var(--text-xs)', background: bg, color: fg }}>{r.status}</span>
              </div>
              <div className="eyebrow" style={{ marginTop: 'var(--space-3xs)', letterSpacing: 0 }}>{r.meta}</div>
            </div>
          );
        })}
      </div>
      <div style={{ background: 'var(--status-lc-bg)', border: '1px solid var(--color-rule)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-md)', marginTop: 'var(--space-md)' }}>
        <div className="eyebrow" style={{ color: 'var(--status-lc-fg)', marginBottom: 'var(--space-xs)' }}>MẸO GHI NHẬN</div>
        <p style={{ fontSize: 'var(--text-sm)', lineHeight: 1.6, color: 'var(--color-ink)', margin: 0 }}>
          Chụp ảnh rõ mặt và chi để hỗ trợ định danh. Với voọc chà vá, ghi lại số cá thể đực/cái/con non nếu quan sát được.
        </p>
      </div>
    </div>
  );
}
