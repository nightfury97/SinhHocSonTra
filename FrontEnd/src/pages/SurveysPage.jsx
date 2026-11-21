import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api/client.js';
import { useApi } from '../api/useApi.js';
import { useAuth } from '../auth/AuthContext.jsx';
import { Drawer, Empty, ErrorState, Field, Loading, PageHead, Pager } from '../components/ui.jsx';
import Icon from '../components/Icon.jsx';
import { HABITAT } from '../lib/taxa.js';
import { fmtCoord, fmtNum } from '../lib/format.js';

const SERIES = ['var(--series-a)', 'var(--series-b)'];
const PAGE_SIZE = 40;
const byCode = (a, b) => a.localeCompare(b, undefined, { numeric: true });

export default function SurveysPage() {
  const { can } = useAuth();
  const [params, setParams] = useSearchParams();
  const flaggedOnly = params.get('co') === '1';
  const summary = useApi('/surveys/summary');
  const sightings = useApi('/surveys/sightings');
  const transects = useApi('/surveys/transects');
  const [year, setYear] = useState('');
  const [transect, setTransect] = useState('');
  const [openId, setOpenId] = useState(null);
  const [page, setPage] = useState(1);

  const all = useMemo(() => sightings.data ?? [], [sightings.data]);
  const years = useMemo(() => [...new Set((summary.data ?? []).map((y) => y.year))].slice(-2), [summary.data]);
  const codes = useMemo(() => (transects.data ?? []).map((t) => t.code).sort(byCode), [transects.data]);

  const matrix = useMemo(() => {
    const m = {};
    for (const s of all) {
      const key = `${s.survey.transect.code}|${s.survey.year}`;
      m[key] ??= { groups: 0, individuals: 0 };
      m[key].groups += 1;
      m[key].individuals += s.individuals;
    }
    return m;
  }, [all]);

  const rows = all
    .filter((s) => !flaggedOnly || s.flagged)
    .filter((s) => !year || String(s.survey.year) === year)
    .filter((s) => !transect || s.survey.transect.code === transect);
  const pageRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const flaggedCount = all.filter((s) => s.flagged).length;
  const opened = all.find((s) => s.id === openId);

  const toggleFlagged = (on) => {
    const next = new URLSearchParams(params);
    if (on) next.set('co', '1');
    else next.delete('co');
    setParams(next, { replace: true });
    setPage(1);
  };

  if (summary.error || sightings.error)
    return (
      <div className="page">
        <PageHead title="Khảo sát tuyến" />
        <ErrorState error={summary.error ?? sightings.error} onRetry={() => (summary.reload(), sightings.reload())} />
      </div>
    );

  return (
    <div className="page">
      <PageHead
        title="Khảo sát tuyến"
        description="Đi tuyến cố định để đếm đàn voọc chà vá chân nâu; mỗi tuyến đi lặp 3 ngày liên tiếp. Điểm có toạ độ hoặc độ cao bất thường được gắn cờ để đối chiếu sổ thực địa."
      />

      {flaggedCount > 0 && (
        <div className="notice notice--warn">
          <Icon name="flag" />
          <span>
            {fmtNum(flaggedCount)} điểm ghi nhận đang bị gắn cờ.{' '}
            {!flaggedOnly && (
              <button type="button" className="btn btn--sm" onClick={() => toggleFlagged(true)}>
                Chỉ xem điểm bị gắn cờ
              </button>
            )}
          </span>
        </div>
      )}

      <section className="panel">
        <div className="panel__head">
          <h2>Kết quả theo năm</h2>
        </div>
        {summary.loading && !summary.data ? (
          <Loading />
        ) : (summary.data ?? []).length === 0 ? (
          <Empty title="Chưa có dữ liệu khảo sát">Nhập file khảo sát tuyến ở mục Bộ dữ liệu.</Empty>
        ) : (
          <div className="table-wrap">
            <table className="table table--stack">
              <thead>
                <tr>
                  <th>Năm</th>
                  <th className="right">Tuyến</th>
                  <th className="right">Quãng đường (km)</th>
                  <th className="right">Số đàn</th>
                  <th className="right">Số cá thể</th>
                  <th className="right">Đàn/km</th>
                  <th className="right">Cỡ đàn TB</th>
                  <th className="right">Gắn cờ</th>
                </tr>
              </thead>
              <tbody>
                {summary.data.map((y) => (
                  <tr key={y.year}>
                    <td data-label="Năm" className="cell-title num">
                      {y.year}
                    </td>
                    <td data-label="Tuyến" className="right">
                      {fmtNum(y.transects)}
                    </td>
                    <td data-label="Quãng đường (km)" className="right">
                      {fmtNum(y.effortKm, 1)}
                    </td>
                    <td data-label="Số đàn" className="right">
                      {fmtNum(y.groups)}
                    </td>
                    <td data-label="Số cá thể" className="right">
                      {fmtNum(y.individuals)}
                    </td>
                    <td data-label="Đàn/km" className="right">
                      {fmtNum(y.encounterRatePerKm, 3)}
                    </td>
                    <td data-label="Cỡ đàn TB" className="right">
                      {fmtNum(y.meanGroupSize, 1)}
                    </td>
                    <td data-label="Gắn cờ" className="right">
                      {y.flagged ? <span className="badge badge--warn">{y.flagged}</span> : '0'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {codes.length > 0 && years.length > 0 && (
        <section className="panel">
          <div className="panel__head">
            <h2>Số đàn gặp trên từng tuyến</h2>
            <div className="legend">
              {years.map((y, i) => (
                <span key={y}>
                  <i style={{ background: SERIES[i] }} />
                  {y}
                </span>
              ))}
            </div>
          </div>
          <div className="panel__body">
            <TransectChart codes={codes} years={years} matrix={matrix} />
          </div>
          <div className="table-wrap" style={{ borderTop: '1px solid var(--color-rule)' }}>
            <table className="table">
              <caption className="visually-hidden">Số đàn và số cá thể theo tuyến và năm</caption>
              <thead>
                <tr>
                  <th>Tuyến</th>
                  <th className="right">Dài (km)</th>
                  {years.map((y) => (
                    <th key={y} className="right">
                      {y}: đàn · cá thể
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(transects.data ?? [])
                  .slice()
                  .sort((a, b) => byCode(a.code, b.code))
                  .map((t) => (
                    <tr key={t.id}>
                      <td className="cell-title mono">{t.code}</td>
                      <td className="right">{fmtNum(t.lengthKm, 2)}</td>
                      {years.map((y) => {
                        const v = matrix[`${t.code}|${y}`];
                        return (
                          <td key={y} className="right">
                            {v ? `${fmtNum(v.groups)} · ${fmtNum(v.individuals)}` : <span className="faint">0</span>}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="panel">
        <div className="panel__head">
          <div className="toolbar" style={{ flex: 1 }}>
            <Field label="Năm">
              {(id) => (
                <select id={id} className="select" value={year} onChange={(e) => (setYear(e.target.value), setPage(1))}>
                  <option value="">Tất cả năm</option>
                  {(summary.data ?? []).map((y) => (
                    <option key={y.year} value={y.year}>
                      {y.year}
                    </option>
                  ))}
                </select>
              )}
            </Field>
            <Field label="Tuyến">
              {(id) => (
                <select id={id} className="select" value={transect} onChange={(e) => (setTransect(e.target.value), setPage(1))}>
                  <option value="">Tất cả tuyến</option>
                  {codes.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              )}
            </Field>
            <label className="check">
              <input type="checkbox" checked={flaggedOnly} onChange={(e) => toggleFlagged(e.target.checked)} />
              Chỉ điểm bị gắn cờ
            </label>
          </div>
        </div>
        {sightings.loading && !sightings.data ? (
          <Loading rows={6} />
        ) : rows.length === 0 ? (
          <Empty title={flaggedOnly ? 'Không còn điểm nào bị gắn cờ' : 'Không có điểm nào khớp bộ lọc'} />
        ) : (
          <div className="table-wrap">
            <table className="table table--stack">
              <thead>
                <tr>
                  <th>Đàn</th>
                  <th>Năm</th>
                  <th className="right">Cá thể</th>
                  <th>Vị trí</th>
                  <th className="right">Độ cao (m)</th>
                  <th>Sinh cảnh</th>
                  <th>Ghi chú</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((s) => (
                  <tr key={s.id} data-clickable="true" tabIndex={0} aria-selected={s.id === openId} onClick={() => setOpenId(s.id)} onKeyDown={(e) => e.key === 'Enter' && setOpenId(s.id)}>
                    <td data-label="Đàn" className="cell-title mono">
                      {s.groupCode}
                    </td>
                    <td data-label="Năm" className="num">
                      {s.survey.year}
                    </td>
                    <td data-label="Cá thể" className="right">
                      {fmtNum(s.individuals)}
                    </td>
                    <td data-label="Vị trí" className="num">
                      {s.lat !== null ? fmtCoord(s.lat, s.lng) : <span className="faint">không vẽ được</span>}
                    </td>
                    <td data-label="Độ cao (m)" className="right">
                      {fmtNum(s.altitudeM)}
                    </td>
                    <td data-label="Sinh cảnh">{HABITAT[s.habitat] ?? '—'}</td>
                    <td data-label="Ghi chú">
                      {s.flagged ? (
                        <span className="badge badge--warn" title={s.flagNote}>
                          <Icon name="flag" size={12} />
                          Gắn cờ
                        </span>
                      ) : s.flagNote ? (
                        <span className="cell-sub">{s.flagNote}</span>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pager page={page} pageSize={PAGE_SIZE} total={rows.length} onPage={setPage} />
          </div>
        )}
      </section>

      {opened && (
        <SightingDrawer
          key={opened.id}
          sighting={opened}
          canEdit={can.edit}
          onClose={() => setOpenId(null)}
          onSaved={() => {
            sightings.reload();
            summary.reload();
          }}
        />
      )}
    </div>
  );
}

/** Grouped bars: two survey years per transect. Hover a transect for exact values. */
function TransectChart({ codes, years, matrix }) {
  const [hover, setHover] = useState(null);
  const W = 720;
  const H = 220;
  const pad = { l: 28, r: 8, t: 12, b: 24 };
  const max = Math.max(4, ...codes.flatMap((c) => years.map((y) => matrix[`${c}|${y}`]?.groups ?? 0)));
  const step = max > 12 ? 5 : 2;
  const top = Math.ceil(max / step) * step;
  const band = (W - pad.l - pad.r) / codes.length;
  const barW = Math.min(14, (band - 10) / years.length);
  const y = (v) => pad.t + (H - pad.t - pad.b) * (1 - v / top);
  const ticks = Array.from({ length: top / step + 1 }, (_, i) => i * step);

  return (
    <div className="chart-box">
      <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Biểu đồ số đàn theo tuyến và năm; số liệu chi tiết ở bảng bên dưới.">
        {ticks.map((t) => (
          <g key={t}>
            <line className={t === 0 ? 'axis-line' : 'grid-line'} x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} />
            <text x={pad.l - 6} y={y(t) + 4} textAnchor="end">
              {t}
            </text>
          </g>
        ))}
        {codes.map((c, i) => {
          const x0 = pad.l + i * band;
          const groupW = barW * years.length + 2 * (years.length - 1);
          return (
            <g key={c} onMouseEnter={() => setHover(c)} onMouseLeave={() => setHover(null)}>
              {hover === c && <rect className="is-hover" x={x0} y={pad.t} width={band} height={H - pad.t - pad.b} />}
              {years.map((yr, j) => {
                const v = matrix[`${c}|${yr}`]?.groups ?? 0;
                const x = x0 + (band - groupW) / 2 + j * (barW + 2);
                const h = y(0) - y(v);
                return v > 0 ? (
                  <path
                    key={yr}
                    d={`M${x},${y(0)} v${-(h - 4)} q0,-4 4,-4 h${barW - 8} q4,0 4,4 v${h - 4} z`}
                    fill={SERIES[j]}
                  />
                ) : null;
              })}
              <text x={x0 + band / 2} y={H - 6} textAnchor="middle">
                {c}
              </text>
              <rect className="hit" x={x0} y={pad.t} width={band} height={H - pad.t} />
            </g>
          );
        })}
      </svg>
      {hover && (
        <div className="tooltip" style={{ left: `${((pad.l + (codes.indexOf(hover) + 0.5) * band) / W) * 100}%`, top: 12 }}>
          <strong>{hover}</strong>
          {years.map((yr) => {
            const v = matrix[`${hover}|${yr}`];
            return <div key={yr}>{`${yr}: ${v?.groups ?? 0} đàn · ${v?.individuals ?? 0} cá thể`}</div>;
          })}
        </div>
      )}
    </div>
  );
}

function SightingDrawer({ sighting: initial, canEdit, onClose, onSaved }) {
  // Hiển thị ngay bản ghi server trả về sau khi lưu, không chờ danh sách tải lại.
  const [sighting, setSighting] = useState(initial);
  const [form, setForm] = useState({
    individuals: String(sighting.individuals),
    utmX: sighting.utmX ?? '',
    utmY: sighting.utmY ?? '',
    altitudeM: sighting.altitudeM ?? '',
    flagged: sighting.flagged,
    flagNote: sighting.flagNote ?? '',
  });
  const [state, setState] = useState({ busy: false, error: null, saved: false });
  const set = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
    setState((s) => ({ ...s, saved: false }));
  };

  async function save(e) {
    e.preventDefault();
    const num = (v) => (v === '' ? null : Number(v));
    const body = {
      individuals: Number(form.individuals),
      altitudeM: num(form.altitudeM),
      flagged: form.flagged,
      flagNote: form.flagNote.trim() || null,
    };
    if (form.utmX !== '' && Number(form.utmX) !== sighting.utmX) body.utmX = Number(form.utmX);
    if (form.utmY !== '' && Number(form.utmY) !== sighting.utmY) body.utmY = Number(form.utmY);
    if (!Number.isInteger(body.individuals) || body.individuals < 1) return setState({ busy: false, error: 'Số cá thể phải là số nguyên dương.', saved: false });
    setState({ busy: true, error: null, saved: false });
    try {
      const updated = await api(`/surveys/sightings/${sighting.id}`, { method: 'PATCH', body });
      setSighting((s) => ({ ...s, ...updated }));
      setState({ busy: false, error: null, saved: true });
      onSaved();
    } catch (err) {
      setState({ busy: false, error: err.message, saved: false });
    }
  }

  return (
    <Drawer
      title={`Đàn ${sighting.groupCode}`}
      subtitle={`Tuyến ${sighting.survey.transect.code} · năm ${sighting.survey.year}`}
      onClose={onClose}
      footer={
        <>
          {state.error && <span className="field__error">{state.error}</span>}
          {state.saved && (
            <span className="saved">
              <Icon name="check" size={14} />
              Đã lưu
            </span>
          )}
          {canEdit && (
            <button type="submit" form="sighting-form" className="btn btn--primary" disabled={state.busy} data-state={state.busy ? 'loading' : undefined}>
              Lưu
            </button>
          )}
        </>
      }
    >
      {sighting.flagged && (
        <div className="notice notice--warn">
          <Icon name="flag" />
          <span>{sighting.flagNote}</span>
        </div>
      )}
      <dl className="dl">
        <dt>Toạ độ (WGS84)</dt>
        <dd className="mono">{sighting.lat !== null ? fmtCoord(sighting.lat, sighting.lng) : 'chưa xác định'}</dd>
        <dt>Khoảng cách</dt>
        <dd className="num">{sighting.distanceM !== null ? `${fmtNum(sighting.distanceM)} m` : '—'}</dd>
        <dt>Góc phương vị</dt>
        <dd className="num">{sighting.bearingDeg !== null ? `${fmtNum(sighting.bearingDeg)}°` : '—'}</dd>
        <dt>Khoảng cách vuông góc</dt>
        <dd className="num">{sighting.perpendicularDistanceM !== null ? `${fmtNum(sighting.perpendicularDistanceM, 1)} m` : '—'}</dd>
        <dt>Sinh cảnh</dt>
        <dd>{HABITAT[sighting.habitat] ?? '—'}</dd>
      </dl>

      <form id="sighting-form" className="form-grid" onSubmit={save}>
        <Field label="UTM X (Easting)" hint="Múi 49N. Sửa X/Y sẽ tự tính lại vĩ độ, kinh độ.">
          {(id) => <input id={id} className="input num" inputMode="numeric" value={form.utmX} onChange={set('utmX')} disabled={!canEdit} />}
        </Field>
        <Field label="UTM Y (Northing)" hint="Sơn Trà nằm quanh 1.782.000–1.788.000.">
          {(id) => <input id={id} className="input num" inputMode="numeric" value={form.utmY} onChange={set('utmY')} disabled={!canEdit} />}
        </Field>
        <Field label="Độ cao (m)">{(id) => <input id={id} className="input num" inputMode="decimal" value={form.altitudeM} onChange={set('altitudeM')} disabled={!canEdit} />}</Field>
        <Field label="Số cá thể">{(id) => <input id={id} className="input num" inputMode="numeric" value={form.individuals} onChange={set('individuals')} disabled={!canEdit} />}</Field>
        <Field label="Ghi chú hiệu chỉnh" className="span-2" hint="Ghi rõ đã sửa gì và căn cứ (VD: đối chiếu sổ thực địa ngày …).">
          {(id) => <textarea id={id} className="textarea" value={form.flagNote} onChange={set('flagNote')} disabled={!canEdit} />}
        </Field>
        <label className="check span-2">
          <input type="checkbox" checked={form.flagged} onChange={set('flagged')} disabled={!canEdit} />
          Vẫn cần rà soát (giữ cờ)
        </label>
      </form>
    </Drawer>
  );
}
