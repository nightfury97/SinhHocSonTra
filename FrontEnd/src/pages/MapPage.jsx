import { useEffect, useMemo, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useApi } from '../api/useApi.js';
import { useAuth } from '../auth/AuthContext.jsx';
import { Field } from '../components/ui.jsx';
import MapDetailPanel from '../components/MapDetailPanel.jsx';
import Icon from '../components/Icon.jsx';
import { GROUPS, GROUP_BY_VALUE } from '../lib/taxa.js';
import { fmtNum } from '../lib/format.js';

// Bản đồ nền offline tự host (TileServer GL) — xem QK4/map-module/offline-services.
const STYLE_URL = import.meta.env.VITE_MAP_STYLE_URL || 'https://map.qk4.baga.vn/styles/basic-preview/style.json';
const PREF_KEY = 'sontra.mapFilters';
const loadOpen = () => {
  try {
    return localStorage.getItem(PREF_KEY) !== 'closed';
  } catch {
    return true;
  }
};

const SON_TRA = { center: [108.272, 16.118], zoom: 12.4 };

/** MapLibre không hiểu var()/oklch(): vẽ token lên canvas 1px rồi đọc lại RGB. */
function resolveColor(token) {
  const css = getComputedStyle(document.documentElement).getPropertyValue(token).trim();
  const ctx = document.createElement('canvas').getContext('2d');
  ctx.fillStyle = css;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
  return `rgb(${r}, ${g}, ${b})`;
}

/** Bỏ dấu tiếng Việt và hạ chữ thường để tìm "voọc" bằng "vooc". */
const fold = (v) =>
  String(v ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/đ/g, 'd')
    .toLowerCase()
    .trim();

export default function MapPage() {
  const container = useRef(null);
  const mapRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [mapError, setMapError] = useState(null);
  const [groups, setGroups] = useState(() => new Set(GROUPS.map((g) => g.value)));
  const [year, setYear] = useState('');
  const [datasetId, setDatasetId] = useState('');
  const [showObs, setShowObs] = useState(true);
  const [showTransect, setShowTransect] = useState(true);
  const [selected, setSelected] = useState(null);
  const [query, setQuery] = useState('');
  const [speciesId, setSpeciesId] = useState(''); // loài đã chọn từ gợi ý
  const [fitTick, setFitTick] = useState(0);
  const geoRef = useRef({ obs: [], sight: [] });
  const [filtersOpen, setFiltersOpen] = useState(loadOpen);
  const filtersRef = useRef(null);

  const points = useApi('/map/observations', { datasetId: datasetId || undefined });
  const sightings = useApi('/surveys/sightings');
  const { user } = useAuth();
  const datasets = useApi(user ? '/datasets' : null); // danh sách bộ dữ liệu là thông tin nội bộ

  // Chỉ mục loài có điểm trên bản đồ, dùng cho gợi ý và để nối điểm khảo sát với tên loài.
  const speciesIndex = useMemo(() => {
    const m = new Map();
    for (const p of points.data ?? []) {
      const e = m.get(p.species.id) ?? { id: p.species.id, name: p.species.name, sci: p.species.scientificName, group: p.species.group, count: 0, key: fold(`${p.species.name} ${p.species.scientificName}`) };
      e.count += 1;
      m.set(p.species.id, e);
    }
    return m;
  }, [points.data]);
  const q = fold(query);
  const pickedSpecies = speciesId ? speciesIndex.get(speciesId) : null;
  const suggestions = useMemo(
    () => (q && !speciesId ? [...speciesIndex.values()].filter((e) => e.key.includes(q)).sort((a, b) => b.count - a.count).slice(0, 6) : []),
    [q, speciesId, speciesIndex]
  );
  const matchObs = (p) => (speciesId ? p.species.id === speciesId : !q || fold(`${p.species.name} ${p.species.scientificName}`).includes(q));
  const matchSight = (st) => {
    if (speciesId) return st.survey.speciesId === speciesId;
    if (!q) return true;
    const sp = speciesIndex.get(st.survey.speciesId);
    return fold(`${st.groupCode} ${st.survey.transect.code} dan tuyen ${sp?.key ?? ''}`).includes(q);
  };

  const obsGeo = useMemo(
    () => ({
      type: 'FeatureCollection',
      features: (points.data ?? [])
        .filter((p) => groups.has(p.species.group) && (!year || String(new Date(p.observedAt).getUTCFullYear()) === year) && matchObs(p))
        .map((p) => ({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
          properties: {
            kind: 'obs',
            fid: `o${p.id}`,
            speciesId: p.species.id,
            group: p.species.group,
            status: p.species.status,
            name: p.species.name,
            sci: p.species.scientificName,
            count: p.count ?? '',
            date: p.observedAt,
            basis: p.basisOfRecord,
            place: p.place ?? '',
            lat: p.lat,
            lng: p.lng,
          },
        })),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [points.data, groups, year, q, speciesId]
  );

  const sightGeo = useMemo(
    () => ({
      type: 'FeatureCollection',
      features: (sightings.data ?? [])
        .filter((s) => s.lat !== null && (!year || String(s.survey.year) === year) && matchSight(s))
        .map((s) => ({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [s.lng, s.lat] },
          properties: {
            kind: 'sighting',
            fid: `s${s.id}`,
            speciesId: s.survey.speciesId ?? '',
            code: s.groupCode,
            year: s.survey.year,
            transect: s.survey.transect.code,
            individuals: s.individuals,
            altitude: s.altitudeM ?? '',
            habitat: s.habitat ?? '',
            flagged: s.flagged,
            lat: s.lat,
            lng: s.lng,
          },
        })),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sightings.data, year, q, speciesId, speciesIndex]
  );

  useEffect(() => {
    const map = new maplibregl.Map({
      container: container.current,
      style: STYLE_URL,
      center: SON_TRA.center,
      zoom: SON_TRA.zoom,
      attributionControl: { compact: true },
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-right');
    map.on('error', (e) => {
      if (!map.isStyleLoaded()) setMapError(e.error?.message ?? 'Không tải được bản đồ nền.');
    });
    map.on('load', () => {
      const surface = resolveColor('--color-panel');
      const groupColor = ['match', ['get', 'group'], ...GROUPS.flatMap((g) => [g.value, resolveColor(`--series-${g.value.toLowerCase()}`)]), resolveColor('--series-neutral')];
      map.addSource('obs', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map.addSource('sightings', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map.addLayer({
        id: 'obs',
        type: 'circle',
        source: 'obs',
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 3.5, 15, 7],
          'circle-color': groupColor,
          'circle-stroke-color': surface,
          'circle-stroke-width': 2,
        },
      });
      map.addLayer({
        id: 'sightings',
        type: 'circle',
        source: 'sightings',
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 4, 15, 9],
          'circle-color': surface,
          'circle-stroke-color': resolveColor('--series-b'),
          'circle-stroke-width': 3,
        },
      });
      map.addSource('selected', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map.addLayer({
        id: 'selected',
        type: 'circle',
        source: 'selected',
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 9, 15, 15],
          'circle-color': 'rgba(0,0,0,0)',
          'circle-stroke-color': resolveColor('--color-ink'),
          'circle-stroke-width': 2.5,
        },
      });
      // Một handler chung: điểm khảo sát nằm trên cùng nên được ưu tiên; bấm vào chỗ trống thì đóng panel.
      map.on('click', (e) => {
        const [hit] = map.queryRenderedFeatures(e.point, { layers: ['sightings', 'obs'] });
        setSelected(hit ? { ...hit.properties } : null);
      });
      for (const layer of ['obs', 'sightings']) {
        map.on('mouseenter', layer, () => (map.getCanvas().style.cursor = 'pointer'));
        map.on('mouseleave', layer, () => (map.getCanvas().style.cursor = ''));
      }
      mapRef.current = map;
      setReady(true);
    });
    return () => {
      mapRef.current = null;
      map.remove();
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    mapRef.current.getSource('obs').setData(obsGeo);
    mapRef.current.getSource('sightings').setData(sightGeo);
  }, [ready, obsGeo, sightGeo]);

  // Zoom tới các điểm đang hiển thị khi người dùng chọn một loài hoặc nhấn Enter trong ô tìm kiếm.
  geoRef.current = { obs: obsGeo.features, sight: showTransect ? sightGeo.features : [] };
  useEffect(() => {
    if (!ready || fitTick === 0) return;
    const feats = [...(showObs ? geoRef.current.obs : []), ...geoRef.current.sight];
    if (feats.length === 0) return;
    const b = new maplibregl.LngLatBounds();
    for (const f of feats) b.extend(f.geometry.coordinates);
    const wide = window.matchMedia('(min-width: 30.0625rem)').matches;
    mapRef.current.fitBounds(b, { padding: { top: 70, bottom: 50, right: 50, left: wide ? 50 : 30 }, maxZoom: 15, duration: 600 });
  }, [ready, fitTick]); // eslint-disable-line react-hooks/exhaustive-deps

  // Vòng đánh dấu quanh điểm đang chọn; lệch panel che mất điểm thì dời bản đồ cho điểm hiện ra.
  useEffect(() => {
    if (!ready) return;
    const map = mapRef.current;
    map.getSource('selected').setData(
      selected
        ? { type: 'FeatureCollection', features: [{ type: 'Feature', geometry: { type: 'Point', coordinates: [Number(selected.lng), Number(selected.lat)] }, properties: {} }] }
        : { type: 'FeatureCollection', features: [] }
    );
    if (selected && window.matchMedia('(min-width: 30.0625rem)').matches) {
      // Panel rộng 360px phủ mép trái: điểm nằm dưới panel thì đẩy bản đồ để điểm hiện ra ở giữa phần còn lại.
      const pt = map.project([Number(selected.lng), Number(selected.lat)]);
      const width = map.getContainer().clientWidth;
      if (pt.x < 380) map.panBy([-(360 + (width - 360) / 2 - pt.x), 0], { duration: 350 });
    }
  }, [ready, selected]);

  useEffect(() => {
    if (!ready) return;
    mapRef.current.setLayoutProperty('obs', 'visibility', showObs ? 'visible' : 'none');
    mapRef.current.setLayoutProperty('sightings', 'visibility', showTransect ? 'visible' : 'none');
  }, [ready, showObs, showTransect]);

  // Thu gọn: ghi nhớ lựa chọn, chặn tab/đọc vào phần đang ẩn, và báo bản đồ đổi kích thước sau khi bố cục chuyển.
  useEffect(() => {
    try {
      localStorage.setItem(PREF_KEY, filtersOpen ? 'open' : 'closed');
    } catch {
      /* bỏ qua: chỉ mất ghi nhớ */
    }
    const el = filtersRef.current;
    if (el) {
      if (filtersOpen) el.removeAttribute('inert');
      else el.setAttribute('inert', '');
    }
  }, [filtersOpen]);
  useEffect(() => {
    if (!container.current) return undefined;
    const ro = new ResizeObserver(() => mapRef.current?.resize());
    ro.observe(container.current);
    return () => ro.disconnect();
  }, []);

  const toggleGroup = (value) =>
    setGroups((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });

  const countByGroup = useMemo(() => {
    const c = {};
    for (const p of points.data ?? []) c[p.species.group] = (c[p.species.group] ?? 0) + 1;
    return c;
  }, [points.data]);
  const years = useMemo(() => {
    const set = new Set((sightings.data ?? []).map((s) => s.survey.year));
    for (const p of points.data ?? []) set.add(new Date(p.observedAt).getUTCFullYear());
    return [...set].sort();
  }, [points.data, sightings.data]);

  // Số bộ lọc đang bật: hiện trên nút mở lại để người dùng không quên khi đã thu gọn.
  const filterCount = (q || speciesId ? 1 : 0) + (year ? 1 : 0) + (datasetId ? 1 : 0) + (groups.size < GROUPS.length ? 1 : 0) + (!showObs || !showTransect ? 1 : 0);

  const shown = (showObs ? obsGeo.features.length : 0) + (showTransect ? sightGeo.features.length : 0);

  return (
    <div className="page page--flush">
      <div className="map-layout" data-collapsed={!filtersOpen || undefined}>
        <aside className="map-filters" id="map-filters" ref={filtersRef} aria-label="Lớp và bộ lọc bản đồ" aria-hidden={!filtersOpen}>
          <div className="map-filters__head">
            <h1 style={{ fontSize: 'var(--text-lg)' }}>Bản đồ ghi nhận</h1>
            <button type="button" className="icon-btn" onClick={() => setFiltersOpen(false)} aria-label="Thu gọn bộ lọc" aria-controls="map-filters" aria-expanded={filtersOpen} title="Thu gọn">
              <Icon name="chevronLeft" size={16} />
            </button>
          </div>

          <div className="field map-search">
            <label className="field__label" htmlFor="map-q">
              Tìm kiếm
            </label>
            <div className="map-search__box">
              <Icon name="search" size={16} />
              <input
                id="map-q"
                className="input"
                type="search"
                placeholder="Tên loài, tên khoa học, mã đàn…"
                autoComplete="off"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSpeciesId('');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (suggestions.length === 1) {
                      setSpeciesId(suggestions[0].id);
                      setQuery(suggestions[0].name);
                    }
                    setFitTick((n) => n + 1);
                  }
                  if (e.key === 'Escape') {
                    setQuery('');
                    setSpeciesId('');
                  }
                }}
              />
              {query && (
                <button
                  type="button"
                  className="map-search__clear"
                  aria-label="Xoá tìm kiếm"
                  onClick={() => {
                    setQuery('');
                    setSpeciesId('');
                  }}
                >
                  <Icon name="close" size={14} />
                </button>
              )}
            </div>
            {suggestions.length > 0 && (
              <ul className="map-search__list" aria-label="Gợi ý loài">
                {suggestions.map((e) => (
                  <li key={e.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setSpeciesId(e.id);
                        setQuery(e.name);
                        setFitTick((n) => n + 1);
                      }}
                    >
                      <i className="dot" style={{ background: GROUP_BY_VALUE[e.group]?.color }} aria-hidden="true" />
                      <span className="map-search__name">
                        <strong>{e.name}</strong>
                        {e.name !== e.sci && <span className="sci">{e.sci}</span>}
                      </span>
                      <span className="num faint">{fmtNum(e.count)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {(q || pickedSpecies) && (
              <p className="field__hint" aria-live="polite">
                {shown === 0 ? 'Không có điểm nào khớp.' : `${fmtNum(shown)} điểm khớp${pickedSpecies ? ` · ${pickedSpecies.name}` : ''}.`}
                {shown > 0 && !pickedSpecies && (
                  <>
                    {' '}
                    <button type="button" className="link-btn" onClick={() => setFitTick((n) => n + 1)}>
                      Thu phóng tới kết quả
                    </button>
                  </>
                )}
              </p>
            )}
          </div>

          <div className="field">
            <span className="field__label">Lớp dữ liệu</span>
            <label className="check">
              <input type="checkbox" checked={showObs} onChange={(e) => setShowObs(e.target.checked)} />
              Quan sát đã duyệt
            </label>
            <label className="check">
              <input type="checkbox" checked={showTransect} onChange={(e) => setShowTransect(e.target.checked)} />
              <i className="dot" style={{ background: 'var(--color-panel)', boxShadow: '0 0 0 3px var(--series-b)' }} aria-hidden="true" />
              Đàn voọc trên tuyến
            </label>
          </div>

          <div className="field">
            <span className="field__label">Nhóm loài</span>
            <div className="map-filters__row">
              {GROUPS.map((g) => (
                <button key={g.value} type="button" className="chip" aria-pressed={groups.has(g.value)} onClick={() => toggleGroup(g.value)}>
                  <i className="dot" style={{ background: g.color }} aria-hidden="true" />
                  {g.label}
                  <span className="num faint">{fmtNum(countByGroup[g.value] ?? 0)}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <span className="field__label" id="map-year-label">
              Năm
            </span>
            <div className="map-filters__row" role="radiogroup" aria-labelledby="map-year-label">
              {[{ value: '', label: 'Mọi năm' }, ...years.map((y) => ({ value: String(y), label: String(y) }))].map((o) => (
                <button key={o.value || 'all'} type="button" role="radio" aria-checked={year === o.value} className="chip chip--choice" onClick={() => setYear(o.value)}>
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          <div className="map-filters__row">
            {user && (
            <Field label="Nguồn">
              {(id) => (
                <select id={id} className="select" value={datasetId} onChange={(e) => setDatasetId(e.target.value)}>
                  <option value="">Mọi nguồn</option>
                  {(datasets.data ?? [])
                    .filter((d) => d.kind === 'OCCURRENCE')
                    .map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                </select>
              )}
            </Field>
            )}
          </div>

          <p className="field__hint">
            Bản đồ nền tự host, không cần Internet công cộng. Chỉ hiện quan sát đã được xác nhận; điểm khảo sát sai toạ độ không được vẽ.
          </p>
        </aside>

        <div className={`map-canvas${selected ? ' map-canvas--panel' : ''}`}>
          <div ref={container} className="map-el" />
          {!filtersOpen && (
            <button type="button" className="map-reopen" onClick={() => setFiltersOpen(true)} aria-label="Mở bộ lọc và lớp dữ liệu" aria-controls="map-filters" aria-expanded={false}>
              <Icon name="filter" size={16} />
              <span>Bộ lọc</span>
              {filterCount > 0 && <span className="map-reopen__count num">{filterCount}</span>}
            </button>
          )}
          {mapError ? (
            <div className="map-status" role="alert">
              Không tải được bản đồ nền: {mapError}
            </div>
          ) : (
            <div className="map-status num" aria-live="polite">
              {points.loading || sightings.loading ? 'Đang tải điểm…' : `${fmtNum(shown)} điểm`}
            </div>
          )}
          {selected && <MapDetailPanel point={selected} user={user} onClose={() => setSelected(null)} />}
        </div>
      </div>
    </div>
  );
}
