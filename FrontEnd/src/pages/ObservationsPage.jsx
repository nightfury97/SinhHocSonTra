import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api/client.js';
import { useApi } from '../api/useApi.js';
import { useAuth } from '../auth/AuthContext.jsx';
import { Drawer, Empty, ErrorState, Field, GroupLabel, Loading, ObsStatusBadge, PageHead, Pager } from '../components/ui.jsx';
import Icon from '../components/Icon.jsx';
import { BASIS } from '../lib/taxa.js';
import { fmtCoord, fmtDate, fmtDateTime, fmtNum } from '../lib/format.js';

const TABS = [
  { value: '', label: 'Tất cả' },
  { value: 'PENDING', label: 'Chờ duyệt' },
  { value: 'APPROVED', label: 'Đã duyệt' },
  { value: 'REJECTED', label: 'Bị từ chối' },
];
const PAGE_SIZE = 25;

export default function ObservationsPage() {
  const { user, can } = useAuth();
  const [params, setParams] = useSearchParams();
  const status = params.get('trang-thai') ?? '';
  const [filters, setFilters] = useState({ speciesId: '', year: '', basisOfRecord: '', datasetId: '', mine: false });
  const [page, setPage] = useState(1);
  const [opened, setOpened] = useState(null);
  const [creating, setCreating] = useState(false);

  const species = useApi('/species');
  const datasets = useApi('/datasets');
  const query = {
    status: status || undefined,
    speciesId: filters.speciesId || undefined,
    year: filters.year || undefined,
    basisOfRecord: filters.basisOfRecord || undefined,
    datasetId: filters.datasetId || undefined,
    mine: filters.mine ? 'true' : undefined,
    page,
    pageSize: PAGE_SIZE,
  };
  const obs = useApi('/observations', query);

  const setFilter = (k) => (e) => {
    setFilters((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
    setPage(1);
  };
  const setTab = (value) => {
    const next = new URLSearchParams(params);
    if (value) next.set('trang-thai', value);
    else next.delete('trang-thai');
    setParams(next, { replace: true });
    setPage(1);
  };

  const sortedSpecies = useMemo(() => [...(species.data ?? [])].sort((a, b) => a.name.localeCompare(b.name, 'vi')), [species.data]);
  const items = obs.data?.items ?? [];

  return (
    <div className="page">
      <PageHead
        title="Quan sát"
        description="Mọi lần ghi nhận loài: gửi từ thực địa hoặc nhập từ bộ dữ liệu nghiên cứu. Bản ghi mới cần một kiểm lâm hoặc quản trị viên khác duyệt."
        actions={
          <button type="button" className="btn btn--primary" onClick={() => setCreating(true)}>
            <Icon name="plus" size={16} />
            Ghi nhận mới
          </button>
        }
      />

      <div className="tabs" role="tablist" aria-label="Trạng thái">
        {TABS.map((t) => (
          <button key={t.value} type="button" role="tab" className="tab" aria-selected={status === t.value} onClick={() => setTab(t.value)}>
            {t.label}
          </button>
        ))}
      </div>

      <section className="panel">
        <div className="panel__head">
          <div className="toolbar" style={{ flex: 1 }}>
            <Field label="Loài" className="field--grow">
              {(id) => (
                <select id={id} className="select" value={filters.speciesId} onChange={setFilter('speciesId')}>
                  <option value="">Tất cả loài</option>
                  {sortedSpecies.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name === s.scientificName ? s.name : `${s.name} — ${s.scientificName}`}
                    </option>
                  ))}
                </select>
              )}
            </Field>
            <Field label="Năm">
              {(id) => <input id={id} className="input num" inputMode="numeric" placeholder="VD: 2017" value={filters.year} onChange={setFilter('year')} />}
            </Field>
            <Field label="Loại bản ghi">
              {(id) => (
                <select id={id} className="select" value={filters.basisOfRecord} onChange={setFilter('basisOfRecord')}>
                  <option value="">Tất cả</option>
                  {Object.entries(BASIS).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              )}
            </Field>
            <Field label="Nguồn">
              {(id) => (
                <select id={id} className="select" value={filters.datasetId} onChange={setFilter('datasetId')}>
                  <option value="">Mọi nguồn</option>
                  {(datasets.data ?? [])
                    .filter((d) => d.kind === 'OCCURRENCE')
                    .map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                </select>
              )}
            </Field>
            <label className="check">
              <input type="checkbox" checked={filters.mine} onChange={setFilter('mine')} />
              Của tôi
            </label>
          </div>
        </div>

        {obs.error ? (
          <div className="panel__body">
            <ErrorState error={obs.error} onRetry={obs.reload} />
          </div>
        ) : obs.loading && !obs.data ? (
          <Loading rows={8} />
        ) : items.length === 0 ? (
          <Empty title="Không có quan sát nào">
            {status === 'PENDING' ? 'Không còn bản ghi nào chờ duyệt.' : 'Thử bỏ bớt bộ lọc.'}
          </Empty>
        ) : (
          <>
            <div className="table-wrap" aria-busy={obs.loading}>
              <table className="table table--stack">
                <thead>
                  <tr>
                    <th>Ngày</th>
                    <th>Loài</th>
                    <th>Địa điểm</th>
                    <th className="right">Số lượng</th>
                    <th>Nguồn</th>
                    <th>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((o) => (
                    <tr key={o.id} data-clickable="true" tabIndex={0} aria-selected={o.id === opened?.id} onClick={() => setOpened(o)} onKeyDown={(e) => e.key === 'Enter' && setOpened(o)}>
                      <td data-label="Ngày" className="num">
                        {fmtDate(o.observedAt)}
                      </td>
                      <td data-label="Loài">
                        <div className="cell-title">{o.species.name}</div>
                        <div className="cell-sub">
                          <GroupLabel group={o.species.group} />
                        </div>
                      </td>
                      <td data-label="Địa điểm">
                        {o.place}
                        <div className="cell-sub num">{fmtCoord(o.lat, o.lng)}</div>
                      </td>
                      <td data-label="Số lượng" className="right">
                        {fmtNum(o.count)}
                      </td>
                      <td data-label="Nguồn">
                        {o.dataset ? <span className="badge badge--plain badge--code">{o.dataset.code}</span> : o.observer?.name ?? '—'}
                        <div className="cell-sub">{BASIS[o.basisOfRecord]}</div>
                      </td>
                      <td data-label="Trạng thái">
                        <ObsStatusBadge status={o.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pager page={page} pageSize={PAGE_SIZE} total={obs.data.total} onPage={setPage} />
          </>
        )}
      </section>

      {opened && (
        <ObservationDrawer
          key={opened.id}
          obs={opened}
          user={user}
          canReview={can.review}
          isAdmin={can.admin}
          onClose={() => setOpened(null)}
          onChanged={(updated) => {
            // Giữ drawer mở với trạng thái mới, kể cả khi bản ghi rời khỏi tab hiện tại.
            setOpened((o) => ({ ...o, status: updated.status, reviewedAt: updated.reviewedAt }));
            obs.reload();
          }}
          onDeleted={() => {
            setOpened(null);
            obs.reload();
          }}
        />
      )}
      {creating && (
        <NewObservationDrawer
          species={sortedSpecies}
          onClose={() => setCreating(false)}
          onCreated={() => {
            setCreating(false);
            setTab('PENDING');
            obs.reload();
          }}
        />
      )}
    </div>
  );
}

function ObservationDrawer({ obs, user, canReview, isAdmin, onClose, onChanged, onDeleted }) {
  const [state, setState] = useState({ busy: null, error: null, confirmDelete: false });
  const own = obs.observer?.id === user.id;
  const mayReview = canReview && (!own || isAdmin);
  const mayDelete = own || isAdmin;

  async function review(status) {
    setState({ busy: status, error: null, confirmDelete: false });
    try {
      const updated = await api(`/observations/${obs.id}/status`, { method: 'PATCH', body: { status } });
      setState({ busy: null, error: null, confirmDelete: false, done: status });
      onChanged(updated);
    } catch (err) {
      setState({ busy: null, error: err.message, confirmDelete: false });
    }
  }

  async function remove() {
    if (!state.confirmDelete) return setState((s) => ({ ...s, confirmDelete: true }));
    setState((s) => ({ ...s, busy: 'delete' }));
    try {
      await api(`/observations/${obs.id}`, { method: 'DELETE' });
      onDeleted();
    } catch (err) {
      setState({ busy: null, error: err.message, confirmDelete: false });
    }
  }

  return (
    <Drawer
      title={obs.species.name}
      subtitle={`${fmtDate(obs.observedAt)} · ${obs.place}`}
      onClose={onClose}
      footer={
        <>
          {state.error && <span className="field__error">{state.error}</span>}
          {state.done && !state.error && (
            <span className="saved">
              <Icon name="check" size={14} />
              {state.done === 'APPROVED' ? 'Đã duyệt' : 'Đã từ chối'}
            </span>
          )}
          {mayDelete && (
            <button type="button" className="btn btn--danger" onClick={remove} disabled={Boolean(state.busy)}>
              {state.confirmDelete ? 'Bấm lần nữa để xoá' : 'Xoá'}
            </button>
          )}
          {mayReview && obs.status !== 'REJECTED' && (
            <button type="button" className="btn" onClick={() => review('REJECTED')} disabled={Boolean(state.busy)} data-state={state.busy === 'REJECTED' ? 'loading' : undefined}>
              Từ chối
            </button>
          )}
          {mayReview && obs.status !== 'APPROVED' && (
            <button type="button" className="btn btn--primary" onClick={() => review('APPROVED')} disabled={Boolean(state.busy)} data-state={state.busy === 'APPROVED' ? 'loading' : undefined}>
              Duyệt
            </button>
          )}
        </>
      }
    >
      {own && !isAdmin && obs.status === 'PENDING' && (
        <div className="notice">
          <Icon name="info" />
          <span>Đây là bản ghi của bạn — cần một kiểm lâm hoặc quản trị viên khác duyệt.</span>
        </div>
      )}
      <dl className="dl">
        <dt>Trạng thái</dt>
        <dd>
          <ObsStatusBadge status={obs.status} />
        </dd>
        <dt>Loài</dt>
        <dd>
          {obs.species.name}
          {obs.species.name !== obs.species.scientificName && <div className="cell-sub sci">{obs.species.scientificName}</div>}
        </dd>
        <dt>Ngày ghi nhận</dt>
        <dd className="num">{fmtDate(obs.observedAt)}</dd>
        <dt>Địa điểm</dt>
        <dd>{obs.place}</dd>
        <dt>Toạ độ</dt>
        <dd className="num mono">{fmtCoord(obs.lat, obs.lng)}</dd>
        <dt>Số lượng</dt>
        <dd className="num">{fmtNum(obs.count)}</dd>
        <dt>Loại bản ghi</dt>
        <dd>{BASIS[obs.basisOfRecord]}</dd>
        {obs.preparations && (
          <>
            <dt>Mẫu vật</dt>
            <dd>{obs.preparations}</dd>
          </>
        )}
        <dt>Người ghi nhận</dt>
        <dd>{obs.observer?.name ?? obs.identifiedBy ?? '—'}</dd>
        {obs.dataset && (
          <>
            <dt>Bộ dữ liệu</dt>
            <dd>
              {obs.dataset.name}
              <div className="cell-sub mono">{obs.dataset.code}</div>
            </dd>
          </>
        )}
        {obs.note && (
          <>
            <dt>Ghi chú</dt>
            <dd>{obs.note}</dd>
          </>
        )}
        <dt>Tạo lúc</dt>
        <dd className="num">{fmtDateTime(obs.createdAt)}</dd>
      </dl>
    </Drawer>
  );
}

function today() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function NewObservationDrawer({ species, onClose, onCreated }) {
  const [form, setForm] = useState({ speciesId: '', place: '', count: '', lat: '', lng: '', observedAt: today(), note: '' });
  const [state, setState] = useState({ busy: false, error: null, locating: false, touched: false });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const lat = form.lat === '' ? undefined : Number(form.lat);
  const lng = form.lng === '' ? undefined : Number(form.lng);
  const errors = {
    speciesId: !form.speciesId && 'Chọn loài đã ghi nhận.',
    place: !form.place.trim() && 'Ghi tên địa điểm, ví dụ "Tiểu khu 63".',
    count: form.count !== '' && !(Number.isInteger(Number(form.count)) && Number(form.count) > 0) && 'Số lượng là số nguyên dương.',
    lat: lat !== undefined && !(lat >= -90 && lat <= 90) && 'Vĩ độ từ −90 đến 90.',
    lng: lng !== undefined && !(lng >= -180 && lng <= 180) && 'Kinh độ từ −180 đến 180.',
  };
  const invalid = Object.values(errors).some(Boolean);

  function locate() {
    if (!navigator.geolocation) return setState((s) => ({ ...s, error: 'Trình duyệt không hỗ trợ định vị.' }));
    setState((s) => ({ ...s, locating: true, error: null }));
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((f) => ({ ...f, lat: pos.coords.latitude.toFixed(6), lng: pos.coords.longitude.toFixed(6) }));
        setState((s) => ({ ...s, locating: false }));
      },
      () => setState((s) => ({ ...s, locating: false, error: 'Không lấy được vị trí. Cho phép quyền định vị hoặc nhập tay.' })),
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }

  async function submit(e) {
    e.preventDefault();
    setState((s) => ({ ...s, touched: true }));
    if (invalid) return;
    setState((s) => ({ ...s, busy: true, error: null }));
    try {
      await api('/observations', {
        method: 'POST',
        body: {
          speciesId: form.speciesId,
          place: form.place.trim(),
          note: form.note.trim() || undefined,
          count: form.count === '' ? undefined : Number(form.count),
          lat,
          lng,
          observedAt: form.observedAt || undefined,
        },
      });
      onCreated();
    } catch (err) {
      setState((s) => ({ ...s, busy: false, error: err.message }));
    }
  }

  const show = (k) => state.touched && errors[k];

  return (
    <Drawer
      title="Ghi nhận mới"
      subtitle="Bản ghi sẽ ở trạng thái chờ duyệt."
      onClose={onClose}
      footer={
        <>
          {state.error && <span className="field__error">{state.error}</span>}
          <button type="button" className="btn" onClick={onClose}>
            Huỷ
          </button>
          <button type="submit" form="obs-form" className="btn btn--primary" disabled={state.busy} data-state={state.busy ? 'loading' : undefined}>
            Gửi ghi nhận
          </button>
        </>
      }
    >
      <form id="obs-form" className="form-grid" onSubmit={submit} noValidate>
        <Field label="Loài" className="span-2" error={show('speciesId')}>
          {(id) => (
            <select id={id} className="select" value={form.speciesId} onChange={set('speciesId')} aria-invalid={Boolean(show('speciesId'))}>
              <option value="">Chọn loài…</option>
              {species.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name === s.scientificName ? s.name : `${s.name} — ${s.scientificName}`}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field label="Địa điểm" className="span-2" error={show('place')}>
          {(id) => <input id={id} className="input" value={form.place} onChange={set('place')} aria-invalid={Boolean(show('place'))} placeholder="VD: Tiểu khu 63, đường Hoàng Sa" />}
        </Field>
        <Field label="Ngày ghi nhận">{(id) => <input id={id} className="input" type="date" max={today()} value={form.observedAt} onChange={set('observedAt')} />}</Field>
        <Field label="Số cá thể" error={show('count')}>
          {(id) => <input id={id} className="input num" inputMode="numeric" value={form.count} onChange={set('count')} aria-invalid={Boolean(show('count'))} />}
        </Field>
        <Field label="Vĩ độ" error={show('lat')}>
          {(id) => <input id={id} className="input num" inputMode="decimal" placeholder="16.12" value={form.lat} onChange={set('lat')} aria-invalid={Boolean(show('lat'))} />}
        </Field>
        <Field label="Kinh độ" error={show('lng')}>
          {(id) => <input id={id} className="input num" inputMode="decimal" placeholder="108.27" value={form.lng} onChange={set('lng')} aria-invalid={Boolean(show('lng'))} />}
        </Field>
        <div className="span-2">
          <button type="button" className="btn btn--sm" onClick={locate} disabled={state.locating} data-state={state.locating ? 'loading' : undefined}>
            <Icon name="observations" size={14} />
            Dùng vị trí hiện tại
          </button>
        </div>
        <Field label="Ghi chú" className="span-2">
          {(id) => <textarea id={id} className="textarea" value={form.note} onChange={set('note')} placeholder="Hành vi, sinh cảnh, ảnh đã chụp…" />}
        </Field>
      </form>
    </Drawer>
  );
}
