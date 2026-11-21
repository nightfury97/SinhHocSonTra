import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { useApi } from '../api/useApi.js';
import Icon from './Icon.jsx';
import { Field } from './ui.jsx';
import { PhotoCredit } from './SpeciesPhoto.jsx';

const ACCEPT = 'image/jpeg,image/png,image/webp,image/tiff,image/avif';
const MAX_MB = 15;

/** Bộ ảnh của một loài: xem, tải lên nhiều ảnh, sửa chú thích/tác giả, chọn ảnh đại diện, xoá. */
export default function SpeciesGallery({ speciesId, speciesName, canEdit, onChanged, detail: shared }) {
  const own = useApi(shared ? null : `/species/${speciesId}`);
  const detail = shared ?? own;
  const images = detail.data?.images ?? [];
  const [currentId, setCurrentId] = useState(null);
  const [upload, setUpload] = useState(null); // { done, total, errors[] }
  const current = images.find((i) => i.id === currentId) ?? images[0];

  async function uploadFiles(fileList) {
    const files = [...fileList];
    if (files.length === 0) return;
    const errors = [];
    setUpload({ done: 0, total: files.length, errors });
    let lastId = null;
    for (const [i, file] of files.entries()) {
      if (file.size > MAX_MB * 1024 * 1024) {
        errors.push(`${file.name}: lớn hơn ${MAX_MB} MB`);
      } else {
        try {
          const created = await api(`/species/${speciesId}/images`, { method: 'POST', body: file });
          lastId = created.id;
        } catch (err) {
          errors.push(`${file.name}: ${err.message}`);
        }
      }
      setUpload({ done: i + 1, total: files.length, errors: [...errors] });
    }
    if (lastId) setCurrentId(lastId);
    detail.reload();
    onChanged?.();
  }

  return (
    <section className="gallery" aria-label={`Ảnh của ${speciesName}`}>
      <div className="gallery__stage">
        {detail.loading && !detail.data ? (
          <span className="skeleton" style={{ width: '60%' }} />
        ) : current ? (
          <>
            <img key={current.id} src={current.url} alt={current.caption || speciesName} width={current.width} height={current.height} decoding="async" />
            {current.isPrimary && images.length > 1 && (
              <span className="badge badge--ok gallery__primary">
                <Icon name="check" size={12} />
                Ảnh đại diện
              </span>
            )}
          </>
        ) : (
          <div className="gallery__empty">
            <Icon name="species" size={28} />
            <strong>Chưa có ảnh</strong>
            <span>{canEdit ? 'Tải ảnh lên bằng nút bên dưới. Ảnh đầu tiên sẽ thành ảnh đại diện.' : 'Ảnh của loài này sẽ được bổ sung sau.'}</span>
          </div>
        )}
      </div>

      {current && <PhotoCredit image={current} />}

      {images.length > 1 && (
        <div className="gallery__strip" role="list">
          {images.map((img) => (
            <button
              key={img.id}
              type="button"
              role="listitem"
              className="gallery__pick"
              aria-current={img.id === current?.id}
              aria-label={`Xem ảnh${img.caption ? `: ${img.caption}` : ''}`}
              onClick={() => setCurrentId(img.id)}
            >
              <img className="thumb" src={img.thumbUrl} alt="" width={56} height={56} loading="lazy" style={{ width: 56, height: 56 }} />
            </button>
          ))}
        </div>
      )}

      {canEdit && (
        <div className="inline-list" style={{ alignItems: 'center' }}>
          <label className="btn btn--sm upload-btn" data-state={upload && upload.done < upload.total ? 'loading' : undefined}>
            <Icon name="upload" size={14} />
            {upload && upload.done < upload.total ? `Đang tải ${upload.done + 1}/${upload.total}` : 'Thêm ảnh'}
            <input
              type="file"
              accept={ACCEPT}
              multiple
              disabled={Boolean(upload && upload.done < upload.total)}
              onChange={(e) => {
                uploadFiles(e.target.files);
                e.target.value = '';
              }}
            />
          </label>
          <span className="field__hint">JPEG, PNG hoặc WebP, tối đa {MAX_MB} MB. Thông tin GPS trong ảnh sẽ bị xoá.</span>
        </div>
      )}

      {upload?.errors.length > 0 && (
        <div className="notice notice--danger" role="alert">
          <Icon name="alert" />
          <ul className="report-list">
            {upload.errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      {canEdit && current && (
        <ImageMetaForm
          key={current.id}
          image={current}
          onSaved={() => {
            detail.reload();
            onChanged?.();
          }}
          onDeleted={() => {
            setCurrentId(null);
            detail.reload();
            onChanged?.();
          }}
        />
      )}
    </section>
  );
}

function ImageMetaForm({ image, onSaved, onDeleted }) {
  const [form, setForm] = useState({ caption: image.caption ?? '', credit: image.credit ?? '', license: image.license ?? '' });
  const [state, setState] = useState({ busy: null, error: null, saved: false, confirm: false });
  useEffect(() => setState((s) => ({ ...s, saved: false })), [form]);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function patch(body, kind) {
    setState({ busy: kind, error: null, saved: false, confirm: false });
    try {
      await api(`/species/images/${image.id}`, { method: 'PATCH', body });
      setState({ busy: null, error: null, saved: true, confirm: false });
      onSaved();
    } catch (err) {
      setState({ busy: null, error: err.message, saved: false, confirm: false });
    }
  }

  async function remove() {
    if (!state.confirm) return setState((s) => ({ ...s, confirm: true }));
    setState((s) => ({ ...s, busy: 'delete' }));
    try {
      await api(`/species/images/${image.id}`, { method: 'DELETE' });
      onDeleted();
    } catch (err) {
      setState({ busy: null, error: err.message, saved: false, confirm: false });
    }
  }

  const trimmed = (v) => v.trim() || null;

  return (
    <form
      className="form-grid"
      onSubmit={(e) => {
        e.preventDefault();
        patch({ caption: trimmed(form.caption), credit: trimmed(form.credit), license: trimmed(form.license) }, 'save');
      }}
    >
      <Field label="Chú thích ảnh" className="span-2">
        {(id) => <input id={id} className="input" value={form.caption} onChange={set('caption')} placeholder="VD: Cá thể trưởng thành, Tiểu khu 63" />}
      </Field>
      <Field label="Tác giả ảnh">{(id) => <input id={id} className="input" value={form.credit} onChange={set('credit')} />}</Field>
      <Field label="Giấy phép" hint="VD: CC BY 4.0, © GreenViet">
        {(id) => <input id={id} className="input" value={form.license} onChange={set('license')} />}
      </Field>
      <div className="span-2 inline-list" style={{ alignItems: 'center' }}>
        <button type="submit" className="btn btn--sm" disabled={Boolean(state.busy)} data-state={state.busy === 'save' ? 'loading' : undefined}>
          Lưu thông tin ảnh
        </button>
        {!image.isPrimary && (
          <button type="button" className="btn btn--sm" disabled={Boolean(state.busy)} onClick={() => patch({ isPrimary: true }, 'primary')} data-state={state.busy === 'primary' ? 'loading' : undefined}>
            Đặt làm ảnh đại diện
          </button>
        )}
        <button type="button" className="btn btn--sm btn--danger" disabled={Boolean(state.busy)} onClick={remove}>
          {state.confirm ? 'Bấm lần nữa để xoá ảnh' : 'Xoá ảnh'}
        </button>
        {state.saved && (
          <span className="saved">
            <Icon name="check" size={14} />
            Đã lưu
          </span>
        )}
        {state.error && <span className="field__error">{state.error}</span>}
      </div>
    </form>
  );
}
