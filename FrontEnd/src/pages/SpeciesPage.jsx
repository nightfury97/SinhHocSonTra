import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api/client.js';
import { useApi } from '../api/useApi.js';
import { useAuth } from '../auth/AuthContext.jsx';
import { Drawer, Empty, ErrorState, Field, GroupLabel, IucnBadge, Loading, PageHead } from '../components/ui.jsx';
import Icon from '../components/Icon.jsx';
import SpeciesGallery from '../components/SpeciesGallery.jsx';
import TaxonomyTree from '../components/TaxonomyTree.jsx';
import { SpeciesThumb } from '../components/SpeciesPhoto.jsx';
import { GROUPS, GROUP_BY_VALUE, IUCN, IUCN_BY_VALUE, needsCuration } from '../lib/taxa.js';
import { fmtNum } from '../lib/format.js';
import { slugify } from '../lib/slug.js';

export default function SpeciesPage() {
  const { can } = useAuth();
  const [params, setParams] = useSearchParams();
  const species = useApi('/species');
  const [q, setQ] = useState('');
  const [group, setGroup] = useState('');
  const [status, setStatus] = useState('');
  const curationOnly = params.get('loc') === 'can-bien-tap';
  const openId = params.get('id');
  const treeView = params.get('xem') === 'cay';

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (species.data ?? [])
      .filter((s) => !group || s.group === group)
      .filter((s) => !status || s.status === status)
      .filter((s) => !curationOnly || needsCuration(s))
      .filter(
        (s) =>
          !needle ||
          s.name.toLowerCase().includes(needle) ||
          s.scientificName.toLowerCase().includes(needle) ||
          (s.family ?? '').toLowerCase().includes(needle)
      );
  }, [species.data, q, group, status, curationOnly]);

  const setParam = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  const filtering = Boolean(q.trim() || group || status || curationOnly);
  const selected = openId === 'moi' ? {} : species.data?.find((s) => s.id === openId);
  const curationCount = (species.data ?? []).filter(needsCuration).length;

  return (
    <div className="page">
      <PageHead
        title="Danh mục loài"
        description="Mỗi loài có một tên khoa học duy nhất; quan sát và khảo sát đều gắn về đây. Loài nhập tự động từ bộ dữ liệu cần bổ sung tên Việt và hạng IUCN."
        actions={
          can.edit && (
            <button type="button" className="btn btn--primary" onClick={() => setParam('id', 'moi')}>
              <Icon name="plus" size={16} />
              Thêm loài
            </button>
          )
        }
      />

      {curationCount > 0 && !curationOnly && (
        <div className="notice notice--warn">
          <Icon name="flag" />
          <span>
            {fmtNum(curationCount)} loài đang hiển thị bằng tên khoa học hoặc chưa có hạng IUCN.{' '}
            <button type="button" className="btn btn--sm" onClick={() => setParam('loc', 'can-bien-tap')}>
              Xem danh sách cần biên tập
            </button>
          </span>
        </div>
      )}

      <div className="tabs" role="tablist" aria-label="Cách xem">
        <button type="button" role="tab" className="tab" aria-selected={!treeView} onClick={() => setParam('xem', '')}>
          Danh sách
        </button>
        <button type="button" role="tab" className="tab" aria-selected={treeView} onClick={() => setParam('xem', 'cay')}>
          Cây phân loại
        </button>
      </div>

      <section className="panel">
        <div className="panel__head">
          <div className="toolbar" style={{ flex: 1 }}>
            <Field label="Tìm" className="field--grow">
              {(id) => (
                <input id={id} className="input" type="search" placeholder="Tên Việt, tên khoa học hoặc họ" value={q} onChange={(e) => setQ(e.target.value)} />
              )}
            </Field>
            <Field label="Nhóm">
              {(id) => (
                <select id={id} className="select" value={group} onChange={(e) => setGroup(e.target.value)}>
                  <option value="">Tất cả nhóm</option>
                  {GROUPS.map((g) => (
                    <option key={g.value} value={g.value}>
                      {g.label}
                    </option>
                  ))}
                </select>
              )}
            </Field>
            <Field label="Hạng IUCN">
              {(id) => (
                <select id={id} className="select" value={status} onChange={(e) => setStatus(e.target.value)}>
                  <option value="">Tất cả hạng</option>
                  {IUCN.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.value} · {s.label}
                    </option>
                  ))}
                </select>
              )}
            </Field>
            <label className="check">
              <input type="checkbox" checked={curationOnly} onChange={(e) => setParam('loc', e.target.checked ? 'can-bien-tap' : '')} />
              Chỉ loài cần biên tập
            </label>
          </div>
        </div>

        {species.error ? (
          <div className="panel__body">
            <ErrorState error={species.error} onRetry={species.reload} />
          </div>
        ) : species.loading && !species.data ? (
          <Loading rows={6} />
        ) : rows.length === 0 ? (
          <Empty title="Không có loài nào khớp bộ lọc">Bỏ bớt điều kiện lọc hoặc đổi từ khoá tìm kiếm.</Empty>
        ) : treeView ? (
          <>
            <TaxonomyTree species={rows} forceOpen={filtering} onOpen={(id) => setParam('id', id)} />
            <div className="pager">
              <span className="muted num">
                {fmtNum(rows.length)} / {fmtNum(species.data.length)} loài
              </span>
            </div>
          </>
        ) : (
          <>
            <div className="table-wrap">
              <table className="table table--stack">
                <thead>
                  <tr>
                    <th>Loài</th>
                    <th>Nhóm</th>
                    <th>Họ · Bộ</th>
                    <th>IUCN</th>
                    <th className="right">Bản ghi</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((s) => (
                    <tr
                      key={s.id}
                      data-clickable="true"
                      aria-selected={s.id === openId}
                      tabIndex={0}
                      onClick={() => setParam('id', s.id)}
                      onKeyDown={(e) => e.key === 'Enter' && setParam('id', s.id)}
                    >
                      <td data-label="Loài">
                        <div className="species-cell">
                          <SpeciesThumb species={s} />
                          <div style={{ minWidth: 0 }}>
                            <div className="cell-title">
                              {s.name === s.scientificName ? <span className="sci">{s.name}</span> : s.name}
                            </div>
                            {s.name !== s.scientificName && <div className="cell-sub sci">{s.scientificName}</div>}
                          </div>
                        </div>
                      </td>
                      <td data-label="Nhóm">
                        <GroupLabel group={s.group} />
                      </td>
                      <td data-label="Họ · Bộ">
                        {s.family ?? '—'}
                        {s.taxonOrder && <div className="cell-sub">{s.taxonOrder}</div>}
                      </td>
                      <td data-label="IUCN">
                        <IucnBadge status={s.status} />
                      </td>
                      <td data-label="Bản ghi" className="right">
                        {fmtNum(s._count.observations)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="pager">
              <span className="muted num">
                {fmtNum(rows.length)} / {fmtNum(species.data.length)} loài
              </span>
            </div>
          </>
        )}
      </section>

      {selected && (
        <SpeciesDrawer
          key={openId}
          species={selected}
          canEdit={can.edit}
          canDelete={can.admin}
          onClose={() => setParam('id', '')}
          onSaved={(saved) => {
            species.reload();
            if (!selected.id) setParam('id', saved.id);
          }}
          onImagesChanged={species.reload}
          onDeleted={() => {
            setParam('id', '');
            species.reload();
          }}
        />
      )}
    </div>
  );
}

const EMPTY = {
  name: '',
  scientificName: '',
  authorship: '',
  group: 'MAMMAL',
  status: 'NE',
  taxonClass: '',
  taxonOrder: '',
  family: '',
  populationLabel: '',
  description: '',
  habitat: '',
  threats: '',
  featured: false,
};

function toForm(s) {
  const f = { ...EMPTY };
  for (const k of Object.keys(EMPTY)) if (s[k] !== undefined && s[k] !== null) f[k] = s[k];
  f.threats = Array.isArray(s.threats) ? s.threats.join(', ') : '';
  return f;
}

function SpeciesDrawer({ species, canEdit, canDelete, onClose, onSaved, onDeleted, onImagesChanged }) {
  const isNew = !species.id;
  const [form, setForm] = useState(() => toForm(species));
  const [state, setState] = useState({ busy: false, error: null, saved: false, confirmDelete: false });
  const set = (k) => (e) => {
    const v = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [k]: v }));
    setState((s) => ({ ...s, saved: false }));
  };
  const nameMissing = !form.name.trim() || form.name.trim() === form.scientificName.trim();

  async function save(e) {
    e.preventDefault();
    setState({ busy: true, error: null, saved: false, confirmDelete: false });
    const sci = form.scientificName.trim();
    const body = {
      ...form,
      name: form.name.trim() || sci,
      scientificName: sci,
      statusLabel: IUCN_BY_VALUE[form.status]?.label ?? null,
      threats: form.threats
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
    };
    for (const k of ['authorship', 'taxonClass', 'taxonOrder', 'family', 'populationLabel', 'description', 'habitat']) {
      body[k] = body[k]?.trim() || null;
    }
    if (isNew) {
      body.slug = slugify(sci);
      const [genus = '', epithet = ''] = sci.split(/\s+/);
      body.genus = genus || null;
      body.tag = ((genus[0] ?? '?').toUpperCase() + (epithet[0] ?? '').toLowerCase()).slice(0, 4);
    }
    try {
      const saved = await api(isNew ? '/species' : `/species/${species.id}`, { method: isNew ? 'POST' : 'PUT', body });
      setState({ busy: false, error: null, saved: true, confirmDelete: false });
      onSaved(saved);
    } catch (err) {
      setState({ busy: false, error: err.message, saved: false, confirmDelete: false });
    }
  }

  async function remove() {
    if (!state.confirmDelete) return setState((s) => ({ ...s, confirmDelete: true }));
    setState((s) => ({ ...s, busy: true }));
    try {
      await api(`/species/${species.id}`, { method: 'DELETE' });
      onDeleted();
    } catch (err) {
      setState({ busy: false, error: err.message, saved: false, confirmDelete: false });
    }
  }

  const readOnly = !canEdit;

  return (
    <Drawer
      title={isNew ? 'Thêm loài' : species.name}
      subtitle={!isNew && <span className="sci">{species.scientificName}</span>}
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
          {canDelete && !isNew && (
            <button type="button" className="btn btn--danger" onClick={remove} disabled={state.busy}>
              {state.confirmDelete ? 'Bấm lần nữa để xoá' : 'Xoá loài'}
            </button>
          )}
          {canEdit && (
            <button type="submit" form="species-form" className="btn btn--primary" data-state={state.busy ? 'loading' : undefined} disabled={state.busy || !form.scientificName.trim()}>
              {isNew ? 'Tạo loài' : 'Lưu thay đổi'}
            </button>
          )}
        </>
      }
    >
      {isNew ? (
        <p className="field__hint">Tạo loài trước, sau đó mở lại để thêm ảnh.</p>
      ) : (
        <SpeciesGallery speciesId={species.id} speciesName={species.name} canEdit={canEdit} onChanged={onImagesChanged} />
      )}

      {!isNew && (
        <dl className="dl">
          <dt>Nhóm</dt>
          <dd>{GROUP_BY_VALUE[species.group]?.label}</dd>
          <dt>Số bản ghi</dt>
          <dd className="num">{fmtNum(species._count?.observations ?? 0)}</dd>
          <dt>Hạng IUCN</dt>
          <dd>
            <IucnBadge status={species.status} long />
          </dd>
        </dl>
      )}

      {!isNew && nameMissing && canEdit && (
        <div className="notice notice--warn">
          <Icon name="flag" />
          <span>Loài này chưa có tên tiếng Việt. Điền tên thông dụng để danh mục và bản đồ dễ đọc hơn.</span>
        </div>
      )}

      <form id="species-form" className="form-grid" onSubmit={save}>
        <Field label="Tên tiếng Việt" className="span-2" hint="Để trống thì hiển thị bằng tên khoa học.">
          {(id) => <input id={id} className="input" value={form.name === form.scientificName ? '' : form.name} onChange={set('name')} disabled={readOnly} />}
        </Field>
        <Field label="Tên khoa học" hint="Chi + tính ngữ, không kèm tác giả.">
          {(id) => <input id={id} className="input sci" value={form.scientificName} onChange={set('scientificName')} disabled={readOnly || !isNew} required />}
        </Field>
        <Field label="Tác giả định danh">
          {(id) => <input id={id} className="input" value={form.authorship} onChange={set('authorship')} disabled={readOnly} />}
        </Field>
        <Field label="Nhóm">
          {(id) => (
            <select id={id} className="select" value={form.group} onChange={set('group')} disabled={readOnly}>
              {GROUPS.map((g) => (
                <option key={g.value} value={g.value}>
                  {g.label}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field label="Hạng IUCN">
          {(id) => (
            <select id={id} className="select" value={form.status} onChange={set('status')} disabled={readOnly}>
              {IUCN.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.value} · {s.label}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field label="Lớp">{(id) => <input id={id} className="input" value={form.taxonClass} onChange={set('taxonClass')} disabled={readOnly} />}</Field>
        <Field label="Bộ">{(id) => <input id={id} className="input" value={form.taxonOrder} onChange={set('taxonOrder')} disabled={readOnly} />}</Field>
        <Field label="Họ">{(id) => <input id={id} className="input" value={form.family} onChange={set('family')} disabled={readOnly} />}</Field>
        <Field label="Quy mô quần thể" hint="Ví dụ: ~1.300 cá thể">
          {(id) => <input id={id} className="input" value={form.populationLabel} onChange={set('populationLabel')} disabled={readOnly} />}
        </Field>
        <Field label="Mô tả" className="span-2">
          {(id) => <textarea id={id} className="textarea" value={form.description} onChange={set('description')} disabled={readOnly} />}
        </Field>
        <Field label="Sinh cảnh" className="span-2">
          {(id) => <textarea id={id} className="textarea" value={form.habitat} onChange={set('habitat')} disabled={readOnly} />}
        </Field>
        <Field label="Mối đe doạ" className="span-2" hint="Phân tách bằng dấu phẩy.">
          {(id) => <input id={id} className="input" value={form.threats} onChange={set('threats')} disabled={readOnly} />}
        </Field>
        <label className="check span-2">
          <input type="checkbox" checked={form.featured} onChange={set('featured')} disabled={readOnly} />
          Loài trọng điểm (hiện ở tổng quan quần thể)
        </label>
      </form>
    </Drawer>
  );
}
