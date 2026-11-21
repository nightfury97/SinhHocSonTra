import { GROUP_BY_VALUE } from '../lib/taxa.js';
import Icon from './Icon.jsx';

/**
 * Ảnh đại diện thu nhỏ của loài. Chưa có ảnh → ô giữ chỗ tô nhạt theo màu nhóm,
 * ghi rõ là chưa có ảnh (không dùng ảnh minh hoạ giả).
 */
export function SpeciesThumb({ species, size = 40 }) {
  const img = species.primaryImage;
  const group = GROUP_BY_VALUE[species.group];
  if (img) {
    return (
      <img
        className="thumb"
        src={img.thumbUrl}
        alt={species.name}
        width={size}
        height={size}
        loading="lazy"
        decoding="async"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      className="thumb thumb--empty"
      style={{ width: size, height: size, '--thumb-tint': group?.color ?? 'var(--series-neutral)' }}
      title="Chưa có ảnh"
      role="img"
      aria-label={`${species.name} — chưa có ảnh`}
    >
      <Icon name="species" size={Math.round(size * 0.45)} />
    </span>
  );
}

export function PhotoCredit({ image }) {
  if (!image.caption && !image.credit && !image.license) return null;
  return (
    <p className="photo-credit">
      {image.caption && <span>{image.caption}</span>}
      {(image.credit || image.license) && (
        <span className="faint">
          {image.credit ? `Ảnh: ${image.credit}` : ''}
          {image.credit && image.license ? ' · ' : ''}
          {image.license ?? ''}
        </span>
      )}
    </p>
  );
}
