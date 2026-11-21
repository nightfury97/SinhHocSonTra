export const STATUS_STYLES = {
  EN: ['var(--status-en-bg)', 'var(--status-en-fg)'],
  VU: ['var(--status-vu-bg)', 'var(--status-vu-fg)'],
  NT: ['var(--status-nt-bg)', 'var(--status-nt-fg)'],
  LC: ['var(--status-lc-bg)', 'var(--status-lc-fg)'],
  DS: ['var(--status-ds-bg)', 'var(--status-ds-fg)'],
};

export function statusStyle(short) {
  return STATUS_STYLES[short] || ['var(--status-lc-bg)', 'var(--status-lc-fg)'];
}

export const GROUP_SWATCHES = {
  Thú: ['var(--swatch-mammal-bg)', 'var(--swatch-mammal-fg)'],
  Chim: ['var(--swatch-bird-bg)', 'var(--swatch-bird-fg)'],
  'Bò sát': ['var(--swatch-reptile-bg)', 'var(--swatch-reptile-fg)'],
  'Thực vật': ['var(--swatch-plant-bg)', 'var(--swatch-plant-fg)'],
};

export function groupSwatch(group) {
  return GROUP_SWATCHES[group] || ['var(--swatch-plant-bg)', 'var(--swatch-plant-fg)'];
}
