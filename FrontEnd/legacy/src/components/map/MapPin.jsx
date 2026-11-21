import { useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import maplibregl from 'maplibre-gl';

export default function MapPin({ map, pin, isSelected, onSelect }) {
  const element = useMemo(() => document.createElement('div'), []);

  useEffect(() => {
    const marker = new maplibregl.Marker({ element }).setLngLat([pin.lng, pin.lat]).addTo(map);
    return () => marker.remove();
  }, [map, element, pin.lng, pin.lat]);

  return createPortal(
    <div
      className="map-pin"
      role="button"
      tabIndex={0}
      title={pin.name}
      aria-label={pin.name}
      onClick={() => onSelect(pin.id)}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onSelect(pin.id)}
      style={{ position: 'relative', width: 16, height: 16, cursor: 'pointer' }}
    >
      {isSelected && (
        <span
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%,-50%)',
            width: 16,
            height: 16,
            borderRadius: '50%',
            background: pin.color,
            animation: 'strapulse 2.4s ease-out infinite',
          }}
        />
      )}
      <span
        style={{
          display: 'block',
          width: 15,
          height: 15,
          borderRadius: '50%',
          background: pin.color,
          border: '2.5px solid var(--color-paper-2)',
          boxShadow: 'var(--shadow-whisper)',
          position: 'relative',
        }}
      />
    </div>,
    element
  );
}
