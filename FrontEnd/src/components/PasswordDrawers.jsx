import { useState } from 'react';
import { api } from '../api/client.js';
import { Drawer, Field } from './ui.jsx';
import Icon from './Icon.jsx';

const MIN = 8;

/** Người dùng tự đổi mật khẩu của mình. */
export function ChangePasswordDrawer({ onClose }) {
  const [form, setForm] = useState({ current: '', next: '', confirm: '' });
  const [state, setState] = useState({ busy: false, error: null, done: false });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const mismatch = form.confirm && form.next !== form.confirm;
  const valid = form.current && form.next.length >= MIN && form.next === form.confirm;

  async function submit(e) {
    e.preventDefault();
    if (!valid) return;
    setState({ busy: true, error: null, done: false });
    try {
      await api('/auth/change-password', { method: 'POST', body: { currentPassword: form.current, newPassword: form.next } });
      setState({ busy: false, error: null, done: true });
    } catch (err) {
      setState({ busy: false, error: err.message, done: false });
    }
  }

  return (
    <Drawer
      title="Đổi mật khẩu"
      onClose={onClose}
      footer={
        <>
          {state.error && <span className="field__error">{state.error}</span>}
          <button type="button" className="btn" onClick={onClose}>
            {state.done ? 'Đóng' : 'Huỷ'}
          </button>
          {!state.done && (
            <button type="submit" form="pw-form" className="btn btn--primary" disabled={!valid || state.busy} data-state={state.busy ? 'loading' : undefined}>
              Đổi mật khẩu
            </button>
          )}
        </>
      }
    >
      {state.done ? (
        <div className="notice notice--ok" role="status">
          <Icon name="check" />
          <span>Đã đổi mật khẩu. Dùng mật khẩu mới ở lần đăng nhập sau.</span>
        </div>
      ) : (
        <form id="pw-form" className="form-grid" onSubmit={submit}>
          <Field label="Mật khẩu hiện tại" className="span-2">
            {(id) => <input id={id} className="input" type="password" value={form.current} onChange={set('current')} autoComplete="current-password" autoFocus />}
          </Field>
          <Field label="Mật khẩu mới" hint={`Tối thiểu ${MIN} ký tự.`} className="span-2">
            {(id) => <input id={id} className="input" type="password" value={form.next} onChange={set('next')} autoComplete="new-password" />}
          </Field>
          <Field label="Nhập lại mật khẩu mới" error={mismatch ? 'Hai mật khẩu chưa khớp.' : undefined} className="span-2">
            {(id) => <input id={id} className="input" type="password" value={form.confirm} onChange={set('confirm')} autoComplete="new-password" />}
          </Field>
        </form>
      )}
    </Drawer>
  );
}

/** Quản trị viên đặt lại mật khẩu cho người khác. */
export function ResetPasswordDrawer({ target, onClose }) {
  const [password, setPassword] = useState('');
  const [state, setState] = useState({ busy: false, error: null, done: false });

  async function submit(e) {
    e.preventDefault();
    if (password.length < MIN) return;
    setState({ busy: true, error: null, done: false });
    try {
      await api(`/users/${target.id}/password`, { method: 'POST', body: { password } });
      setState({ busy: false, error: null, done: true });
    } catch (err) {
      setState({ busy: false, error: err.message, done: false });
    }
  }

  return (
    <Drawer
      title="Đặt lại mật khẩu"
      subtitle={`${target.name} · ${target.email}`}
      onClose={onClose}
      footer={
        <>
          {state.error && <span className="field__error">{state.error}</span>}
          <button type="button" className="btn" onClick={onClose}>
            {state.done ? 'Đóng' : 'Huỷ'}
          </button>
          {!state.done && (
            <button type="submit" form="reset-form" className="btn btn--primary" disabled={password.length < MIN || state.busy} data-state={state.busy ? 'loading' : undefined}>
              Đặt mật khẩu
            </button>
          )}
        </>
      }
    >
      {state.done ? (
        <div className="notice notice--ok" role="status">
          <Icon name="check" />
          <span>Đã đặt lại mật khẩu. Gửi mật khẩu cho người dùng qua kênh riêng và nhắc họ đổi lại sau khi đăng nhập.</span>
        </div>
      ) : (
        <form id="reset-form" className="form-grid" onSubmit={submit}>
          <Field label="Mật khẩu mới" hint={`Tối thiểu ${MIN} ký tự. Phiên đăng nhập đang mở của họ vẫn còn hiệu lực đến khi hết hạn.`} className="span-2">
            {(id) => <input id={id} className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" autoFocus />}
          </Field>
        </form>
      )}
    </Drawer>
  );
}
