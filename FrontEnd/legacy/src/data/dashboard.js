export const STATS = [
  { label: 'Loài ghi nhận', value: '1.087', dot: 'var(--color-accent-2)', trend: '↗ +12 trong quý', up: true },
  { label: 'Cá thể voọc', value: '~1.350', dot: 'var(--color-accent)', trend: '↗ +50 so với 2023', up: true },
  { label: 'Quan sát tháng 7', value: '248', dot: 'var(--color-accent-2)', trend: '42 hôm nay', up: null },
  { label: 'Loài bị đe dọa', value: '19', dot: 'var(--status-vu-fg)', trend: '2 mức Nguy cấp', up: false },
];

export const POP_BARS = [
  { year: '2019', val: '1.050', h: '56%', peak: false },
  { year: '2020', val: '1.120', h: '64%', peak: false },
  { year: '2021', val: '1.180', h: '71%', peak: false },
  { year: '2022', val: '1.240', h: '80%', peak: false },
  { year: '2023', val: '1.300', h: '90%', peak: false },
  { year: '2024', val: '1.350', h: '100%', peak: true },
];

export const ENV_STATIONS = [
  { name: 'Trạm Bãi Bắc · Nước', rating: 'Tốt · 92', metric: 'pH 7,2 · DO 6,8 mg/L', level: 'good', w: '92%' },
  { name: 'Trạm Suối Đá · Không khí', rating: 'Tốt · 88', metric: 'AQI 41 · PM2.5 9 µg/m³', level: 'good-2', w: '88%' },
  { name: 'Đỉnh Bàn Cờ · Đất', rating: 'Khá · 74', metric: 'Độ ẩm 62% · pH 5,8', level: 'fair', w: '74%' },
];

const ENV_LEVEL_COLOR = {
  good: 'var(--color-accent-2)',
  'good-2': 'var(--status-lc-fg)',
  fair: 'var(--status-vu-fg)',
};

export function envLevelColor(level) {
  return ENV_LEVEL_COLOR[level] || 'var(--color-ink-2)';
}

export const OBSERVATIONS = [
  { tag: 'Vc', group: 'Thú', featured: true, name: 'Voọc chà vá chân nâu', place: 'Tiểu khu 63', by: 'Nguyễn V.A', time: '2 giờ trước' },
  { tag: 'Dh', group: 'Chim', name: 'Diều hoa Miến Điện', place: 'Bãi Bắc', by: 'Lê T.H', time: 'Hôm qua' },
  { tag: 'Kv', group: 'Thú', name: 'Khỉ vàng', place: 'Đường Hoàng Sa', by: 'Trần Q.M', time: 'Hôm qua' },
  { tag: 'Tg', group: 'Bò sát', name: 'Trăn gấm', place: 'Suối Ôm', by: 'Phạm V.K', time: '2 ngày trước' },
];

export const MY_REPORTS = [
  { name: 'Voọc chà vá · TK63', status: 'Đã duyệt', approved: true, meta: '03/07 · 4 cá thể' },
  { name: 'Khỉ vàng · Hoàng Sa', status: 'Chờ duyệt', approved: false, meta: '02/07 · 15 cá thể' },
  { name: 'Diều hoa · Bãi Bắc', status: 'Đã duyệt', approved: true, meta: '01/07 · 2 cá thể' },
];

export const HABITAT_OPTIONS = ['Rừng thường xanh', 'Rừng thứ sinh', 'Ven suối', 'Vách núi ven biển'];

export const GROUPS = ['Tất cả', 'Thú', 'Chim', 'Bò sát', 'Thực vật'];
