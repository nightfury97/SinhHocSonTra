import { useState } from 'react';
import { api } from '../api/client.js';
import { useApi } from '../api/useApi.js';
import { useAuth } from '../auth/AuthContext.jsx';
import { Drawer, ErrorState, Field, Loading, PageHead } from '../components/ui.jsx';
import Icon from '../components/Icon.jsx';
import { ResetPasswordDrawer } from '../components/PasswordDrawers.jsx';
import { ROLES } from '../lib/taxa.js';
import { fmtDate } from '../lib/format.js';

const ROLE_HINT = {
  ADMIN: 'Toàn quyền: nhập/xoá bộ dữ liệu, xoá loài, quản lý tài khoản.',
  RANGER: 'Biên tập loài, duyệt quan sát của người khác, sửa điểm khảo sát.',
  VIEWER: 'Xem dữ liệu và gửi quan sát (chờ duyệt).',
};

export default function UsersPage() {
  const { user: me } = useAuth();
  const users = useApi('/users');
  const [rowState, setRowState] = useState({});
  const [creating, setCreating] = useState(false);
  const [resetting, setResetting] = useState(null);

  async function changeRole(u, role) {
    const prev = u.role;
    users.mutate((list) => list.map((x) => (x.id === u.id ? { ...x, role } : x)));
    setRowState((s) => ({ ...s, [u.id]: { busy: true } }));
    try {
      await api(`/users/${u.id}/role`, { method: 'PATCH', body: { role } });
      setRowState((s) => ({ ...s, [u.id]: { saved: true } }));
    } catch (err) {
      users.mutate((list) => list.map((x) => (x.id === u.id ? { ...x, role: prev } : x)));
      setRowState((s) => ({ ...s, [u.id]: { error: err.message } }));
    }
  }

  return (
    <div className="page">
      <PageHead
        title="Người dùng"
        description="Tài khoản mới mặc định chỉ được xem. Nâng quyền Kiểm lâm cho người cần biên tập và duyệt dữ liệu."
        actions={
          <button type="button" className="btn btn--primary" onClick={() => setCreating(true)}>
            <Icon name="plus" size={16} />
            Thêm tài khoản
          </button>
        }
      />

      <section className="panel">
        {users.error ? (
          <div className="panel__body">
            <ErrorState error={users.error} onRetry={users.reload} />
          </div>
        ) : users.loading && !users.data ? (
          <Loading />
        ) : (
          <div className="table-wrap">
            <table className="table table--stack">
              <thead>
                <tr>
                  <th>Tên</th>
                  <th>Email</th>
                  <th>Vai trò</th>
                  <th>Tạo ngày</th>
                  <th>
                    <span className="sr-only">Thao tác</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.data.map((u) => {
                  const st = rowState[u.id] ?? {};
                  const self = u.id === me.id;
                  return (
                    <tr key={u.id}>
                      <td data-label="Tên" className="cell-title">
                        {u.name}
                        {self && <span className="cell-sub"> (bạn)</span>}
                      </td>
                      <td data-label="Email">{u.email}</td>
                      <td data-label="Vai trò">
                        <select
                          className="select"
                          style={{ maxWidth: 160 }}
                          aria-label={`Vai trò của ${u.name}`}
                          value={u.role}
                          disabled={self || st.busy}
                          title={self ? 'Không thể tự đổi vai trò của mình' : ROLE_HINT[u.role]}
                          onChange={(e) => changeRole(u, e.target.value)}
                        >
                          {Object.entries(ROLES).map(([v, l]) => (
                            <option key={v} value={v}>
                              {l}
                            </option>
                          ))}
                        </select>
                        {st.error && <div className="field__error">{st.error}</div>}
                      </td>
                      <td data-label="Tạo ngày" className="num">
                        {fmtDate(u.createdAt)}
                      </td>
                      <td data-label="Thao tác">
                        <button type="button" className="btn btn--sm" onClick={() => setResetting(u)} aria-label={`Đặt lại mật khẩu của ${u.name}`}>
                          <Icon name="key" size={14} />
                          Đặt lại mật khẩu
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="panel">
        <div className="panel__head">
          <h2>Quyền theo vai trò</h2>
        </div>
        <div className="panel__body">
          <dl className="dl">
            {Object.entries(ROLES).map(([v, l]) => (
              <div key={v} style={{ display: 'contents' }}>
                <dt>{l}</dt>
                <dd>{ROLE_HINT[v]}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {resetting && <ResetPasswordDrawer target={resetting} onClose={() => setResetting(null)} />}

      {creating && (
        <NewUserDrawer
          onClose={() => setCreating(false)}
          onCreated={() => {
            setCreating(false);
            users.reload();
          }}
        />
      )}
    </div>
  );
}

function NewUserDrawer({ onClose, onCreated }) {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'RANGER' });
  const [state, setState] = useState({ busy: false, error: null });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const valid = form.name.trim() && /\S+@\S+\.\S+/.test(form.email) && form.password.length >= 8;

  async function submit(e) {
    e.preventDefault();
    if (!valid) return;
    setState({ busy: true, error: null });
    try {
      await api('/users', {
        method: 'POST',
        body: { name: form.name.trim(), email: form.email.trim(), password: form.password, role: form.role },
      });
      onCreated();
    } catch (err) {
      setState({ busy: false, error: err.message });
    }
  }

  return (
    <Drawer
      title="Thêm tài khoản"
      subtitle="Gửi mật khẩu ban đầu cho người dùng qua kênh riêng."
      onClose={onClose}
      footer={
        <>
          {state.error && <span className="field__error">{state.error}</span>}
          <button type="button" className="btn" onClick={onClose}>
            Huỷ
          </button>
          <button type="submit" form="user-form" className="btn btn--primary" disabled={!valid || state.busy} data-state={state.busy ? 'loading' : undefined}>
            Tạo tài khoản
          </button>
        </>
      }
    >
      <form id="user-form" className="form-grid" onSubmit={submit}>
        <Field label="Họ tên" className="span-2">
          {(id) => <input id={id} className="input" value={form.name} onChange={set('name')} autoComplete="off" />}
        </Field>
        <Field label="Email" className="span-2">
          {(id) => <input id={id} className="input" type="email" value={form.email} onChange={set('email')} autoComplete="off" />}
        </Field>
        <Field label="Mật khẩu ban đầu" hint="Tối thiểu 8 ký tự.">
          {(id) => <input id={id} className="input" type="password" value={form.password} onChange={set('password')} autoComplete="new-password" />}
        </Field>
        <Field label="Vai trò" hint={ROLE_HINT[form.role]}>
          {(id) => (
            <select id={id} className="select" value={form.role} onChange={set('role')}>
              {Object.entries(ROLES).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          )}
        </Field>
      </form>
    </Drawer>
  );
}
