import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// ─── PERFORMANCE: Canvas renderer ────────────────────────────────────────────
const CANVAS_RENDERER = L.canvas({ padding: 0.5 });

// ─── PERFORMANCE: In-memory GeoJSON cache ────────────────────────────────────
const geoCache = new Map();

// ─── 38 PROVINSI INDONESIA ───────────────────────────────────────────────────
// dataKey: prefix nama file GeoJSON provinsi itu (misal 'JABAR' → JABAR_NITROGEN.json)
// null = belum ada data, peta kosong saat provinsi ini dipilih
const PROVINCES = [
  { name: 'Aceh',                    center: [4.695135, 96.749397],  zoom: 8,  dataKey: null },
  { name: 'Sumatera Utara',          center: [2.115, 99.543],        zoom: 8,  dataKey: null },
  { name: 'Sumatera Barat',          center: [-0.74, 100.48],        zoom: 8,  dataKey: null },
  { name: 'Riau',                    center: [0.293, 101.707],       zoom: 8,  dataKey: null },
  { name: 'Kepulauan Riau',          center: [3.945, 108.142],       zoom: 8,  dataKey: null },
  { name: 'Jambi',                   center: [-1.61, 103.616],       zoom: 8,  dataKey: null },
  { name: 'Sumatera Selatan',        center: [-3.319, 103.914],      zoom: 8,  dataKey: null },
  { name: 'Bangka Belitung',         center: [-2.741, 106.441],      zoom: 8,  dataKey: null },
  { name: 'Bengkulu',                center: [-3.791, 102.265],      zoom: 8,  dataKey: null },
  { name: 'Lampung',                 center: [-4.558, 105.406],      zoom: 8,  dataKey: null },
  { name: 'Banten',                  center: [-6.406, 106.064],      zoom: 9,  dataKey: null },
  { name: 'DKI Jakarta',             center: [-6.2, 106.816],        zoom: 11, dataKey: null },
  { name: 'Jawa Barat',              center: [-6.9175, 107.6191],    zoom: 9,  dataKey: 'JABAR' },
  { name: 'Jawa Tengah',             center: [-7.15, 110.14],        zoom: 9,  dataKey: null },
  { name: 'DI Yogyakarta',           center: [-7.874, 110.426],      zoom: 10, dataKey: null },
  { name: 'Jawa Timur',              center: [-7.536, 112.238],      zoom: 8,  dataKey: null },
  { name: 'Bali',                    center: [-8.34, 115.09],        zoom: 9,  dataKey: null },
  { name: 'Nusa Tenggara Barat',     center: [-8.652, 117.361],      zoom: 9,  dataKey: null },
  { name: 'Nusa Tenggara Timur',     center: [-8.657, 121.079],      zoom: 8,  dataKey: null },
  { name: 'Kalimantan Barat',        center: [0.133, 111.086],       zoom: 7,  dataKey: null },
  { name: 'Kalimantan Tengah',       center: [-1.681, 113.382],      zoom: 7,  dataKey: null },
  { name: 'Kalimantan Selatan',      center: [-3.093, 115.283],      zoom: 8,  dataKey: null },
  { name: 'Kalimantan Timur',        center: [0.539, 116.419],       zoom: 7,  dataKey: null },
  { name: 'Kalimantan Utara',        center: [3.073, 116.041],       zoom: 8,  dataKey: null },
  { name: 'Sulawesi Utara',          center: [0.627, 123.975],       zoom: 8,  dataKey: null },
  { name: 'Gorontalo',               center: [0.699, 122.446],       zoom: 9,  dataKey: null },
  { name: 'Sulawesi Tengah',         center: [-1.43, 121.445],       zoom: 7,  dataKey: null },
  { name: 'Sulawesi Barat',          center: [-2.839, 119.232],      zoom: 9,  dataKey: null },
  { name: 'Sulawesi Selatan',        center: [-3.662, 119.977],      zoom: 8,  dataKey: null },
  { name: 'Sulawesi Tenggara',       center: [-4.145, 122.174],      zoom: 8,  dataKey: null },
  { name: 'Maluku',                  center: [-3.237, 130.145],      zoom: 7,  dataKey: null },
  { name: 'Maluku Utara',            center: [1.571, 127.808],       zoom: 8,  dataKey: null },
  { name: 'Papua Barat',             center: [-1.336, 133.175],      zoom: 7,  dataKey: null },
  { name: 'Papua Barat Daya',        center: [-1.45, 132.15],        zoom: 8,  dataKey: null },
  { name: 'Papua',                   center: [-4.269, 138.08],       zoom: 7,  dataKey: null },
  { name: 'Papua Pegunungan',        center: [-4.5, 138.5],          zoom: 8,  dataKey: null },
  { name: 'Papua Selatan',           center: [-7.0, 139.5],          zoom: 8,  dataKey: null },
  { name: 'Papua Tengah',            center: [-3.5, 136.5],          zoom: 8,  dataKey: null },
];

// ─── NUTRIENT CONFIGS ────────────────────────────────────────────────────────
// fileName sekarang adalah fungsi yang menerima dataKey provinsi
// contoh: getFileName('JABAR') → 'JABAR_NITROGEN.json'
const nutrientConfigs = {
  nitrogen: {
    id: 'nitrogen',
    filePrefix: 'NITROGEN',   // gabung: `${dataKey}_NITROGEN.json`
    label: 'Nitrogen (N)',
    symbol: 'N',
    unit: 'ppm',
    description: 'Kandungan Nitrogen Tanah',
    gradient: ['#d0f0c0', '#a8d08d', '#5a9e4b', '#2d6a2e', '#0d3d0f'],
    levels: {
      1: { color: '#d0f0c0', label: 'Sangat Rendah', range: '< 0.1%' },
      2: { color: '#a8d08d', label: 'Rendah',        range: '0.1–0.2%' },
      3: { color: '#5a9e4b', label: 'Sedang',         range: '0.2–0.5%' },
      4: { color: '#2d6a2e', label: 'Tinggi',         range: '0.5–0.75%' },
      5: { color: '#0d3d0f', label: 'Sangat Tinggi',  range: '> 0.75%' },
      default: { color: '#2a2a3e', label: 'Tidak Ada Data', range: '-' },
    },
  },
  phosphor: {
    id: 'phosphor',
    filePrefix: 'PHOSPHOR',
    label: 'Fosfor (P)',
    symbol: 'P',
    unit: 'mg/kg',
    description: 'Kandungan Fosfor Tanah',
    gradient: ['#fde8c8', '#f8c07a', '#f09030', '#c05010', '#7a2000'],
    levels: {
      1: { color: '#fde8c8', label: 'Sangat Rendah', range: '< 10' },
      2: { color: '#f8c07a', label: 'Rendah',        range: '10–25' },
      3: { color: '#f09030', label: 'Sedang',         range: '25–50' },
      4: { color: '#c05010', label: 'Tinggi',         range: '50–100' },
      5: { color: '#7a2000', label: 'Sangat Tinggi',  range: '> 100' },
      default: { color: '#2a2a3e', label: 'Tidak Ada Data', range: '-' },
    },
  },
  kalium: {
    id: 'kalium',
    filePrefix: 'KALIUM',
    label: 'Kalium (K)',
    symbol: 'K',
    unit: 'me/100g',
    description: 'Kandungan Kalium Tanah',
    gradient: ['#dce8ff', '#a0bcf0', '#5080d0', '#2040a0', '#0a1560'],
    levels: {
      1: { color: '#dce8ff', label: 'Sangat Rendah', range: '< 0.1' },
      2: { color: '#a0bcf0', label: 'Rendah',        range: '0.1–0.3' },
      3: { color: '#5080d0', label: 'Sedang',         range: '0.3–0.5' },
      4: { color: '#2040a0', label: 'Tinggi',         range: '0.5–1.0' },
      5: { color: '#0a1560', label: 'Sangat Tinggi',  range: '> 1.0' },
      default: { color: '#2a2a3e', label: 'Tidak Ada Data', range: '-' },
    },
  },
  magnesium: {
    id: 'magnesium',
    filePrefix: 'MAGNESIUM',
    label: 'Magnesium (Mg)',
    symbol: 'Mg',
    unit: 'me/100g',
    description: 'Kandungan Magnesium Tanah',
    gradient: ['#f0e0ff', '#d0a0f0', '#a060d0', '#7030a0', '#400060'],
    levels: {
      1: { color: '#f0e0ff', label: 'Sangat Rendah', range: '< 0.3' },
      2: { color: '#d0a0f0', label: 'Rendah',        range: '0.3–0.6' },
      3: { color: '#a060d0', label: 'Sedang',         range: '0.6–1.0' },
      4: { color: '#7030a0', label: 'Tinggi',         range: '1.0–2.0' },
      5: { color: '#400060', label: 'Sangat Tinggi',  range: '> 2.0' },
      default: { color: '#2a2a3e', label: 'Tidak Ada Data', range: '-' },
    },
  },
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const getColor = (nutrientId, code) => {
  const cfg = nutrientConfigs[nutrientId];
  return (cfg.levels[code] || cfg.levels.default).color;
};

// ─── MAP CONTROLLER (zoom + fly + invalidateSize) ─────────────────────────────
function MapController({ flyTarget, onFlyDone }) {
  const map = useMap();

  useEffect(() => {
    window.__soilMapRef = map;
    // Paksa Leaflet recalculate ukuran container saat mount
    setTimeout(() => map.invalidateSize(), 100);
  }, [map]);

  useEffect(() => {
    if (flyTarget) {
      map.flyTo(flyTarget.center, flyTarget.zoom, { duration: 1.4 });
      onFlyDone();
    }
  }, [flyTarget]);

  return null;
}

// ─── MAIN APP ────────────────────────────────────────────────────────────────
export default function App() {
  // null = no nutrient selected (empty map)
  const [activeNutrient, setActiveNutrient] = useState(null);
  const [currentGeoData, setCurrentGeoData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [selectedLevel, setSelectedLevel] = useState(null);
  const [userPosition, setUserPosition] = useState(null);
  const [locStatus, setLocStatus] = useState('idle');
  const [hoveredArea, setHoveredArea] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mapStyle, setMapStyle] = useState('osm');

  // Province search state
  const [provinceQuery, setProvinceQuery] = useState('');
  const [showProvDropdown, setShowProvDropdown] = useState(false);
  // Default province: Jawa Barat (punya dataKey)
  const [selectedProvince, setSelectedProvince] = useState(
    PROVINCES.find((p) => p.name === 'Jawa Barat')
  );
  const [flyTarget, setFlyTarget] = useState(null);
  const provSearchRef = useRef(null);

  const geoJsonRef = useRef(null);
  const abortRef = useRef(null);

  const config = activeNutrient ? nutrientConfigs[activeNutrient] : null;

  // ─── Fetch GeoJSON ────────────────────────────────────────────────────────
  // Fetch hanya jika: ada nutrisi dipilih DAN provinsi yang dipilih punya dataKey
  useEffect(() => {
    const dataKey = selectedProvince?.dataKey;

    if (!activeNutrient || !dataKey) {
      // Tidak ada nutrisi dipilih, atau provinsi belum punya data → kosongkan peta
      setCurrentGeoData(null);
      setIsLoading(false);
      setLoadError(null);
      return;
    }

    const { filePrefix } = nutrientConfigs[activeNutrient];
    const fileName = `${dataKey}_${filePrefix}.json`;
    const cacheKey = `${dataKey}_${activeNutrient}`;

    if (geoCache.has(cacheKey)) {
      setCurrentGeoData(geoCache.get(cacheKey));
      setIsLoading(false);
      setLoadError(null);
      return;
    }

    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    setIsLoading(true);
    setLoadError(null);
    setCurrentGeoData(null);

    fetch(`/${fileName}`, { signal: abortRef.current.signal })
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((data) => { geoCache.set(cacheKey, data); setCurrentGeoData(data); })
      .catch((err) => { if (err.name !== 'AbortError') { console.error(err); setLoadError(err.message); } })
      .finally(() => setIsLoading(false));

    return () => { if (abortRef.current) abortRef.current.abort(); };
  }, [activeNutrient, selectedProvince]);

  // ─── Style function ───────────────────────────────────────────────────────
  // Filter level sudah ditangani oleh prop `filter` di GeoJSON component,
  // jadi style di sini hanya untuk feature yang memang di-render (selalu matched)
  const styleGeoJson = useCallback(
    (feature) => {
      if (!activeNutrient) return { opacity: 0, fillOpacity: 0 };
      const code = feature.properties.gridcode;
      return {
        fillColor: getColor(activeNutrient, code),
        weight: 0.8,
        opacity: 1,
        color: 'rgba(0,0,0,0)',   // Tidak ada border
        dashArray: '',
        fillOpacity: 0.78,
      };
    },
    [activeNutrient]
  );

  // ─── Re-style without remounting ─────────────────────────────────────────
  // Tidak perlu lagi — filter level sudah re-mount via key change
  // (key mengandung selectedLevel sehingga GeoJSON akan re-render otomatis)

  // ─── Preload on hover ─────────────────────────────────────────────────────
  const preloadNutrient = useCallback((nutrientId) => {
    const dataKey = selectedProvince?.dataKey;
    if (!dataKey) return; // provinsi tidak punya data, skip preload
    const cacheKey = `${dataKey}_${nutrientId}`;
    if (geoCache.has(cacheKey)) return;
    const { filePrefix } = nutrientConfigs[nutrientId];
    const fileName = `${dataKey}_${filePrefix}.json`;
    fetch(`/${fileName}`).then((r) => r.json()).then((data) => geoCache.set(cacheKey, data)).catch(() => {});
  }, [selectedProvince]);

  // ─── Stats ────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    if (!currentGeoData) return { counts: {}, total: 0 };
    const counts = {};
    currentGeoData.features.forEach((f) => {
      const code = Number(f.properties.gridcode);
      if (code) counts[code] = (counts[code] || 0) + 1;
    });
    return { counts, total: currentGeoData.features.length };
  }, [currentGeoData]);

  // ─── onEachFeature ────────────────────────────────────────────────────────
  const onEachFeature = useCallback(
    (feature, layer) => {
      if (!activeNutrient || !config) return;
      const code = feature.properties.gridcode;
      const cfg = config.levels[code] || config.levels.default;
      const area = feature.properties.KABUPATEN || feature.properties.nama_wilayah || 'Wilayah';
      const isDark = code >= 4;

      layer.bindPopup(() => {
        const div = document.createElement('div');
        div.style.cssText = "font-family:'Space Grotesk',sans-serif;min-width:190px;padding:4px;";
        div.innerHTML = `
          <div style="font-size:11px;text-transform:uppercase;letter-spacing:2px;color:#888;margin-bottom:4px;">${config.description}</div>
          <div style="font-size:16px;font-weight:700;color:#1a1a2e;margin-bottom:10px;">${area}</div>
          <div style="background:${cfg.color};color:${isDark ? '#fff' : '#1a1a2e'};padding:8px 12px;border-radius:8px;display:flex;justify-content:space-between;align-items:center;">
            <span style="font-weight:600;font-size:13px;">${cfg.label}</span>
            <span style="font-size:11px;opacity:0.8;">Kelas ${code}</span>
          </div>
          <div style="margin-top:8px;font-size:12px;color:#666;">Rentang: <strong>${cfg.range} ${config.unit}</strong></div>
        `;
        return div;
      }, { maxWidth: 240 });

      layer.on({
        mouseover: (e) => {
          e.target.setStyle({ weight: 2, color: 'rgba(255,255,255,0.6)', fillOpacity: 0.95 });
          setHoveredArea({ name: area, code, cfg });
        },
        mouseout: (e) => {
          if (geoJsonRef.current) geoJsonRef.current.resetStyle(e.target);
          setHoveredArea(null);
        },
      });
    },
    [config, activeNutrient]
  );

  // ─── Tile layers ──────────────────────────────────────────────────────────
  const tileLayers = {
    osm: { url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', attr: '© OpenStreetMap', filter: 'brightness(0.6) saturate(0.4)' },
    topo: { url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', attr: '© OpenTopoMap', filter: 'brightness(0.7)' },
    satellite: { url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', attr: '© ESRI', filter: 'brightness(0.8) saturate(0.7)' },
  };

  useEffect(() => {
    const styleId = 'tile-filter-style';
    let el = document.getElementById(styleId);
    if (!el) { el = document.createElement('style'); el.id = styleId; document.head.appendChild(el); }
    el.textContent = `.leaflet-tile-pane { filter: ${tileLayers[mapStyle].filter}; transition: filter 0.3s ease; }`;
  }, [mapStyle]);

  // ─── Locate user ──────────────────────────────────────────────────────────
  const locateUser = () => {
    setLocStatus('loading');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const center = [pos.coords.latitude, pos.coords.longitude];
        setUserPosition(center);
        setFlyTarget({ center, zoom: 13 });
        setLocStatus('found');
        setTimeout(() => setLocStatus('idle'), 3000);
      },
      () => { setLocStatus('error'); setTimeout(() => setLocStatus('idle'), 3000); }
    );
  };

  // ─── Nutrient change ──────────────────────────────────────────────────────
  const handleNutrientChange = (id) => {
    if (activeNutrient === id) {
      // Clicking same → deselect (empty map)
      setActiveNutrient(null);
      setCurrentGeoData(null);
    } else {
      setActiveNutrient(id);
    }
    setSelectedLevel(null);
  };

  // ─── Province search ──────────────────────────────────────────────────────
  const filteredProvinces = useMemo(() => {
    if (!provinceQuery.trim()) return PROVINCES;
    return PROVINCES.filter((p) =>
      p.name.toLowerCase().includes(provinceQuery.toLowerCase())
    );
  }, [provinceQuery]);

  const handleProvinceSelect = (prov) => {
    setSelectedProvince(prov);
    setProvinceQuery(prov.name);
    setShowProvDropdown(false);
    setFlyTarget({ center: prov.center, zoom: prov.zoom });
    // Reset nutrisi & data saat ganti provinsi
    // (data GeoJSON-nya berbeda per provinsi)
    setActiveNutrient(null);
    setCurrentGeoData(null);
    setSelectedLevel(null);
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (provSearchRef.current && !provSearchRef.current.contains(e.target)) {
        setShowProvDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // ─── Zoom controls ────────────────────────────────────────────────────────
  const zoomIn = () => { if (window.__soilMapRef) window.__soilMapRef.zoomIn(); };
  const zoomOut = () => { if (window.__soilMapRef) window.__soilMapRef.zoomOut(); };

  // ─── RENDER ───────────────────────────────────────────────────────────────
  return (
    <div style={styles.root}>
      <style>{globalCSS}</style>

      {/* ── SIDEBAR ── */}
      <aside style={{ ...styles.sidebar, transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)' }}>

        {/* Header */}
        <div style={styles.sidebarHeader}>
          <div style={styles.logoRow}>
            <div style={styles.logoIcon}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            <span style={styles.logoText}>SoilMap</span>
            <span style={styles.logoBadge}>GIS</span>
          </div>
          <p style={styles.sidebarSubtitle}>Peta Kesuburan Tanah</p>
        </div>

        {/* ── Province Search ── */}
        <div style={styles.section}>
          <label style={styles.sectionLabel}>CARI PROVINSI</label>
          <div ref={provSearchRef} style={{ position: 'relative' }}>
            <div style={styles.searchBox}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ color: 'rgba(255,255,255,0.35)', flexShrink: 0 }}>
                <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
              </svg>
              <input
                type="text"
                placeholder="Ketik nama provinsi..."
                value={provinceQuery}
                onChange={(e) => { setProvinceQuery(e.target.value); setShowProvDropdown(true); }}
                onFocus={() => setShowProvDropdown(true)}
                style={styles.searchInput}
              />
              {provinceQuery && (
                <button
                  onClick={() => { setProvinceQuery(''); setSelectedProvince(null); setShowProvDropdown(false); }}
                  style={styles.searchClear}
                >✕</button>
              )}
            </div>

            {showProvDropdown && (
              <div style={styles.dropdown}>
                {filteredProvinces.length === 0 ? (
                  <div style={styles.dropdownEmpty}>Provinsi tidak ditemukan</div>
                ) : (
                  filteredProvinces.map((prov) => (
                    <div
                      key={prov.name}
                      onClick={() => handleProvinceSelect(prov)}
                      style={{
                        ...styles.dropdownItem,
                        ...(selectedProvince?.name === prov.name ? styles.dropdownItemActive : {}),
                      }}
                      className="dropdown-item"
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ color: 'rgba(255,255,255,0.3)', flexShrink: 0 }}>
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" />
                      </svg>
                      <span style={{ flex: 1 }}>{prov.name}</span>
                      {prov.dataKey ? (
                        <span style={styles.dataBadgeAvail}>● data</span>
                      ) : (
                        <span style={styles.dataBadgeNone}>belum ada</span>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        <div style={styles.divider} />

        {/* ── Nutrient Selector ── */}
        <div style={styles.section}>
          <div style={styles.legendHeader}>
            <label style={styles.sectionLabel}>PARAMETER NUTRISI</label>
            {activeNutrient && (
              <button onClick={() => { setActiveNutrient(null); setCurrentGeoData(null); setSelectedLevel(null); }} style={styles.resetBtn} className="reset-btn">
                ✕ Reset
              </button>
            )}
          </div>

          {/* Peringatan jika provinsi belum punya data */}
          {selectedProvince && !selectedProvince.dataKey && (
            <div style={styles.noDataNotice}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              Data untuk <strong>{selectedProvince.name}</strong> belum tersedia
            </div>
          )}

          <div style={{ ...styles.nutrientGrid, opacity: selectedProvince && !selectedProvince.dataKey ? 0.35 : 1, pointerEvents: selectedProvince && !selectedProvince.dataKey ? 'none' : 'auto' }}>
            {Object.values(nutrientConfigs).map((n) => (
              <button
                key={n.id}
                onClick={() => handleNutrientChange(n.id)}
                onMouseEnter={() => preloadNutrient(n.id)}
                style={{
                  ...styles.nutrientBtn,
                  ...(activeNutrient === n.id ? styles.nutrientBtnActive : {}),
                }}
                className="nutrient-btn"
              >
                <span style={{
                  ...styles.nutrientSymbol,
                  background: activeNutrient === n.id ? n.gradient[2] : 'rgba(255,255,255,0.05)',
                  color: activeNutrient === n.id ? '#fff' : 'rgba(255,255,255,0.5)',
                }}>
                  {n.symbol}
                </span>
                <span style={styles.nutrientName}>{n.label.split(' ')[0]}</span>
              </button>
            ))}
          </div>
        </div>

        <div style={styles.divider} />

        {/* ── Legend / Klasifikasi ── */}
        <div style={styles.section}>
          <div style={styles.legendHeader}>
            <label style={styles.sectionLabel}>KLASIFIKASI</label>
            {selectedLevel !== null && (
              <button onClick={() => setSelectedLevel(null)} style={styles.resetBtn} className="reset-btn">
                ✕ Reset
              </button>
            )}
          </div>

          {!activeNutrient ? (
            <div style={styles.emptyLegend}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: 'rgba(255,255,255,0.15)', marginBottom: 8 }}>
                <path d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
              <span>Pilih parameter nutrisi<br />untuk melihat klasifikasi</span>
            </div>
          ) : (
            <div style={styles.legendList}>
              {[1, 2, 3, 4, 5].map((num) => {
                const lvl = config.levels[num];
                const count = stats.counts[num] || 0;
                const pct = stats.total ? Math.round((count / stats.total) * 100) : 0;
                const isActive = selectedLevel === num;

                return (
                  <div
                    key={num}
                    onClick={() => setSelectedLevel(isActive ? null : num)}
                    style={{ ...styles.legendItem, ...(isActive ? styles.legendItemActive : {}) }}
                    className="legend-item"
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: 6,
                        background: lvl.color,
                        border: isActive ? '2px solid rgba(255,255,255,0.5)' : '1px solid rgba(255,255,255,0.1)',
                        flexShrink: 0,
                        boxShadow: isActive ? `0 0 12px ${lvl.color}80` : 'none',
                        transition: 'all 0.2s',
                      }} />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: isActive ? '#fff' : 'rgba(255,255,255,0.8)' }}>
                          {lvl.label}
                        </div>
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 1 }}>
                          {lvl.range} {config.unit}
                        </div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: isActive ? '#fff' : 'rgba(255,255,255,0.6)', fontFamily: "'DM Mono', monospace" }}>
                        {isLoading ? '—' : `${pct}%`}
                      </div>
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontFamily: "'DM Mono', monospace" }}>
                        kelas {num}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div style={styles.divider} />

        {/* ── Basemap ── */}
        <div style={styles.section}>
          <label style={styles.sectionLabel}>BASEMAP</label>
          <div style={styles.mapStyleRow}>
            {[
              { id: 'osm', icon: '🗺️', label: 'Default' },
              { id: 'topo', icon: '⛰️', label: 'Topo' },
              { id: 'satellite', icon: '🛰️', label: 'Satelit' },
            ].map((ms) => (
              <button key={ms.id} onClick={() => setMapStyle(ms.id)}
                style={{ ...styles.mapStyleBtn, ...(mapStyle === ms.id ? styles.mapStyleBtnActive : {}) }}
                className="map-style-btn"
              >
                <span style={{ fontSize: 16 }}>{ms.icon}</span>
                <span style={{ fontSize: 11 }}>{ms.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Locate ── */}
        <div style={styles.section}>
          <button onClick={locateUser} disabled={locStatus === 'loading'}
            style={{ ...styles.locateBtn, ...(locStatus === 'found' ? styles.locateBtnSuccess : {}), ...(locStatus === 'error' ? styles.locateBtnError : {}) }}
            className="locate-btn"
          >
            {locStatus === 'loading' && <span style={styles.spinner} />}
            {locStatus === 'idle' && (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: 6 }}>
                <circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
              </svg>
            )}
            {{ idle: 'Lokasi Saya', loading: 'Mencari...', found: '✓ Lokasi Ditemukan', error: '✗ Gagal Mengakses' }[locStatus]}
          </button>
        </div>

        {/* ── Hover Card ── */}
        {hoveredArea && config && (
          <div style={styles.hoverCard}>
            <div style={styles.hoverCardDot(hoveredArea.cfg.color)} />
            <div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 2 }}>{hoveredArea.name}</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>{hoveredArea.cfg.label}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontFamily: "'DM Mono', monospace" }}>
                {hoveredArea.cfg.range} {config.unit}
              </div>
            </div>
          </div>
        )}

        {/* ── Footer ── */}
        <div style={styles.sidebarFooter}>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', lineHeight: 1.6 }}>
            Data: Peta Kesuburan Tanah Jabar<br />© SoilMap GIS Dashboard
          </div>
        </div>
      </aside>

      {/* ── SIDEBAR TOGGLE ── */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        style={{ ...styles.sidebarToggle, left: sidebarOpen ? 320 : 0 }}
        className="sidebar-toggle"
      >
        {sidebarOpen ? '‹' : '›'}
      </button>

      {/* ── MAP (full screen, sidebar overlays on top) ── */}
      <main style={styles.mapContainer}>
        <MapContainer
          center={[-6.9175, 107.6191]}
          zoom={9}
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
          preferCanvas={true}
        >
          <TileLayer key={mapStyle} url={tileLayers[mapStyle].url} attribution={tileLayers[mapStyle].attr} />

          <MapController flyTarget={flyTarget} onFlyDone={() => setFlyTarget(null)} />

          {currentGeoData && activeNutrient && (
            <GeoJSON
              key={`${activeNutrient}-${selectedProvince?.dataKey}-${selectedLevel}`}
              ref={geoJsonRef}
              data={currentGeoData}
              style={styleGeoJson}
              onEachFeature={onEachFeature}
              renderer={CANVAS_RENDERER}
              filter={(f) => {
                // Selalu skip Point geometry
                if (f.geometry.type === 'Point') return false;
                // Kalau ada filter level aktif, hanya render feature yang matched
                if (selectedLevel !== null) {
                  return Number(f.properties.gridcode) === selectedLevel;
                }
                return true;
              }}
            />
          )}

          {userPosition && (
            <Marker position={userPosition} icon={L.divIcon({
              className: '',
              html: `<div style="width:16px;height:16px;background:#4fc3f7;border:3px solid #fff;border-radius:50%;box-shadow:0 0 0 4px rgba(79,195,247,0.3);"></div>`,
              iconAnchor: [8, 8],
            })}>
              <Popup>📍 Lokasi Anda</Popup>
            </Marker>
          )}
        </MapContainer>

        {/* Loading Overlay */}
        {isLoading && (
          <div style={styles.loadingOverlay}>
            <div style={styles.loadingCard}>
              <span style={styles.loadingSpinner} />
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>
                Memuat data {config?.label}...
              </span>
            </div>
          </div>
        )}

        {/* Error Overlay */}
        {loadError && !isLoading && (
          <div style={styles.loadingOverlay}>
            <div style={{ ...styles.loadingCard, borderColor: 'rgba(255,100,100,0.3)' }}>
              <span style={{ fontSize: 13, color: '#e57373' }}>✗ Gagal memuat: {loadError}</span>
            </div>
          </div>
        )}

        {/* Active Nutrient Badge */}
        <div style={styles.mapBadge}>
          {activeNutrient && config ? (
            <>
              <span style={{ ...styles.mapBadgeDot, background: config.gradient[2] }} />
              {config.label}
              {selectedLevel !== null && (
                <span style={styles.mapBadgeFilter}>· Kelas {selectedLevel}: {config.levels[selectedLevel]?.label}</span>
              )}
            </>
          ) : (
            <>
              <span style={{ ...styles.mapBadgeDot, background: 'rgba(255,255,255,0.2)' }} />
              <span style={{ color: 'rgba(255,255,255,0.4)' }}>Pilih parameter nutrisi</span>
            </>
          )}
        </div>

        {/* Feature Count Badge */}
        {currentGeoData && (
          <div style={styles.featureCountBadge}>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11 }}>
              {currentGeoData.features.length.toLocaleString()} fitur
            </span>
          </div>
        )}

        {/* Zoom Controls — directly call map methods */}
        <div style={styles.zoomControls}>
          <button className="zoom-btn" style={styles.zoomBtn} onClick={zoomIn}>+</button>
          <button className="zoom-btn" style={{ ...styles.zoomBtn, borderTop: '1px solid rgba(255,255,255,0.1)' }} onClick={zoomOut}>−</button>
        </div>
      </main>
    </div>
  );
}

// ─── STYLES ──────────────────────────────────────────────────────────────────
const styles = {
  root: {
    display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden',
    fontFamily: "'Space Grotesk', 'Segoe UI', sans-serif",
    background: '#0d0d1a', position: 'relative',
  },
  sidebar: {
    // Sidebar sebagai overlay absolute — tidak mempengaruhi lebar map
    position: 'absolute', top: 0, left: 0,
    width: 320, height: '100%',
    background: 'linear-gradient(180deg, #111128 0%, #0d0d1e 100%)',
    borderRight: '1px solid rgba(255,255,255,0.06)',
    display: 'flex', flexDirection: 'column',
    overflowY: 'auto', overflowX: 'hidden',
    transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    zIndex: 1000,
  },
  sidebarHeader: {
    padding: '24px 20px 16px',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
  },
  logoRow: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 },
  logoIcon: {
    width: 32, height: 32,
    background: 'linear-gradient(135deg, #4fc3f7, #7c4dff)',
    borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: '#fff', flexShrink: 0,
  },
  logoText: { fontSize: 20, fontWeight: 700, color: '#fff', letterSpacing: '-0.5px' },
  logoBadge: {
    fontSize: 9, fontWeight: 700,
    background: 'linear-gradient(135deg, #4fc3f780, #7c4dff80)',
    color: '#a8d8ff',
    border: '1px solid rgba(79,195,247,0.3)',
    padding: '2px 7px', borderRadius: 20,
    letterSpacing: 2, fontFamily: "'DM Mono', monospace",
  },
  sidebarSubtitle: { fontSize: 11, color: 'rgba(255,255,255,0.35)', margin: 0, letterSpacing: 0.3 },
  section: { padding: '16px 20px' },
  sectionLabel: {
    display: 'block', fontSize: 10, fontWeight: 700,
    color: 'rgba(255,255,255,0.3)', letterSpacing: 2, marginBottom: 12,
    fontFamily: "'DM Mono', monospace",
  },

  // Province search
  searchBox: {
    display: 'flex', alignItems: 'center', gap: 8,
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 10, padding: '9px 12px',
    transition: 'border-color 0.2s',
  },
  searchInput: {
    flex: 1, background: 'none', border: 'none', outline: 'none',
    color: '#fff', fontSize: 13,
    fontFamily: "'Space Grotesk', sans-serif",
  },
  searchClear: {
    background: 'none', border: 'none', cursor: 'pointer',
    color: 'rgba(255,255,255,0.3)', fontSize: 12, padding: '0 2px',
    lineHeight: 1, flexShrink: 0,
  },
  dropdown: {
    position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0,
    background: '#1a1a35',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 10, zIndex: 9999,
    maxHeight: 220, overflowY: 'auto',
    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
    scrollbarWidth: 'thin',
  },
  dropdownItem: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '9px 14px', cursor: 'pointer',
    fontSize: 13, color: 'rgba(255,255,255,0.7)',
    transition: 'all 0.15s',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
  },
  dropdownItemActive: {
    background: 'rgba(79,195,247,0.12)', color: '#4fc3f7',
  },
  dropdownEmpty: {
    padding: '12px 14px', fontSize: 12,
    color: 'rgba(255,255,255,0.3)', textAlign: 'center',
  },
  dataBadgeAvail: {
    fontSize: 10, padding: '2px 6px',
    background: 'rgba(76,175,80,0.15)',
    border: '1px solid rgba(76,175,80,0.3)',
    color: '#81c784', borderRadius: 10,
    fontFamily: "'DM Mono', monospace",
    flexShrink: 0,
  },
  dataBadgeNone: {
    fontSize: 10, padding: '2px 6px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    color: 'rgba(255,255,255,0.25)', borderRadius: 10,
    fontFamily: "'DM Mono', monospace",
    flexShrink: 0,
  },
  noDataNotice: {
    display: 'flex', alignItems: 'flex-start', gap: 8,
    padding: '10px 12px', marginBottom: 12,
    background: 'rgba(255,180,0,0.08)',
    border: '1px solid rgba(255,180,0,0.2)',
    borderRadius: 8,
    fontSize: 12, color: 'rgba(255,200,80,0.85)',
    lineHeight: 1.5,
  },

  emptyLegend: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    padding: '24px 0', fontSize: 12,
    color: 'rgba(255,255,255,0.2)', textAlign: 'center', lineHeight: 1.7,
  },

  nutrientGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 },
  nutrientBtn: {
    display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 10, cursor: 'pointer', transition: 'all 0.2s ease', textAlign: 'left',
  },
  nutrientBtnActive: {
    background: 'rgba(79,195,247,0.1)',
    border: '1px solid rgba(79,195,247,0.3)',
  },
  nutrientSymbol: {
    width: 28, height: 28, borderRadius: 6,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 12, fontWeight: 700, fontFamily: "'DM Mono', monospace",
    flexShrink: 0, transition: 'all 0.2s',
  },
  nutrientName: { fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.7)', lineHeight: 1.2 },
  divider: { height: 1, background: 'rgba(255,255,255,0.05)', margin: '0 20px' },
  legendHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  resetBtn: {
    fontSize: 11, padding: '3px 9px',
    background: 'rgba(255,100,100,0.15)',
    border: '1px solid rgba(255,100,100,0.3)',
    borderRadius: 20, cursor: 'pointer',
    color: 'rgba(255,160,160,0.9)',
    fontFamily: "'DM Mono', monospace", transition: 'all 0.2s',
  },
  legendList: { display: 'flex', flexDirection: 'column', gap: 6 },
  legendItem: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '10px 12px',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 10, cursor: 'pointer', transition: 'all 0.2s ease',
  },
  legendItemActive: {
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.15)',
  },
  mapStyleRow: { display: 'flex', gap: 8 },
  mapStyleBtn: {
    flex: 1, display: 'flex', flexDirection: 'column',
    alignItems: 'center', gap: 4, padding: '10px 6px',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 10, cursor: 'pointer',
    color: 'rgba(255,255,255,0.5)', transition: 'all 0.2s',
  },
  mapStyleBtnActive: {
    background: 'rgba(79,195,247,0.1)',
    border: '1px solid rgba(79,195,247,0.35)', color: '#4fc3f7',
  },
  locateBtn: {
    width: '100%', padding: '12px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'linear-gradient(135deg, rgba(79,195,247,0.15), rgba(124,77,255,0.15))',
    border: '1px solid rgba(79,195,247,0.3)',
    borderRadius: 10, cursor: 'pointer',
    color: '#4fc3f7', fontSize: 13, fontWeight: 600,
    transition: 'all 0.2s', letterSpacing: 0.3,
  },
  locateBtnSuccess: { background: 'rgba(76,175,80,0.15)', border: '1px solid rgba(76,175,80,0.4)', color: '#81c784' },
  locateBtnError: { background: 'rgba(244,67,54,0.15)', border: '1px solid rgba(244,67,54,0.4)', color: '#e57373' },
  spinner: {
    width: 12, height: 12,
    border: '2px solid rgba(79,195,247,0.3)', borderTop: '2px solid #4fc3f7',
    borderRadius: '50%', display: 'inline-block',
    animation: 'spin 0.8s linear infinite', marginRight: 8,
  },
  hoverCard: {
    margin: '0 20px 16px', padding: '12px 14px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 10, display: 'flex', alignItems: 'center', gap: 12,
    animation: 'fadeIn 0.2s ease',
  },
  hoverCardDot: (color) => ({
    width: 10, height: 10, borderRadius: '50%',
    background: color, flexShrink: 0, boxShadow: `0 0 8px ${color}`,
  }),
  sidebarFooter: { marginTop: 'auto', padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.05)' },
  sidebarToggle: {
    position: 'absolute',
    // Saat open: tepat di kanan sidebar (320px). Saat closed: di kiri layar (0px)
    top: '50%', transform: 'translateY(-50%)',
    zIndex: 1001,
    width: 28, height: 52,
    background: '#1a1a35',
    border: '1px solid rgba(255,255,255,0.12)',
    borderLeft: 'none',
    borderRadius: '0 8px 8px 0',
    cursor: 'pointer',
    color: 'rgba(255,255,255,0.7)',
    fontSize: 18, fontWeight: 300,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    boxShadow: '4px 0 16px rgba(0,0,0,0.4)',
  },
  mapContainer: {
    // Map selalu full viewport — sidebar overlay di atasnya
    position: 'absolute', top: 0, left: 0,
    width: '100%', height: '100%', overflow: 'hidden',
  },
  loadingOverlay: {
    position: 'absolute', bottom: 80, left: '50%',
    transform: 'translateX(-50%)', zIndex: 999, pointerEvents: 'none',
  },
  loadingCard: {
    background: 'rgba(13,13,30,0.9)', backdropFilter: 'blur(12px)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 24, padding: '10px 20px',
    display: 'flex', alignItems: 'center', gap: 10,
    boxShadow: '0 4px 24px rgba(0,0,0,0.4)', whiteSpace: 'nowrap',
  },
  loadingSpinner: {
    width: 14, height: 14,
    border: '2px solid rgba(79,195,247,0.3)', borderTop: '2px solid #4fc3f7',
    borderRadius: '50%', display: 'inline-block',
    animation: 'spin 0.8s linear infinite',
  },
  mapBadge: {
    position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)',
    zIndex: 999,
    background: 'rgba(13,13,30,0.85)', backdropFilter: 'blur(12px)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 24, padding: '8px 18px',
    fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.85)',
    display: 'flex', alignItems: 'center', gap: 8,
    boxShadow: '0 4px 24px rgba(0,0,0,0.4)', whiteSpace: 'nowrap',
  },
  mapBadgeDot: { width: 8, height: 8, borderRadius: '50%', flexShrink: 0 },
  mapBadgeFilter: { color: 'rgba(255,255,255,0.45)', fontWeight: 400, fontSize: 12 },
  featureCountBadge: {
    position: 'absolute', bottom: 32, left: 20, zIndex: 999,
    background: 'rgba(13,13,30,0.8)', backdropFilter: 'blur(8px)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 8, padding: '5px 10px', color: 'rgba(255,255,255,0.45)',
  },
  zoomControls: {
    position: 'absolute', bottom: 32, right: 20, zIndex: 999,
    display: 'flex', flexDirection: 'column',
    borderRadius: 10, overflow: 'hidden',
    boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
    border: '1px solid rgba(255,255,255,0.1)',
  },
  zoomBtn: {
    width: 40, height: 40,
    background: 'rgba(13,13,30,0.9)', backdropFilter: 'blur(8px)',
    border: 'none', cursor: 'pointer',
    color: 'rgba(255,255,255,0.7)', fontSize: 20, fontWeight: 300,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'background 0.15s',
  },
};

// ─── GLOBAL CSS ───────────────────────────────────────────────────────────────
const globalCSS = `
  @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap');

  html, body, #root {
    margin: 0; padding: 0;
    width: 100%; height: 100%;
    overflow: hidden;
  }

  * { box-sizing: border-box; }

  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }

  /* Province search input focus */
  input:focus { outline: none; }

  .legend-item:hover {
    background: rgba(255,255,255,0.07) !important;
    border-color: rgba(255,255,255,0.12) !important;
    transform: translateX(2px);
  }
  .nutrient-btn:hover {
    background: rgba(79,195,247,0.07) !important;
    border-color: rgba(79,195,247,0.2) !important;
  }
  .map-style-btn:hover { background: rgba(255,255,255,0.08) !important; }
  .reset-btn:hover { background: rgba(255,100,100,0.25) !important; }
  .locate-btn:hover {
    background: linear-gradient(135deg, rgba(79,195,247,0.25), rgba(124,77,255,0.25)) !important;
  }
  .sidebar-toggle:hover { background: #252545 !important; }
  .zoom-btn:hover { background: rgba(79,195,247,0.15) !important; color: #4fc3f7 !important; }
  .dropdown-item:hover {
    background: rgba(79,195,247,0.08) !important;
    color: rgba(255,255,255,0.95) !important;
  }

  /* Hide default leaflet zoom control */
  .leaflet-control-zoom { display: none !important; }

  /* Leaflet popup styling */
  .leaflet-popup-content-wrapper {
    background: rgba(13,13,30,0.95) !important;
    backdrop-filter: blur(16px) !important;
    border: 1px solid rgba(255,255,255,0.12) !important;
    border-radius: 12px !important;
    box-shadow: 0 8px 32px rgba(0,0,0,0.6) !important;
    color: #fff !important;
    padding: 0 !important;
  }
  .leaflet-popup-content { margin: 14px 16px !important; color: #fff !important; }
  .leaflet-popup-tip { background: rgba(13,13,30,0.95) !important; }
  .leaflet-popup-close-button { color: rgba(255,255,255,0.4) !important; font-size: 16px !important; }
  .leaflet-popup-close-button:hover { color: #fff !important; }

  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(4px); }
    to { opacity: 1; transform: translateY(0); }
  }
`;