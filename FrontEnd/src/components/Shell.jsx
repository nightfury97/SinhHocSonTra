import { useCallback, useEffect, useRef, useState } from 'react';
import { ChangePasswordDrawer } from './PasswordDrawers.jsx';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import Icon from './Icon.jsx';
import { useAuth } from '../auth/AuthContext.jsx';
import { useApi } from '../api/useApi.js';
import { DATA_CHANGED } from '../api/client.js';
import { ROLES } from '../lib/taxa.js';

const NAV = [
  { section: 'Theo dõi' },
  { to: '/', label: 'Tổng quan', icon: 'overview', end: true, public: true },
  { to: '/ban-do', label: 'Bản đồ', icon: 'map', public: true },
  { section: 'Dữ liệu' },
  { to: '/loai', label: 'Danh mục loài', icon: 'species', badge: 'curation' },
  { to: '/quan-sat', label: 'Quan sát', icon: 'observations', badge: 'pending' },
  { to: '/khao-sat', label: 'Khảo sát tuyến', icon: 'surveys', badge: 'flagged' },
  { to: '/bo-du-lieu', label: 'Bộ dữ liệu', icon: 'datasets' },
  { section: 'Hệ thống', admin: true },
  { to: '/nguoi-dung', label: 'Người dùng', icon: 'users', admin: true },
];

const TITLES = Object.fromEntries(NAV.filter((n) => n.to).map((n) => [n.to, n.label]));

const RAIL_MIN = 200;
const RAIL_MAX = 360;
const RAIL_DEFAULT = 232;
const RAIL_COLLAPSED = 64;
const PREF_KEY = 'sontra.rail';

function loadRailPref() {
  try {
    const p = JSON.parse(localStorage.getItem(PREF_KEY));
    return {
      width: Math.min(RAIL_MAX, Math.max(RAIL_MIN, Number(p?.width) || RAIL_DEFAULT)),
      collapsed: p?.collapsed === true,
    };
  } catch {
    return { width: RAIL_DEFAULT, collapsed: false };
  }
}

/** Độ rộng + trạng thái thu gọn của menu, nhớ qua các lần mở (localStorage có thể bị chặn → bỏ qua). */
function useRailPref() {
  const [pref, setPref] = useState(loadRailPref);
  const update = useCallback((patch) => {
    setPref((prev) => {
      const next = { ...prev, ...patch };
      try {
        localStorage.setItem(PREF_KEY, JSON.stringify(next));
      } catch {
        /* storage blocked */
      }
      return next;
    });
  }, []);
  return [pref, update];
}

/** Thanh kéo ở cạnh phải menu: chuột/cảm ứng, phím ←/→ (Shift = bước lớn), nhấp đúp = về mặc định. */
function RailResizer({ width, onChange, onReset }) {
  const dragging = useRef(false);
  const clamp = (v) => Math.min(RAIL_MAX, Math.max(RAIL_MIN, Math.round(v)));
  return (
    <div
      className="rail__resizer"
      role="separator"
      aria-orientation="vertical"
      aria-label="Điều chỉnh độ rộng menu"
      aria-valuemin={RAIL_MIN}
      aria-valuemax={RAIL_MAX}
      aria-valuenow={width}
      tabIndex={0}
      title="Kéo để đổi độ rộng · nhấp đúp để đặt lại"
      onPointerDown={(e) => {
        dragging.current = true;
        e.currentTarget.setPointerCapture(e.pointerId);
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
      }}
      onPointerMove={(e) => dragging.current && onChange(clamp(e.clientX))}
      onPointerUp={(e) => {
        dragging.current = false;
        e.currentTarget.releasePointerCapture(e.pointerId);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }}
      onDoubleClick={onReset}
      onKeyDown={(e) => {
        const step = e.shiftKey ? 32 : 8;
        if (e.key === 'ArrowLeft') onChange(clamp(width - step));
        else if (e.key === 'ArrowRight') onChange(clamp(width + step));
        else if (e.key === 'Home') onChange(RAIL_MIN);
        else if (e.key === 'End') onChange(RAIL_MAX);
        else return;
        e.preventDefault();
      }}
    />
  );
}

export default function Shell() {
  const { user, logout, can } = useAuth();
  const [changingPw, setChangingPw] = useState(false);
  const [open, setOpen] = useState(false);
  const [rail, setRail] = useRailPref();
  const collapsed = rail.collapsed;
  const location = useLocation();
  const [tick, setTick] = useState(0);
  // Bộ đếm việc cần xử lý chỉ dành cho người đã đăng nhập.
  const pending = useApi(user ? '/observations' : null, { status: 'pending', pageSize: 1, _: tick });
  const flagged = useApi(user ? '/surveys/sightings' : null, { flagged: 'true', _: tick });
  const species = useApi(user ? '/species' : null, { _: tick });

  useEffect(() => setOpen(false), [location.pathname]);
  useEffect(() => {
    const bump = () => setTick((t) => t + 1);
    window.addEventListener(DATA_CHANGED, bump);
    return () => window.removeEventListener(DATA_CHANGED, bump);
  }, []);

  const counts = {
    pending: pending.data?.total,
    flagged: flagged.data?.length,
    curation: species.data?.filter((s) => s.name === s.scientificName || s.status === 'NE').length,
  };
  const title = TITLES[`/${location.pathname.split('/')[1]}`] ?? TITLES['/'];

  return (
    <div className="shell" data-collapsed={collapsed} style={{ '--rail-w': `${collapsed ? RAIL_COLLAPSED : rail.width}px` }}>
      <aside className="rail" data-open={open} data-collapsed={collapsed} aria-label="Điều hướng chính">
        <div className="rail__brand">
          <div className="rail__brand-text">
            <strong>Sơn Trà</strong>
            <span>Quản lý đa dạng sinh học</span>
          </div>
          <span className="rail__mark" aria-hidden="true">
            ST
          </span>
          <button
            type="button"
            className="rail__collapse"
            onClick={() => setRail({ collapsed: !collapsed })}
            aria-label={collapsed ? 'Mở rộng menu' : 'Thu gọn menu'}
            aria-pressed={collapsed}
            title={collapsed ? 'Mở rộng menu' : 'Thu gọn menu'}
          >
            <Icon name={collapsed ? 'chevronRight' : 'chevronLeft'} size={16} />
          </button>
        </div>
        <nav className="rail__nav">
          {NAV.filter((n) => (user ? !n.admin || can.admin : n.public)).map((n) =>
            n.section ? (
              <div key={n.section} className="rail__group">
                <span className="rail__label">{n.section}</span>
              </div>
            ) : (
              <NavLink key={n.to} to={n.to} end={n.end} className="rail__link" title={collapsed ? n.label : undefined} aria-label={collapsed ? n.label : undefined}>
                <Icon name={n.icon} />
                <span className="rail__label">{n.label}</span>
                {n.badge && counts[n.badge] > 0 && (
                  <span className="rail__count" title="Số mục cần xử lý">
                    {counts[n.badge]}
                  </span>
                )}
              </NavLink>
            )
          )}
        </nav>
        <div className="rail__foot">
          {user ? (
            <>
              <div className="rail__user" title={`${user.name} · ${user.email}`}>
                <strong>{user.name}</strong>
                <span>
                  {ROLES[user.role]} · {user.email}
                </span>
              </div>
              <button type="button" className="rail__logout" onClick={() => setChangingPw(true)} title="Đổi mật khẩu" aria-label="Đổi mật khẩu">
                <Icon name="key" size={16} />
                <span className="rail__label">Đổi mật khẩu</span>
              </button>
              <button type="button" className="rail__logout" onClick={logout} title="Đăng xuất" aria-label="Đăng xuất">
                <Icon name="logout" size={16} />
                <span className="rail__label">Đăng xuất</span>
              </button>
            </>
          ) : (
            <>
              <span className="rail__user">
                <span>Cán bộ, nhà nghiên cứu đăng nhập để nhập liệu và biên tập.</span>
              </span>
              <Link to={`/dang-nhap?tiep=${encodeURIComponent(location.pathname)}`} className="rail__logout" style={{ textDecoration: 'none' }} title="Đăng nhập" aria-label="Đăng nhập">
                <Icon name="logout" size={16} />
                <span className="rail__label">Đăng nhập</span>
              </Link>
            </>
          )}
        </div>
        <RailResizer width={rail.width} onChange={(width) => setRail({ width, collapsed: false })} onReset={() => setRail({ width: RAIL_DEFAULT })} />
      </aside>
      {open && <button type="button" className="scrim" aria-label="Đóng menu" onClick={() => setOpen(false)} />}

      <div className="main">
        <header className="topbar">
          <button type="button" className="topbar__menu" aria-label="Mở menu" aria-expanded={open} onClick={() => setOpen(true)}>
            <Icon name="menu" />
          </button>
          <span className="topbar__title">{title}</span>
        </header>
        <Outlet />
      </div>
      {changingPw && <ChangePasswordDrawer onClose={() => setChangingPw(false)} />}
    </div>
  );
}
