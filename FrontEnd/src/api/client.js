const TOKEN_KEY = 'sontra.token';
export const DATA_CHANGED = 'sontra:data-changed';

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage blocked — session lasts until reload */
  }
}

export class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

let onUnauthorized = () => {};
export function setUnauthorizedHandler(fn) {
  onUnauthorized = fn;
}

/** Gọi API backend. `body` là object → JSON; Blob/File → gửi nguyên bytes. */
export async function api(path, { method = 'GET', body, query, signal } = {}) {
  const url = new URL(`/api${path}`, window.location.origin);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v);
    }
  }
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  let payload;
  if (body instanceof Blob) {
    headers['Content-Type'] = 'application/octet-stream';
    payload = body;
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  let res;
  try {
    res = await fetch(url, { method, headers, body: payload, signal });
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    throw new ApiError(0, 'Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.');
  }
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401 && token) onUnauthorized();
    throw new ApiError(res.status, translateError(res.status, data?.error), data?.details);
  }
  // Báo cho các bộ đếm (sidebar...) rằng dữ liệu vừa thay đổi. Kiểm tra thử (dryRun) không tính.
  if (method !== 'GET' && query?.dryRun !== 'true') window.dispatchEvent(new Event(DATA_CHANGED));
  return data;
}

function translateError(status, message) {
  const known = {
    'Invalid credentials': 'Email hoặc mật khẩu không đúng.',
    'Insufficient role': 'Tài khoản của bạn không có quyền thực hiện thao tác này.',
    'Cannot review your own observation': 'Bạn không thể tự duyệt quan sát của chính mình.',
    'Record is still referenced by other data': 'Không xoá được: bản ghi này vẫn đang được dữ liệu khác sử dụng.',
    'Validation failed': 'Dữ liệu chưa hợp lệ — kiểm tra lại các trường.',
    'Email already registered': 'Email này đã được đăng ký.',
    'Current password is incorrect': 'Mật khẩu hiện tại không đúng.',
    'New password must differ from current password': 'Mật khẩu mới phải khác mật khẩu hiện tại.',
    'Too many failed logins': 'Đăng nhập sai quá nhiều lần. Thử lại sau 15 phút.',
    'Cannot remove your own admin role': 'Bạn không thể tự bỏ quyền quản trị của mình.',
  };
  if (message && known[message]) return known[message];
  if (message?.startsWith('Duplicate value')) return 'Giá trị bị trùng với bản ghi đã có (ví dụ: tên khoa học hoặc slug).';
  if (status === 403) return known['Insufficient role'];
  if (status >= 500) return 'Máy chủ gặp lỗi. Thử lại sau ít phút.';
  return message || `Lỗi ${status}`;
}

/** Tải file từ API cần đăng nhập: lấy blob rồi cho trình duyệt lưu (thẻ <a download> không gửi được header). */
export async function downloadFile(path) {
  const token = getToken();
  let res;
  try {
    res = await fetch(`/api${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  } catch {
    throw new ApiError(0, 'Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.');
  }
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    if (res.status === 401 && token) onUnauthorized();
    throw new ApiError(res.status, translateError(res.status, data?.error));
  }
  const name = /filename="([^"]+)"/.exec(res.headers.get('Content-Disposition') ?? '')?.[1] ?? 'du-lieu';
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return name;
}
