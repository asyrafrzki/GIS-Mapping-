import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// ─── PERFORMANCE: Canvas renderer (created ONCE outside component) ────────────
const CANVAS_RENDERER = L.canvas({ padding: 0.5 });

// ─── PERFORMANCE: In-memory GeoJSON cache ────────────────────────────────────
const geoCache = new Map();

// ─── NUTRIENT CONFIGS ────────────────────────────────────────────────────────
const nutrientConfigs = {
  nitrogen: {
    id: 'nitrogen',
    fileName: 'JABAR_NITROGEN.json',
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
    fileName: 'JABAR_PHOSPHOR.json',
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
    fileName: 'JABAR_KALIUM.json',
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
    fileName: 'JABAR_MAGNESIUM.json',
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

// ─── MAP HELPERS ─────────────────────────────────────────────────────────────
function FlyToLocation({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.flyTo(center, 13, { duration: 1.5 });
  }, [center]);
  return null;
}

// ─── MAIN APP ────────────────────────────────────────────────────────────────
export default function App() {
  // null = tidak ada nutrisi dipilih, peta kosong saat pertama buka
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

  const geoJsonRef = useRef(null);
  const abortRef = useRef(null);

  // Guard: config hanya ada kalau nutrisi dipilih
  const config = activeNutrient ? nutrientConfigs[activeNutrient] : null;

  // ─── Tile layers dengan filter per basemap ────────────────────────────────
  const tileLayers = {
    osm: {
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      attr: '© OpenStreetMap',
      filter: 'brightness(0.6) saturate(0.4)',
    },
    topo: {
      url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
      attr: '© OpenTopoMap',
      filter: 'brightness(0.65) saturate(0.5)',
    },
    satellite: {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      attr: '© ESRI',
      filter: 'brightness(0.85) saturate(0.8)',
    },
  };

  // ─── Inject tile filter style dinamis saat mapStyle berubah ──────────────
  useEffect(() => {
    const styleId = 'tile-filter-style';
    let el = document.getElementById(styleId);
    if (!el) {
      el = document.createElement('style');
      el.id = styleId;
      document.head.appendChild(el);
    }
    el.textContent = `.leaflet-tile-pane { filter: ${tileLayers[mapStyle].filter}; transition: filter 0.3s ease; }`;
  }, [mapStyle]);

  // ─── Fetch GeoJSON dengan cache + AbortController ─────────────────────────
  useEffect(() => {
    // Tidak ada nutrisi dipilih → kosongkan data
    if (!activeNutrient) {
      setCurrentGeoData(null);
      setIsLoading(false);
      setLoadError(null);
      return;
    }

    const { fileName } = nutrientConfigs[activeNutrient] ?? {};
    if (!fileName) return;

    // Cache hit
    if (geoCache.has(activeNutrient)) {
      setCurrentGeoData(geoCache.get(activeNutrient));
      setIsLoading(false);
      setLoadError(null);
      return;
    }

    // Cancel request sebelumnya
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    setIsLoading(true);
    setLoadError(null);
    setCurrentGeoData(null);

    const loadData = async () => {
      try {
        const res = await fetch(`/${fileName}`, {
          signal: abortRef.current.signal,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        geoCache.set(activeNutrient, data);
        setCurrentGeoData(data);
      } catch (err) {
        if (err.name === 'AbortError') return;
        console.error('Failed to load GeoJSON:', err);
        setLoadError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();

    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, [activeNutrient]);

  // ─── Style function ───────────────────────────────────────────────────────
  const styleGeoJson = useCallback(
    (feature) => {
      if (!activeNutrient) return {};
      const code = feature.properties.gridcode;
      const isFiltered = selectedLevel !== null;
      const isMatch = Number(code) === selectedLevel;
      return {
        fillColor: getColor(activeNutrient, code),
        weight: isFiltered ? (isMatch ? 2 : 0.5) : 1,
        opacity: 1,
        color: isFiltered
          ? isMatch ? '#e31818' : '#333'
          : 'rgba(255,255,255,0.4)',
        dashArray: '',
        fillOpacity: isFiltered ? (isMatch ? 0.85 : 0.15) : 0.65,
      };
    },
    [activeNutrient, selectedLevel]
  );

  // ─── Re-style in place saat filter level berubah ─────────────────────────
  useEffect(() => {
    if (!geoJsonRef.current || !activeNutrient) return;
    geoJsonRef.current.setStyle(styleGeoJson);
  }, [selectedLevel, styleGeoJson, activeNutrient]);

  // ─── Preload on hover ─────────────────────────────────────────────────────
  const preloadNutrient = useCallback((nutrientId) => {
    if (geoCache.has(nutrientId)) return;
    const { fileName } = nutrientConfigs[nutrientId];
    if (!fileName) return;
    fetch(`/${fileName}`)
      .then((r) => r.json())
      .then((data) => geoCache.set(nutrientId, data))
      .catch(() => {});
  }, []);

  // ─── Stats per level ──────────────────────────────────────────────────────
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
      const area =
        feature.properties.KABUPATEN ||
        feature.properties.nama_wilayah ||
        'Wilayah';
      const isDark = code >= 4;

      layer.bindPopup(() => {
        const div = document.createElement('div');
        div.style.cssText =
          "font-family:'Space Grotesk',sans-serif;min-width:190px;padding:4px;";
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
          e.target.setStyle({ weight: 2, color: '#fff', fillOpacity: 0.85 });
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

  const handleNutrientChange = (id) => {
    setActiveNutrient(id);
    setSelectedLevel(null);
  };

  // Reset semua: kembali ke state awal (tidak ada yang dipilih)
  const handleNutrientReset = () => {
    setActiveNutrient(null);
    setSelectedLevel(null);
    setCurrentGeoData(null);
    setHoveredArea(null);
  };

  const locateUser = () => {
    setLocStatus('loading');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserPosition([pos.coords.latitude, pos.coords.longitude]);
        setLocStatus('found');
        setTimeout(() => setLocStatus('idle'), 3000);
      },
      () => {
        setLocStatus('error');
        setTimeout(() => setLocStatus('idle'), 3000);
      }
    );
  };

  // ─── RENDER ───────────────────────────────────────────────────────────────
  return (
    <div style={styles.root}>
      <style>{globalCSS}</style>

      {/* ── SIDEBAR ── */}
      <aside
        style={{
          ...styles.sidebar,
          transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
        }}
      >
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

        {/* Nutrient Selector */}
        <div style={styles.section}>
          <div style={styles.sectionHeaderRow}>
            <label style={styles.sectionLabel}>PARAMETER NUTRISI</label>
            {/* Tombol reset muncul hanya kalau ada nutrisi yang aktif */}
            {activeNutrient !== null && (
              <button
                onClick={handleNutrientReset}
                style={styles.resetBtn}
                className="reset-btn"
              >
                ✕ Reset
              </button>
            )}
          </div>

          <div style={styles.nutrientGrid}>
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
                <span
                  style={{
                    ...styles.nutrientSymbol,
                    background:
                      activeNutrient === n.id
                        ? n.gradient[2]
                        : 'rgba(255,255,255,0.05)',
                    color:
                      activeNutrient === n.id ? '#fff' : 'rgba(255,255,255,0.5)',
                  }}
                >
                  {n.symbol}
                </span>
                <span style={styles.nutrientName}>{n.label.split(' ')[0]}</span>
              </button>
            ))}
          </div>

          {/* Hint teks saat belum ada yang dipilih */}
          {activeNutrient === null && (
            <p style={styles.hintText}>
              Pilih parameter di atas untuk menampilkan layer peta.
            </p>
          )}
        </div>

        <div style={styles.divider} />

        {/* Legend — hanya muncul kalau ada nutrisi dipilih */}
        {config && (
          <>
            <div style={styles.section}>
              <div style={styles.sectionHeaderRow}>
                <label style={styles.sectionLabel}>KLASIFIKASI</label>
                {selectedLevel !== null && (
                  <button
                    onClick={() => setSelectedLevel(null)}
                    style={styles.resetBtn}
                    className="reset-btn"
                  >
                    ✕ Reset
                  </button>
                )}
              </div>

              <div style={styles.legendList}>
                {[1, 2, 3, 4, 5].map((num) => {
                  const lvl = config.levels[num];
                  const count = stats.counts[num] || 0;
                  const pct = stats.total
                    ? Math.round((count / stats.total) * 100)
                    : 0;
                  const isActive = selectedLevel === num;

                  return (
                    <div
                      key={num}
                      onClick={() => setSelectedLevel(isActive ? null : num)}
                      style={{
                        ...styles.legendItem,
                        ...(isActive ? styles.legendItemActive : {}),
                      }}
                      className="legend-item"
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                        <div
                          style={{
                            width: 28, height: 28, borderRadius: 6,
                            background: lvl.color,
                            border: isActive
                              ? '2px solid rgba(255,255,255,0.5)'
                              : '1px solid rgba(255,255,255,0.1)',
                            flexShrink: 0,
                            boxShadow: isActive ? `0 0 12px ${lvl.color}80` : 'none',
                            transition: 'all 0.2s',
                          }}
                        />
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
            </div>
            <div style={styles.divider} />
          </>
        )}

        {/* Map Style */}
        <div style={styles.section}>
          <label style={{ ...styles.sectionLabel, marginBottom: 12 }}>BASEMAP</label>
          <div style={styles.mapStyleRow}>
            {[
              { id: 'osm', icon: '🗺️', label: 'Default' },
              { id: 'topo', icon: '⛰️', label: 'Topo' },
              { id: 'satellite', icon: '🛰️', label: 'Satelit' },
            ].map((ms) => (
              <button
                key={ms.id}
                onClick={() => setMapStyle(ms.id)}
                style={{
                  ...styles.mapStyleBtn,
                  ...(mapStyle === ms.id ? styles.mapStyleBtnActive : {}),
                }}
                className="map-style-btn"
              >
                <span style={{ fontSize: 16 }}>{ms.icon}</span>
                <span style={{ fontSize: 11 }}>{ms.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Locate Button */}
        <div style={styles.section}>
          <button
            onClick={locateUser}
            disabled={locStatus === 'loading'}
            style={{
              ...styles.locateBtn,
              ...(locStatus === 'found' ? styles.locateBtnSuccess : {}),
              ...(locStatus === 'error' ? styles.locateBtnError : {}),
            }}
            className="locate-btn"
          >
            {locStatus === 'loading' && <span style={styles.spinner} />}
            {locStatus === 'found' && '✓ '}
            {locStatus === 'error' && '✗ '}
            {locStatus === 'idle' && (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: 6 }}>
                <circle cx="12" cy="12" r="3" />
                <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
              </svg>
            )}
            {{ idle: 'Lokasi Saya', loading: 'Mencari...', found: 'Lokasi Ditemukan', error: 'Gagal Mengakses' }[locStatus]}
          </button>
        </div>

        {/* Hover Info Card */}
        {hoveredArea && config && (
          <div style={styles.hoverCard}>
            <div style={styles.hoverCardDot(hoveredArea.cfg.color)} />
            <div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 2 }}>
                {hoveredArea.name}
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>
                {hoveredArea.cfg.label}
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontFamily: "'DM Mono', monospace" }}>
                {hoveredArea.cfg.range} {config.unit}
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={styles.sidebarFooter}>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', lineHeight: 1.6 }}>
            Data: Peta Kesuburan Tanah Jabar<br />© SoilMap GIS Dashboard
          </div>
        </div>
      </aside>

      {/* ── SIDEBAR TOGGLE ── */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        style={{ ...styles.sidebarToggle, left: sidebarOpen ? 320 : 16 }}
        className="sidebar-toggle"
      >
        {sidebarOpen ? '‹' : '›'}
      </button>

      {/* ── MAP ── */}
      <main style={styles.mapContainer}>
        <MapContainer
          center={[-6.9175, 107.6191]}
          zoom={9}
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
          preferCanvas={true}
        >
          <TileLayer
            key={mapStyle}
            url={tileLayers[mapStyle].url}
            attribution={tileLayers[mapStyle].attr}
          />

          {/* GeoJSON hanya dirender kalau ada nutrisi dipilih dan data sudah ada */}
          {currentGeoData && activeNutrient && (
            <GeoJSON
              key={activeNutrient}
              ref={geoJsonRef}
              data={currentGeoData}
              style={styleGeoJson}
              onEachFeature={onEachFeature}
              renderer={CANVAS_RENDERER}
              filter={(f) => f.geometry.type !== 'Point'}
            />
          )}

          {userPosition && (
            <>
              <FlyToLocation center={userPosition} />
              <Marker
                position={userPosition}
                icon={L.divIcon({
                  className: '',
                  html: `<div style="width:16px;height:16px;background:#4fc3f7;border:3px solid #fff;border-radius:50%;box-shadow:0 0 0 4px rgba(79,195,247,0.3);"></div>`,
                  iconAnchor: [8, 8],
                })}
              >
                <Popup>📍 Lokasi Anda</Popup>
              </Marker>
            </>
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
              <span style={{ fontSize: 13, color: '#e57373' }}>
                ✗ Gagal memuat: {loadError}
              </span>
            </div>
          </div>
        )}

        {/* Active Nutrient Badge — hanya muncul kalau ada nutrisi dipilih */}
        {config && (
          <div style={styles.mapBadge}>
            <span style={{ ...styles.mapBadgeDot, background: config.gradient[2] }} />
            {config.label}
            {selectedLevel !== null && (
              <span style={styles.mapBadgeFilter}>
                · Kelas {selectedLevel}: {config.levels[selectedLevel]?.label}
              </span>
            )}
          </div>
        )}

        {/* Feature Count Badge */}
        {currentGeoData && activeNutrient && (
          <div style={styles.featureCountBadge}>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11 }}>
              {currentGeoData.features.length.toLocaleString()} fitur
            </span>
          </div>
        )}

        {/* Zoom Controls */}
        <div style={styles.zoomControls}>
          <button
            className="zoom-btn"
            style={styles.zoomBtn}
            onClick={() => document.querySelector('.leaflet-control-zoom-in')?.click()}
          >+</button>
          <button
            className="zoom-btn"
            style={{ ...styles.zoomBtn, borderTop: '1px solid rgba(255,255,255,0.1)' }}
            onClick={() => document.querySelector('.leaflet-control-zoom-out')?.click()}
          >−</button>
        </div>
      </main>
    </div>
  );
}

// ─── STYLES ──────────────────────────────────────────────────────────────────
const styles = {
  root: {
    display: 'flex', height: '100vh', width: '100vw',
    overflow: 'hidden',
    fontFamily: "'Space Grotesk', 'Segoe UI', sans-serif",
    background: '#0d0d1a', position: 'relative',
  },
  sidebar: {
    width: 320, minWidth: 320, height: '100%',
    background: 'linear-gradient(180deg, #111128 0%, #0d0d1e 100%)',
    borderRight: '1px solid rgba(255,255,255,0.06)',
    display: 'flex', flexDirection: 'column',
    overflowY: 'auto', overflowX: 'hidden',
    transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    zIndex: 1000, flexShrink: 0,
  },
  sidebarHeader: {
    padding: '24px 20px 16px',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
  },
  logoRow: {
    display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6,
  },
  logoIcon: {
    width: 32, height: 32,
    background: 'linear-gradient(135deg, #4fc3f7, #7c4dff)',
    borderRadius: 8, display: 'flex', alignItems: 'center',
    justifyContent: 'center', color: '#fff', flexShrink: 0,
  },
  logoText: { fontSize: 20, fontWeight: 700, color: '#fff', letterSpacing: '-0.5px' },
  logoBadge: {
    fontSize: 9, fontWeight: 700,
    background: 'linear-gradient(135deg, #4fc3f780, #7c4dff80)',
    color: '#a8d8ff', border: '1px solid rgba(79,195,247,0.3)',
    padding: '2px 7px', borderRadius: 20, letterSpacing: 2,
    fontFamily: "'DM Mono', monospace",
  },
  sidebarSubtitle: {
    fontSize: 11, color: 'rgba(255,255,255,0.35)',
    margin: 0, letterSpacing: 0.3,
  },
  section: { padding: '16px 20px' },
  sectionHeaderRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 12,
  },
  sectionLabel: {
    display: 'block', fontSize: 10, fontWeight: 700,
    color: 'rgba(255,255,255,0.3)', letterSpacing: 2, marginBottom: 0,
    fontFamily: "'DM Mono', monospace",
  },
  hintText: {
    fontSize: 11, color: 'rgba(255,255,255,0.25)',
    margin: '12px 0 0', lineHeight: 1.6, fontStyle: 'italic',
  },
  nutrientGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 },
  nutrientBtn: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '10px 12px',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 10, cursor: 'pointer',
    transition: 'all 0.2s ease', textAlign: 'left',
  },
  nutrientBtnActive: {
    background: 'rgba(79,195,247,0.1)',
    border: '1px solid rgba(79,195,247,0.3)',
  },
  nutrientSymbol: {
    width: 28, height: 28, borderRadius: 6,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 12, fontWeight: 700,
    fontFamily: "'DM Mono', monospace",
    flexShrink: 0, transition: 'all 0.2s',
  },
  nutrientName: { fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.7)', lineHeight: 1.2 },
  divider: { height: 1, background: 'rgba(255,255,255,0.05)', margin: '0 20px' },
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
    border: '1px solid rgba(79,195,247,0.35)',
    color: '#4fc3f7',
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
    border: '2px solid rgba(79,195,247,0.3)',
    borderTop: '2px solid #4fc3f7',
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
  sidebarFooter: {
    marginTop: 'auto', padding: '16px 20px',
    borderTop: '1px solid rgba(255,255,255,0.05)',
  },
  sidebarToggle: {
    position: 'absolute', top: '50%', transform: 'translateY(-50%)',
    zIndex: 1001, width: 28, height: 52,
    background: '#1a1a35', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '0 8px 8px 0', cursor: 'pointer',
    color: 'rgba(255,255,255,0.6)', fontSize: 18, fontWeight: 300,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    boxShadow: '4px 0 12px rgba(0,0,0,0.3)',
  },
  mapContainer: { flex: 1, position: 'relative', overflow: 'hidden' },
  loadingOverlay: {
    position: 'absolute', bottom: 80, left: '50%',
    transform: 'translateX(-50%)', zIndex: 999, pointerEvents: 'none',
  },
  loadingCard: {
    background: 'rgba(13,13,30,0.9)', backdropFilter: 'blur(12px)',
    border: '1px solid rgba(255,255,255,0.12)', borderRadius: 24,
    padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 10,
    boxShadow: '0 4px 24px rgba(0,0,0,0.4)', whiteSpace: 'nowrap',
  },
  loadingSpinner: {
    width: 14, height: 14,
    border: '2px solid rgba(79,195,247,0.3)',
    borderTop: '2px solid #4fc3f7',
    borderRadius: '50%', display: 'inline-block',
    animation: 'spin 0.8s linear infinite',
  },
  mapBadge: {
    position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)',
    zIndex: 999, background: 'rgba(13,13,30,0.85)', backdropFilter: 'blur(12px)',
    border: '1px solid rgba(255,255,255,0.12)', borderRadius: 24,
    padding: '8px 18px', fontSize: 13, fontWeight: 600,
    color: 'rgba(255,255,255,0.85)', display: 'flex', alignItems: 'center', gap: 8,
    boxShadow: '0 4px 24px rgba(0,0,0,0.4)', whiteSpace: 'nowrap',
  },
  mapBadgeDot: { width: 8, height: 8, borderRadius: '50%', flexShrink: 0 },
  mapBadgeFilter: { color: 'rgba(255,255,255,0.45)', fontWeight: 400, fontSize: 12 },
  featureCountBadge: {
    position: 'absolute', bottom: 32, left: 20, zIndex: 999,
    background: 'rgba(13,13,30,0.8)', backdropFilter: 'blur(8px)',
    border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8,
    padding: '5px 10px', color: 'rgba(255,255,255,0.45)',
  },
  zoomControls: {
    position: 'absolute', bottom: 32, right: 20, zIndex: 999,
    display: 'flex', flexDirection: 'column',
    borderRadius: 10, overflow: 'hidden',
    boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
    border: '1px solid rgba(255,255,255,0.1)',
  },
  zoomBtn: {
    width: 40, height: 40, background: 'rgba(13,13,30,0.9)',
    backdropFilter: 'blur(8px)', border: 'none', cursor: 'pointer',
    color: 'rgba(255,255,255,0.7)', fontSize: 20, fontWeight: 300,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'background 0.15s',
  },
};

// ─── GLOBAL CSS ───────────────────────────────────────────────────────────────
const globalCSS = `
  @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap');

  * { box-sizing: border-box; }

  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }

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

  .leaflet-control-zoom { display: none !important; }

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