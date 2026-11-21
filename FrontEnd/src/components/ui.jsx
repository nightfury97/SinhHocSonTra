import { useEffect, useId, useRef } from 'react';
import Icon from './Icon.jsx';
import { GROUP_BY_VALUE, IUCN_BY_VALUE, OBS_STATUS } from '../lib/taxa.js';
import { fmtNum } from '../lib/format.js';

export function IucnBadge({ status, long = false }) {
  const s = IUCN_BY_VALUE[status] ?? { label: status };
  return (
    <span className="badge" data-iucn={status} title={s.label}>
      {status === 'HERITAGE' ? 'Di sản' : <span className="mono">{status}</span>}
      {long && status !== 'HERITAGE' && <span>· {s.label}</span>}
    </span>
  );
}

export function GroupLabel({ group }) {
  const g = GROUP_BY_VALUE[group];
  if (!g) return <span>{group}</span>;
  return (
    <span className="hbar__label">
      <i className="dot" style={{ background: g.color }} aria-hidden="true" />
      {g.label}
    </span>
  );
}

export function ObsStatusBadge({ status }) {
  const s = OBS_STATUS[status];
  const icon = { ok: 'check', warn: 'info', danger: 'x' }[s.tone];
  return (
    <span className={`badge badge--${s.tone}`}>
      <Icon name={icon} size={12} />
      {s.label}
    </span>
  );
}

export function PageHead({ title, description, actions }) {
  return (
    <header className="page-head">
      <div className="page-head__text">
        <h1>{title}</h1>
        {description && <p className="muted">{description}</p>}
      </div>
      {actions && <div className="page-head__actions">{actions}</div>}
    </header>
  );
}

export function Loading({ rows = 4 }) {
  return (
    <div className="panel__body" aria-busy="true" aria-label="Đang tải">
      {Array.from({ length: rows }, (_, i) => (
        <span key={i} className="skeleton" style={{ width: `${90 - i * 12}%`, marginBottom: 10 }} />
      ))}
    </div>
  );
}

export function ErrorState({ error, onRetry }) {
  return (
    <div className="notice notice--danger" role="alert">
      <Icon name="alert" />
      <div>
        <p>{error?.message ?? 'Không tải được dữ liệu.'}</p>
        {onRetry && (
          <button type="button" className="btn btn--sm" style={{ marginTop: 8 }} onClick={onRetry}>
            Tải lại
          </button>
        )}
      </div>
    </div>
  );
}

export function Empty({ title, children }) {
  return (
    <div className="empty">
      <strong>{title}</strong>
      {children && <p className="muted">{children}</p>}
    </div>
  );
}

export function Pager({ page, pageSize, total, onPage }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  return (
    <div className="pager">
      <span className="muted num">
        {fmtNum(from)}–{fmtNum(to)} / {fmtNum(total)} bản ghi
      </span>
      <div className="inline-list">
        <button type="button" className="btn btn--sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          <Icon name="chevronLeft" size={14} />
          Trước
        </button>
        <span className="num muted" style={{ alignSelf: 'center' }}>
          Trang {page}/{pages}
        </span>
        <button type="button" className="btn btn--sm" disabled={page >= pages} onClick={() => onPage(page + 1)}>
          Sau
          <Icon name="chevronRight" size={14} />
        </button>
      </div>
    </div>
  );
}

export function Field({ label, hint, error, children, className = '' }) {
  const id = useId();
  const child = typeof children === 'function' ? children(id) : children;
  return (
    <div className={`field ${className}`}>
      <label className="field__label" htmlFor={id}>
        {label}
      </label>
      {child}
      {error ? <span className="field__error">{error}</span> : hint && <span className="field__hint">{hint}</span>}
    </div>
  );
}

/** Side sheet. Esc đóng, focus vào sheet khi mở, trả focus khi đóng. */
export function Drawer({ title, subtitle, onClose, children, footer }) {
  const ref = useRef(null);
  useEffect(() => {
    const prev = document.activeElement;
    ref.current?.focus();
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      prev?.focus?.();
    };
  }, [onClose]);
  return (
    <>
      <div className="drawer-scrim" onClick={onClose} aria-hidden="true" />
      <aside className="drawer" role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} ref={ref}>
        <div className="drawer__head">
          <div style={{ minWidth: 0 }}>
            <h2>{title}</h2>
            {subtitle && <div className="muted" style={{ fontSize: 'var(--text-sm)' }}>{subtitle}</div>}
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Đóng">
            <Icon name="close" />
          </button>
        </div>
        <div className="drawer__body">{children}</div>
        {footer && <div className="drawer__foot">{footer}</div>}
      </aside>
    </>
  );
}
