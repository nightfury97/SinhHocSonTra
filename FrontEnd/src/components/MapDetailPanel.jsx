import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useApi } from '../api/useApi.js';
import Icon from './Icon.jsx';
import SpeciesGallery from './SpeciesGallery.jsx';
import { GroupLabel, IucnBadge } from './ui.jsx';
import { BASIS } from '../lib/taxa.js';
import { fmtCoord, fmtDate, fmtNum } from '../lib/format.js';

const HABITAT = { PLANTATION: 'Rừng trồng', RICH: 'Rừng giàu', POOR: 'Rừng nghèo' };

/** Panel bên trái bản đồ: thông tin và ảnh của điểm đang chọn (quan sát hoặc đàn voọc trên tuyến). */
export default function MapDetailPanel({ point: p, user, onClose }) {
  const species = useApi(p.speciesId ? `/species/${p.speciesId}` : null);
  const sp = species.data;
  const closeRef = useRef(null);
  const isObs = p.kind === 'obs';

  useEffect(() => {
    closeRef.current?.focus({ preventScroll: true });
  }, [p.fid]);

  const title = isObs ? p.name : `Đàn ${p.code}`;
  const sci = isObs ? p.sci : sp?.scientificName;

  return (
    <aside
      className="map-panel"
      aria-label={`Chi tiết: ${title}`}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
    >
      <header className="map-panel__head">
        <div style={{ minWidth: 0 }}>
          <h2 className="map-panel__title">{title}</h2>
          {isObs && p.name !== sci && <div className="cell-sub sci">{sci}</div>}
          {!isObs && (
            <div className="cell-sub">
              Tuyến {p.transect} · Khảo sát {p.year}
            </div>
          )}
        </div>
        <button ref={closeRef} type="button" className="icon-btn" onClick={onClose} aria-label="Đóng panel">
          <Icon name="close" size={16} />
        </button>
      </header>

      <div className="map-panel__body">
        {sp || isObs ? (
          <div className="inline-list" style={{ alignItems: 'center' }}>
            {(isObs ? p.status : sp?.status) && <IucnBadge status={isObs ? p.status : sp.status} long />}
            {(isObs ? p.group : sp?.group) && <GroupLabel group={isObs ? p.group : sp.group} />}
          </div>
        ) : null}

        {p.speciesId && <SpeciesGallery speciesId={p.speciesId} speciesName={sp?.name ?? title} canEdit={false} detail={species} />}

        <section>
          <h3 className="map-panel__sub">{isObs ? 'Ghi nhận này' : 'Đàn trên tuyến'}</h3>
          <dl className="dl">
            {isObs ? (
              <>
                <dt>Ngày</dt>
                <dd className="num">{fmtDate(p.date)}</dd>
                <dt>Số lượng</dt>
                <dd className="num">{p.count ? fmtNum(Number(p.count)) : '—'}</dd>
                <dt>Loại bản ghi</dt>
                <dd>{BASIS[p.basis] ?? '—'}</dd>
                {p.place && (
                  <>
                    <dt>Địa điểm</dt>
                    <dd>{p.place}</dd>
                  </>
                )}
              </>
            ) : (
              <>
                <dt>Số cá thể</dt>
                <dd className="num">{fmtNum(Number(p.individuals))}</dd>
                <dt>Độ cao</dt>
                <dd className="num">{p.altitude ? `${fmtNum(Number(p.altitude))} m` : '—'}</dd>
                <dt>Sinh cảnh</dt>
                <dd>{HABITAT[p.habitat] ?? '—'}</dd>
                {String(p.flagged) === 'true' && (
                  <>
                    <dt>Trạng thái</dt>
                    <dd>Đang gắn cờ, chờ đối chiếu sổ thực địa</dd>
                  </>
                )}
              </>
            )}
            {user && (
              <>
                <dt>Toạ độ</dt>
                <dd className="num">{fmtCoord(p.lat, p.lng)}</dd>
              </>
            )}
          </dl>
        </section>

        {species.error && <p className="field__error">Không tải được thông tin loài.</p>}
        {sp && (
          <section>
            <h3 className="map-panel__sub">Về loài</h3>
            <dl className="dl">
              {sp.taxonClass && (
                <>
                  <dt>Lớp</dt>
                  <dd>{sp.taxonClass}</dd>
                </>
              )}
              {sp.taxonOrder && (
                <>
                  <dt>Bộ</dt>
                  <dd>{sp.taxonOrder}</dd>
                </>
              )}
              {sp.family && (
                <>
                  <dt>Họ</dt>
                  <dd>{sp.family}</dd>
                </>
              )}
              <dt>Bản ghi đã duyệt</dt>
              <dd className="num">{fmtNum(sp._count?.observations ?? 0)}</dd>
            </dl>
            {sp.description && <p className="map-panel__text">{sp.description}</p>}
            {sp.habitat && <p className="map-panel__text muted">Sinh cảnh: {sp.habitat}</p>}
            {user && (
              <Link to={`/loai?id=${sp.id}`} className="btn btn--sm">
                Mở hồ sơ loài
                <Icon name="arrowRight" size={14} />
              </Link>
            )}
          </section>
        )}
      </div>
    </aside>
  );
}
