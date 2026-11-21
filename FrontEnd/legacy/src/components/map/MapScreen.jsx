import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import MapFilterPanel from './MapFilterPanel.jsx';
import MapPin from './MapPin.jsx';
import MapSelectionCard from './MapSelectionCard.jsx';
import { MAP_CENTER, MAP_DEFAULT_ZOOM, MAP_FILTERS, MAP_PINS } from '../../data/map.js';

// Bản đồ offline tự host (TileServer GL) — xem QK4/map-module/offline-services.
const MAP_STYLE_URL =
  import.meta.env.VITE_MAP_STYLE_URL || 'https://map.qk4.baga.vn/styles/basic-preview/style.json';

export default function MapScreen() {
  const containerRef = useRef(null);
  const [map, setMap] = useState(null);
  const [selectedPinId, setSelectedPinId] = useState(MAP_PINS[0].id);
  const selectedPin = MAP_PINS.find((p) => p.id === selectedPinId) || MAP_PINS[0];

  useEffect(() => {
    const instance = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLE_URL,
      center: [MAP_CENTER.lng, MAP_CENTER.lat],
      zoom: MAP_DEFAULT_ZOOM,
      attributionControl: { compact: true },
    });
    instance.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');
    setMap(instance);
    return () => {
      instance.remove();
      setMap(null);
    };
  }, []);

  return (
    <section data-screen-label="Bản đồ" style={{ height: '100%' }}>
      <div className="stack-mobile" style={{ display: 'flex', height: '100%', minHeight: 520 }}>
        <MapFilterPanel filters={MAP_FILTERS} />

        <div style={{ flex: 1, minWidth: 0, position: 'relative', overflow: 'hidden' }}>
          <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />
          {map &&
            MAP_PINS.map((pin) => (
              <MapPin key={pin.id} map={map} pin={pin} isSelected={pin.id === selectedPinId} onSelect={setSelectedPinId} />
            ))}
          <MapSelectionCard selection={selectedPin} />
        </div>
      </div>
    </section>
  );
}
