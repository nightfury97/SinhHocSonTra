import { useState } from 'react';
import { HABITAT_OPTIONS } from '../../data/dashboard.js';

export default function ObservationForm() {
  const [habitat, setHabitat] = useState(HABITAT_OPTIONS[0]);

  return (
    <form onSubmit={(e) => e.preventDefault()} className="panel">
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)', fontWeight: 600 }}>Báo cáo quan sát thực địa</div>
      <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-ink-2)', marginBottom: 'var(--space-lg)' }}>Ghi nhận cá thể loài trong quá trình tuần tra tại bán đảo Sơn Trà</div>

      <div className="stack-mobile" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
        <label style={{ display: 'block' }}>
          <span className="field-label">Loài quan sát</span>
          <select className="field-input">
            <option>Voọc chà vá chân nâu</option>
            <option>Khỉ vàng</option>
            <option>Diều hoa Miến Điện</option>
            <option>Trăn gấm</option>
            <option>Loài khác…</option>
          </select>
        </label>
        <label style={{ display: 'block' }}>
          <span className="field-label">Số lượng cá thể</span>
          <input type="number" defaultValue={4} className="field-input" style={{ fontVariantNumeric: 'tabular-nums' }} />
        </label>
        <label style={{ display: 'block' }}>
          <span className="field-label">Toạ độ GPS</span>
          <input defaultValue="16.1187, 108.2969" className="field-input" style={{ fontFamily: 'var(--font-mono)' }} />
        </label>
        <label style={{ display: 'block' }}>
          <span className="field-label">Thời điểm</span>
          <input defaultValue="04/07/2026 · 07:15" className="field-input" />
        </label>
      </div>

      <div style={{ marginTop: 'var(--space-md)' }}>
        <span className="field-label">Sinh cảnh</span>
        <div style={{ display: 'flex', gap: 'var(--space-xs)', flexWrap: 'wrap' }}>
          {HABITAT_OPTIONS.map((h) => (
            <button key={h} type="button" onClick={() => setHabitat(h)} className={`chip-outline${habitat === h ? ' is-active' : ''}`}>
              {h}
            </button>
          ))}
        </div>
      </div>

      <label style={{ display: 'block', marginTop: 'var(--space-md)' }}>
        <span className="field-label">Ghi chú hành vi</span>
        <textarea rows={3} placeholder="Mô tả hoạt động, đàn/nhóm, tình trạng sức khoẻ…" className="field-input" style={{ resize: 'vertical' }} />
      </label>

      <div style={{ marginTop: 'var(--space-md)' }}>
        <span className="field-label">Hình ảnh minh chứng</span>
        <div style={{ border: '1.5px dashed var(--color-rule)', borderRadius: 'var(--radius-md)', padding: 'var(--space-lg)', textAlign: 'center', background: 'var(--color-paper-3)' }}>
          <div style={{ width: 40, height: 40, margin: '0 auto var(--space-xs)', borderRadius: 'var(--radius-md)', background: 'var(--status-lc-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="var(--status-lc-fg)" strokeWidth="1.6">
              <path d="M10 14V5M6.5 8.5L10 5l3.5 3.5" />
              <path d="M4 14v1.5A1.5 1.5 0 0 0 5.5 17h9a1.5 1.5 0 0 0 1.5-1.5V14" />
            </svg>
          </div>
          <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-ink)' }}>
            Kéo thả ảnh hoặc <span style={{ color: 'var(--color-accent-2)', fontWeight: 500 }}>chọn tệp</span>
          </div>
          <div className="eyebrow" style={{ marginTop: 'var(--space-3xs)', letterSpacing: 0 }}>JPG, PNG · tối đa 10MB</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 'var(--space-sm)', marginTop: 'var(--space-lg)' }}>
        <button type="submit" className="btn btn-primary">Gửi báo cáo</button>
        <button type="button" className="btn btn-secondary">Lưu nháp</button>
      </div>
    </form>
  );
}
