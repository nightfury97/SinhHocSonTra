import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { Field } from '../components/ui.jsx';
import Icon from '../components/Icon.jsx';
import { CONTOURS } from '../components/loginContours.js';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  // Chỉ quay lại đường dẫn nội bộ, không cho chuyển hướng ra ngoài.
  const next = params.get('tiep')?.startsWith('/') && !params.get('tiep').startsWith('//') ? params.get('tiep') : '/';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [reveal, setReveal] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(email.trim(), password);
      navigate(next, { replace: true });
    } catch (err) {
      setError(err.message);
      setAttempt((n) => n + 1);
      setBusy(false);
    }
  }

  return (
    <div className="login">
      <aside className="login__aside">
        <svg className="login__contours" viewBox="0 0 660 600" preserveAspectRatio="xMaxYMax slice" aria-hidden="true">
          <g>
            {CONTOURS.map((d, i) => (
              <path key={i} d={d} pathLength="1" style={{ '--i': i }} />
            ))}
          </g>
        </svg>

        <div className="login__brand rise" style={{ '--d': 0 }}>
          <span className="login__mark" aria-hidden="true">
            <Icon name="leaf" size={20} />
          </span>
          <div>
            <strong>Sơn Trà</strong>
            <span>Phần mềm quản lý trực tuyến</span>
          </div>
        </div>

        <div className="login__hero">
          <h1 className="rise" style={{ '--d': 1 }}>
            Quản lý đa dạng sinh học Sơn Trà
          </h1>
          <p className="rise" style={{ '--d': 2 }}>
            Danh mục loài, các lần ghi nhận ngoài thực địa, kết quả đi tuyến và các bộ dữ liệu nghiên cứu ở cùng một nơi, để kiểm lâm và nhà khoa học cùng làm việc trên một nguồn số liệu.
          </p>
        </div>

        <div className="login__facts rise" style={{ '--d': 3 }}>
          <div>
            <strong>Chuẩn Darwin Core</strong>
            <span>Cơ sở dữ liệu số hóa theo chuẩn phân loại học</span>
          </div>
          <div>
            <strong>Bản đồ nội bộ</strong>
            <span>Không phụ thuộc dịch vụ bản đồ bên ngoài</span>
          </div>
        </div>
      </aside>

      <main className="login__main">
        <form className="login__form" onSubmit={submit} noValidate>
          <div className="rise" style={{ '--d': 2 }}>
            <h2>Đăng nhập</h2>
            <p className="muted">Dùng tài khoản được quản trị viên cấp.</p>
          </div>
          {error && (
            <div key={attempt} className="notice notice--danger login__error" role="alert">
              <Icon name="alert" />
              <span>{error}</span>
            </div>
          )}
          <div className="rise" style={{ '--d': 3 }}>
            <Field label="Email">
              {(id) => (
                <input id={id} className="input" type="email" autoComplete="username" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} />
              )}
            </Field>
          </div>
          <div className="rise" style={{ '--d': 4 }}>
            <Field label="Mật khẩu">
              {(id) => (
                <div className="login__pw">
                  <input id={id} className="input" type={reveal ? 'text' : 'password'} autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
                  <button type="button" className="login__reveal" onClick={() => setReveal((v) => !v)} aria-pressed={reveal} aria-label={reveal ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}>
                    <Icon name={reveal ? 'eyeOff' : 'eye'} size={18} />
                  </button>
                </div>
              )}
            </Field>
          </div>
          <button type="submit" className="btn btn--primary login__submit rise" style={{ '--d': 5 }} data-state={busy ? 'loading' : undefined} disabled={busy || !email || !password}>
            {busy ? 'Đang đăng nhập' : 'Đăng nhập'}
            {!busy && <Icon name="arrowRight" size={16} />}
          </button>
          <p className="field__hint rise" style={{ '--d': 6 }}>
            Chỉ cần xem số liệu? <Link to="/">Mở Tổng quan</Link> hoặc <Link to="/ban-do">Bản đồ</Link>, không cần tài khoản.
          </p>
        </form>
      </main>
    </div>
  );
}
