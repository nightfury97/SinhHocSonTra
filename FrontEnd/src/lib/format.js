const nf = new Intl.NumberFormat('vi-VN');
const df = new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
const dtf = new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export const fmtNum = (n, digits) =>
  n === null || n === undefined
    ? '—'
    : digits === undefined
      ? nf.format(n)
      : new Intl.NumberFormat('vi-VN', { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(n);
export const fmtDate = (d) => (d ? df.format(new Date(d)) : '—');
export const fmtDateTime = (d) => (d ? dtf.format(new Date(d)) : '—');
export const fmtCoord = (lat, lng) =>
  lat === null || lat === undefined ? '—' : `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
