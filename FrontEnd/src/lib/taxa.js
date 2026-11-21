export const GROUPS = [
  { value: 'MAMMAL', label: 'Thú', color: 'var(--series-mammal)' },
  { value: 'BIRD', label: 'Chim', color: 'var(--series-bird)' },
  { value: 'REPTILE', label: 'Bò sát', color: 'var(--series-reptile)' },
  { value: 'AMPHIBIAN', label: 'Lưỡng cư', color: 'var(--series-amphibian)' },
  { value: 'PLANT', label: 'Thực vật', color: 'var(--series-plant)' },
];
export const GROUP_BY_VALUE = Object.fromEntries(GROUPS.map((g) => [g.value, g]));

/** Phân hạng IUCN (Sách Đỏ thế giới) + "Cây di sản" dùng riêng cho Sơn Trà. */
export const IUCN = [
  { value: 'CR', label: 'Cực kỳ nguy cấp', threatened: true },
  { value: 'EN', label: 'Nguy cấp', threatened: true },
  { value: 'VU', label: 'Sắp nguy cấp', threatened: true },
  { value: 'NT', label: 'Sắp bị đe doạ' },
  { value: 'LC', label: 'Ít quan ngại' },
  { value: 'DD', label: 'Thiếu dữ liệu' },
  { value: 'NE', label: 'Chưa đánh giá' },
  { value: 'EW', label: 'Tuyệt chủng ngoài tự nhiên', threatened: true },
  { value: 'EX', label: 'Tuyệt chủng' },
  { value: 'HERITAGE', label: 'Cây di sản' },
];
export const IUCN_BY_VALUE = Object.fromEntries(IUCN.map((s) => [s.value, s]));

export const BASIS = {
  HUMAN_OBSERVATION: 'Quan sát trực tiếp',
  PRESERVED_SPECIMEN: 'Mẫu vật lưu giữ',
  MACHINE_OBSERVATION: 'Thiết bị ghi nhận',
  OTHER: 'Khác',
};

export const OBS_STATUS = {
  PENDING: { label: 'Chờ duyệt', tone: 'warn' },
  APPROVED: { label: 'Đã duyệt', tone: 'ok' },
  REJECTED: { label: 'Bị từ chối', tone: 'danger' },
};

export const HABITAT = { PLANTATION: 'Rừng trồng', RICH: 'Rừng giàu', POOR: 'Rừng nghèo' };

export const ROLES = {
  ADMIN: 'Quản trị',
  RANGER: 'Kiểm lâm',
  VIEWER: 'Chỉ xem',
};

/** Loài nhập từ file chưa được biên tập: tên hiển thị vẫn là tên khoa học hoặc chưa có hạng IUCN. */
export function needsCuration(s) {
  return s.name === s.scientificName || s.status === 'NE';
}
