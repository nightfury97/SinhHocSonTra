import { useMemo, useState } from 'react';
import { api, downloadFile } from '../api/client.js';
import { useApi } from '../api/useApi.js';
import { useAuth } from '../auth/AuthContext.jsx';
import { Drawer, Empty, ErrorState, Field, GroupLabel, Loading, PageHead } from '../components/ui.jsx';
import Icon from '../components/Icon.jsx';
import { BASIS } from '../lib/taxa.js';
import { fmtDateTime, fmtNum } from '../lib/format.js';
import { slugify } from '../lib/slug.js';

const KIND = { OCCURRENCE: 'Ghi nhận loài (Darwin Core)', TRANSECT: 'Khảo sát tuyến' };

export default function DatasetsPage() {
  const { can } = useAuth();
  const datasets = useApi('/datasets');
  const [openId, setOpenId] = useState(null);
  const [importing, setImporting] = useState(false);

  return (
    <div className="page">
      <PageHead
        title="Bộ dữ liệu"
        description="Mỗi file đã nhập là một bộ dữ liệu có mã riêng. Nhập lại cùng mã sẽ cập nhật bản cũ; xoá bộ dữ liệu sẽ xoá toàn bộ bản ghi thuộc bộ đó, giữ nguyên danh mục loài."
        actions={
          <>
            {can.edit && <ExportMenu />}
            {can.admin && (
              <button type="button" className="btn btn--primary" onClick={() => setImporting(true)}>
                <Icon name="upload" size={16} />
                Nhập file
              </button>
            )}
          </>
        }
      />

      <section className="panel">
        {datasets.error ? (
          <div className="panel__body">
            <ErrorState error={datasets.error} onRetry={datasets.reload} />
          </div>
        ) : datasets.loading && !datasets.data ? (
          <Loading />
        ) : datasets.data.length === 0 ? (
          <Empty title="Chưa có bộ dữ liệu nào">{can.admin ? 'Bấm "Nhập file" để thêm file CSV hoặc Excel.' : 'Quản trị viên sẽ nhập dữ liệu.'}</Empty>
        ) : (
          <div className="table-wrap">
            <table className="table table--stack">
              <thead>
                <tr>
                  <th>Bộ dữ liệu</th>
                  <th>Loại</th>
                  <th className="right">Bản ghi</th>
                  <th>Nhập lúc</th>
                </tr>
              </thead>
              <tbody>
                {datasets.data.map((d) => (
                  <tr key={d.id} data-clickable="true" tabIndex={0} aria-selected={d.id === openId} onClick={() => setOpenId(d.id)} onKeyDown={(e) => e.key === 'Enter' && setOpenId(d.id)}>
                    <td data-label="Bộ dữ liệu">
                      <div className="cell-title">{d.name}</div>
                      <div className="cell-sub mono">{d.code}</div>
                    </td>
                    <td data-label="Loại">{KIND[d.kind] ?? d.kind}</td>
                    <td data-label="Bản ghi" className="right">
                      {d.kind === 'TRANSECT' ? `${fmtNum(d._count.surveys)} lượt tuyến` : `${fmtNum(d._count.observations)} quan sát`}
                    </td>
                    <td data-label="Nhập lúc">
                      <span className="num">{fmtDateTime(d.importedAt)}</span>
                      <div className="cell-sub">{d.importedBy?.name ?? 'Dòng lệnh'}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {openId && (
        <DatasetDrawer
          key={openId}
          id={openId}
          canDelete={can.admin}
          onClose={() => setOpenId(null)}
          onDeleted={() => {
            setOpenId(null);
            datasets.reload();
          }}
        />
      )}
      {importing && (
        <ImportDrawer
          onClose={() => setImporting(false)}
          onImported={() => datasets.reload()}
        />
      )}
    </div>
  );
}

/** Xuất cơ sở dữ liệu ra file: Excel tổng hợp (bản giao nộp) và CSV Darwin Core (chia sẻ/GBIF). */
function ExportMenu() {
  const [state, setState] = useState({ busy: null, error: null, done: null });
  async function run(kind, path) {
    setState({ busy: kind, error: null, done: null });
    try {
      const name = await downloadFile(path);
      setState({ busy: null, error: null, done: name });
    } catch (err) {
      setState({ busy: null, error: err.message, done: null });
    }
  }
  return (
    <div className="inline-list" style={{ alignItems: 'center' }}>
      <button type="button" className="btn" disabled={Boolean(state.busy)} data-state={state.busy === 'xlsx' ? 'loading' : undefined} onClick={() => run('xlsx', '/export/database.xlsx')}>
        <Icon name="datasets" size={16} />
        Xuất Excel
      </button>
      <button type="button" className="btn" disabled={Boolean(state.busy)} data-state={state.busy === 'csv' ? 'loading' : undefined} onClick={() => run('csv', '/export/occurrences.csv')} title="Các quan sát đã duyệt theo chuẩn Darwin Core">
        <Icon name="datasets" size={16} />
        Xuất Darwin Core (CSV)
      </button>
      <span aria-live="polite">
        {state.done && (
          <span className="saved">
            <Icon name="check" size={14} />
            Đã tải {state.done}
          </span>
        )}
        {state.error && <span className="field__error">{state.error}</span>}
      </span>
    </div>
  );
}

function DatasetDrawer({ id, canDelete, onClose, onDeleted }) {
  const detail = useApi(`/datasets/${id}`);
  const [state, setState] = useState({ busy: false, error: null, confirm: false });
  const d = detail.data;

  async function remove() {
    if (!state.confirm) return setState((s) => ({ ...s, confirm: true }));
    setState({ busy: true, error: null, confirm: true });
    try {
      await api(`/datasets/${id}`, { method: 'DELETE' });
      onDeleted();
    } catch (err) {
      setState({ busy: false, error: err.message, confirm: false });
    }
  }

  return (
    <Drawer
      title={d?.name ?? 'Bộ dữ liệu'}
      subtitle={d && <span className="mono">{d.code}</span>}
      onClose={onClose}
      footer={
        canDelete &&
        d && (
          <>
            {state.error && <span className="field__error">{state.error}</span>}
            {state.confirm && !state.error && (
              <span className="field__error">
                Sẽ xoá vĩnh viễn {d.kind === 'TRANSECT' ? `${fmtNum(d._count.surveys)} lượt tuyến` : `${fmtNum(d._count.observations)} quan sát`}.
              </span>
            )}
            <button type="button" className="btn btn--danger" onClick={remove} disabled={state.busy} data-state={state.busy ? 'loading' : undefined}>
              {state.confirm ? 'Xác nhận xoá' : 'Xoá bộ dữ liệu'}
            </button>
          </>
        )
      }
    >
      {detail.error ? (
        <ErrorState error={detail.error} onRetry={detail.reload} />
      ) : !d ? (
        <Loading />
      ) : (
        <>
          <dl className="dl">
            <dt>Loại</dt>
            <dd>{KIND[d.kind]}</dd>
            <dt>File gốc</dt>
            <dd className="mono">{d.sourceFile ?? '—'}</dd>
            <dt>Đơn vị cung cấp</dt>
            <dd>{d.publisher ?? '—'}</dd>
            <dt>Nhập lúc</dt>
            <dd className="num">{fmtDateTime(d.importedAt)}</dd>
            <dt>Người nhập</dt>
            <dd>{d.importedBy?.name ?? 'Dòng lệnh (máy chủ)'}</dd>
            {d.kind === 'OCCURRENCE' && (
              <>
                <dt>Số quan sát</dt>
                <dd className="num">{fmtNum(d._count.observations)}</dd>
                <dt>Số loài</dt>
                <dd className="num">{fmtNum(d.stats.speciesCount)}</dd>
              </>
            )}
            {d.kind === 'TRANSECT' && (
              <>
                <dt>Lượt tuyến</dt>
                <dd className="num">{fmtNum(d._count.surveys)}</dd>
              </>
            )}
          </dl>
          {d.stats.byGroup.length > 0 && (
            <div>
              <h3 style={{ marginBottom: 'var(--space-xs)' }}>Theo nhóm</h3>
              <ul className="report-list" style={{ listStyle: 'none', padding: 0 }}>
                {d.stats.byGroup.map((g) => (
                  <li key={g.group} style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <GroupLabel group={g.group} />
                    <span className="num">{fmtNum(g.count)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {d.stats.byBasisOfRecord.length > 0 && (
            <div>
              <h3 style={{ marginBottom: 'var(--space-xs)' }}>Theo loại bản ghi</h3>
              <ul className="report-list" style={{ listStyle: 'none', padding: 0 }}>
                {d.stats.byBasisOfRecord.map((b) => (
                  <li key={b.basisOfRecord} style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>{BASIS[b.basisOfRecord]}</span>
                    <span className="num">{fmtNum(b.count)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </Drawer>
  );
}

function ImportDrawer({ onClose, onImported }) {
  const species = useApi('/species');
  const [file, setFile] = useState(null);
  const [over, setOver] = useState(false);
  const [form, setForm] = useState({ kind: 'occurrences', code: '', name: '', species: 'Pygathrix nemaeus', utmZone: '49' });
  const [state, setState] = useState({ busy: null, error: null, report: null, committed: false });
  const set = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    setState((s) => ({ ...s, report: null, committed: false }));
  };

  function pick(f) {
    if (!f) return;
    setFile(f);
    const base = f.name.replace(/\.[^.]+$/, '');
    setForm((prev) => ({
      ...prev,
      kind: /\.xlsx?$/i.test(f.name) ? 'transects' : 'occurrences',
      code: slugify(base),
      name: prev.name || base,
    }));
    setState({ busy: null, error: null, report: null, committed: false });
  }

  async function run(dryRun) {
    setState((s) => ({ ...s, busy: dryRun ? 'check' : 'commit', error: null }));
    try {
      const report = await api('/datasets/import', {
        method: 'POST',
        body: file,
        query: {
          kind: form.kind,
          filename: file.name,
          code: form.code || undefined,
          name: form.name || undefined,
          dryRun: dryRun ? 'true' : undefined,
          species: form.kind === 'transects' ? form.species : undefined,
          utmZone: form.kind === 'transects' ? form.utmZone : undefined,
        },
      });
      setState({ busy: null, error: null, report, committed: !dryRun });
      if (!dryRun) onImported();
    } catch (err) {
      setState((s) => ({ ...s, busy: null, error: err.message }));
    }
  }

  const sortedSpecies = useMemo(() => [...(species.data ?? [])].sort((a, b) => a.scientificName.localeCompare(b.scientificName)), [species.data]);

  return (
    <Drawer
      title="Nhập file dữ liệu"
      subtitle="Bước 1 kiểm tra thử (không ghi gì), bước 2 mới nhập vào cơ sở dữ liệu."
      onClose={onClose}
      footer={
        <>
          {state.error && <span className="field__error">{state.error}</span>}
          {state.committed ? (
            <button type="button" className="btn btn--primary" onClick={onClose}>
              Xong
            </button>
          ) : (
            <>
              <button type="button" className="btn" disabled={!file || Boolean(state.busy)} onClick={() => run(true)} data-state={state.busy === 'check' ? 'loading' : undefined}>
                Kiểm tra thử
              </button>
              <button
                type="button"
                className="btn btn--primary"
                disabled={!file || !state.report || Boolean(state.busy)}
                onClick={() => run(false)}
                data-state={state.busy === 'commit' ? 'loading' : undefined}
                title={!state.report ? 'Chạy kiểm tra thử trước' : undefined}
              >
                Nhập vào CSDL
              </button>
            </>
          )}
        </>
      }
    >
      <label
        className="dropzone"
        data-over={over}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          pick(e.dataTransfer.files[0]);
        }}
      >
        <Icon name="upload" size={22} />
        {file ? (
          <span>
            <strong className="mono">{file.name}</strong> · {fmtNum(Math.round(file.size / 1024))} KB
          </span>
        ) : (
          <span>Kéo file vào đây hoặc bấm để chọn</span>
        )}
        <span className="field__hint">CSV Darwin Core (ghi nhận loài) hoặc Excel khảo sát tuyến, tối đa 20 MB.</span>
        <input type="file" accept=".csv,.xlsx" className="visually-hidden" onChange={(e) => pick(e.target.files[0])} />
      </label>

      <div className="form-grid">
        <Field label="Loại dữ liệu" className="span-2">
          {(id) => (
            <select id={id} className="select" value={form.kind} onChange={set('kind')}>
              <option value="occurrences">Ghi nhận loài — CSV chuẩn Darwin Core</option>
              <option value="transects">Khảo sát tuyến — Excel, mỗi sheet một năm</option>
            </select>
          )}
        </Field>
        <Field label="Mã bộ dữ liệu" hint="Dùng lại mã cũ để cập nhật thay vì tạo bản mới.">
          {(id) => <input id={id} className="input mono" value={form.code} onChange={set('code')} />}
        </Field>
        <Field label="Tên hiển thị">{(id) => <input id={id} className="input" value={form.name} onChange={set('name')} />}</Field>
        {form.kind === 'transects' && (
          <>
            <Field label="Loài được khảo sát" hint="File không ghi tên loài — chọn loài mục tiêu.">
              {(id) => (
                <select id={id} className="select sci" value={form.species} onChange={set('species')}>
                  {sortedSpecies.map((s) => (
                    <option key={s.id} value={s.scientificName}>
                      {s.scientificName}
                      {s.name !== s.scientificName ? ` — ${s.name}` : ''}
                    </option>
                  ))}
                </select>
              )}
            </Field>
            <Field label="Múi UTM (Bắc)" hint="Đà Nẵng: 49">
              {(id) => <input id={id} className="input num" inputMode="numeric" value={form.utmZone} onChange={set('utmZone')} />}
            </Field>
          </>
        )}
      </div>

      {state.report && <ImportReport report={state.report} committed={state.committed} />}
    </Drawer>
  );
}

function ImportReport({ report, committed }) {
  const [showWarnings, setShowWarnings] = useState(false);
  const isTransect = Array.isArray(report.sheets);
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
      <div className={`notice ${committed ? 'notice--ok' : ''}`}>
        <Icon name={committed ? 'check' : 'info'} />
        <span>{committed ? 'Đã nhập vào cơ sở dữ liệu.' : 'Kết quả kiểm tra thử — chưa ghi gì. Xem kỹ rồi bấm "Nhập vào CSDL".'}</span>
      </div>

      {isTransect ? (
        report.sheets.map((s) => (
          <div key={s.sheet} className="panel">
            <div className="panel__head">
              <h3>
                {s.sheet} · năm {s.year}
              </h3>
              <span className={`badge ${s.totalRowCheck.startsWith('khớp') ? 'badge--ok' : 'badge--warn'}`}>
                <Icon name={s.totalRowCheck.startsWith('khớp') ? 'check' : 'alert'} size={12} />
                Dòng Total: {s.totalRowCheck}
              </span>
            </div>
            <div className="panel__body">
              <dl className="dl">
                <dt>Tuyến</dt>
                <dd className="num">{s.transects}</dd>
                <dt>Đàn</dt>
                <dd className="num">{s.sightings}</dd>
                <dt>Cá thể</dt>
                <dd className="num">{s.individuals}</dd>
              </dl>
              {s.flagged.length > 0 && (
                <>
                  <p style={{ margin: 'var(--space-sm) 0 var(--space-2xs)' }}>
                    <strong>{s.flagged.length} điểm sẽ bị gắn cờ:</strong>
                  </p>
                  <ul className="report-list">
                    {s.flagged.map((f) => (
                      <li key={f.group}>
                        <span className="mono">{f.group}</span> — {f.reason}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </div>
        ))
      ) : (
        <>
          <dl className="dl">
            <dt>Số dòng</dt>
            <dd className="num">{fmtNum(report.rows)}</dd>
            <dt>{committed ? 'Thêm mới' : 'Sẽ nhập'}</dt>
            <dd className="num">{fmtNum(report.imported)}</dd>
            <dt>Cập nhật</dt>
            <dd className="num">{fmtNum(report.updated)}</dd>
            <dt>Loài mới</dt>
            <dd className="num">{fmtNum(report.speciesCreated)}</dd>
            <dt>Bỏ qua</dt>
            <dd className="num">{fmtNum(report.skipped.length)}</dd>
            <dt>Cảnh báo</dt>
            <dd className="num">{fmtNum(report.warnings.length)}</dd>
          </dl>
          {report.skipped.length > 0 && (
            <div className="notice notice--danger">
              <Icon name="alert" />
              <ul className="report-list">
                {report.skipped.slice(0, 20).map((s) => (
                  <li key={s.row}>
                    Dòng {s.row}: {s.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {report.warnings.length > 0 && (
            <div>
              <button type="button" className="btn btn--sm" onClick={() => setShowWarnings((v) => !v)} aria-expanded={showWarnings}>
                {showWarnings ? 'Ẩn cảnh báo' : `Xem ${fmtNum(report.warnings.length)} cảnh báo`}
              </button>
              {showWarnings && (
                <ul className="report-list" style={{ marginTop: 'var(--space-xs)' }}>
                  {report.warnings.map((w, i) => (
                    <li key={i}>
                      Dòng {w.row}: {w.message}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}
