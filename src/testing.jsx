import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// ─── CANVAS RENDERER ──────────────────────────────────────────────────────────
const CANVAS_RENDERER = L.canvas({ padding: 0.5 });

// ─── PRESET LAYERS ────────────────────────────────────────────────────────────
const PRESET_LAYERS = [
  {
    id: 'nitrogen_json',
    label: 'JABAR Nitrogen',
    file: 'JABAR_NITROGEN',
    ext: 'json',
    color: '#4fc3f7',
    description: 'Nitrogen · JSON',
  },
  {
    id: 'magnesium_json',
    label: 'JABAR Magnesium',
    file: 'JABAR_MAGNESIUM',
    ext: 'json',
    color: '#ce93d8',
    description: 'Magnesium · JSON',
  },
  {
    id: 'jabar_shp',
    label: 'Jabar N24 (SHP)',
    file: 'Jabar_N24',
    ext: 'shp',
    color: '#ff8a65',
    description: 'Shapefile · .shp + .dbf',
  },
  {
    id: 'custom_1',
    label: 'Custom Layer',
    file: null,
    ext: null,
    color: '#a5d6a7',
    description: 'Isi manual / upload',
  },
];

// ─── WARNA GRIDCODE ──────────────────────────────────────────────────────────
const LEVEL_COLORS = {
  1: '#d0f0c0',
  2: '#a8d08d',
  3: '#5a9e4b',
  4: '#2d6a2e',
  5: '#0d3d0f',
  default: '#4a4a6a',
};

// ─── HELPER: Import shpjs dengan benar untuk v6 ───────────────────────────────
// shpjs v6 export: default function + named exports (parseShp, parseDbf, combine)
async function getShpLib() {
  const mod = await import('shpjs');
  // mod.default = fungsi shp(url)
  // mod.parseShp, mod.parseDbf, mod.combine = named exports
  // Fallback jika CJS bundle (mod.default punya semua method)
  const lib = mod.default || mod;
  return {
    parseShp: mod.parseShp || lib.parseShp,
    parseDbf: mod.parseDbf || lib.parseDbf,
    combine:  mod.combine  || lib.combine,
    parseZip: mod.parseZip || lib.parseZip,
    shp:      lib,
  };
}

// ─── MAP CONTROLLER ───────────────────────────────────────────────────────────
function MapController({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    window.__testMapRef = map;
    setTimeout(() => map.invalidateSize(), 100);
  }, [map]);
  useEffect(() => {
    if (center) map.flyTo(center, zoom || 9, { duration: 1.2 });
  }, [center, zoom]);
  return null;
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function Testing() {
  // ── Layer stack: support multi-layer testing ──────────────────────────────
  const [layers, setLayers]             = useState([]); // [{id, name, data, color, visible}]
  const [activeLayerId, setActiveLayerId] = useState(null);

  const [isLoading, setIsLoading]       = useState(false);
  const [loadError, setLoadError]       = useState(null);
  const [loadMethod, setLoadMethod]     = useState('geojson');
  const [activePreset, setActivePreset] = useState(null);
  const [colorMode, setColorMode]       = useState('gridcode');
  const [singleColor, setSingleColor]   = useState('#4fc3f7');
  const [opacity, setOpacity]           = useState(0.75);
  const [strokeVisible, setStrokeVisible] = useState(false);
  const [mapStyle, setMapStyle]         = useState('osm');
  const [flyCenter, setFlyCenter]       = useState(null);
  const [flyZoom, setFlyZoom]           = useState(9);
  const [featureInfo, setFeatureInfo]   = useState(null);
  const [log, setLog]                   = useState([]);
  const [manualUrl, setManualUrl]       = useState('');
  const [dragging, setDragging]         = useState(false);
  const [randomColors, setRandomColors] = useState({});

  // Panel tab
  const [panelTab, setPanelTab]         = useState('load'); // 'load' | 'layers' | 'style'

  const fileInputRef = useRef(null);
  const geoJsonRefs  = useRef({});

  // ─── Logger ───────────────────────────────────────────────────────────────
  const addLog = useCallback((msg, type = 'info') => {
    const ts = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLog((prev) => [{ ts, msg, type, id: Date.now() + Math.random() }, ...prev].slice(0, 80));
  }, []);

  // ─── Random color ─────────────────────────────────────────────────────────
  const getRandomColor = useCallback((id) => {
    if (randomColors[id]) return randomColors[id];
    const h = Math.floor(Math.random() * 360);
    const c = `hsl(${h},65%,55%)`;
    setRandomColors((prev) => ({ ...prev, [id]: c }));
    return c;
  }, [randomColors]);

  // ─── Style function ───────────────────────────────────────────────────────
  const styleFeature = useCallback((feature, layerColor, idx) => {
    let fill = layerColor || singleColor;
    if (colorMode === 'gridcode') {
      const code = feature?.properties?.gridcode;
      fill = LEVEL_COLORS[code] || LEVEL_COLORS.default;
    } else if (colorMode === 'random') {
      const key = idx ?? feature?.properties?.FID ?? feature?.properties?.OBJECTID ?? Math.random();
      fill = getRandomColor(key);
    } else if (colorMode === 'single') {
      fill = singleColor;
    } else if (colorMode === 'layer') {
      fill = layerColor || singleColor;
    }
    return {
      fillColor: fill,
      fillOpacity: opacity,
      weight: strokeVisible ? 1 : 0,
      color: 'rgba(255,255,255,0.5)',
      opacity: strokeVisible ? 1 : 0,
    };
  }, [colorMode, singleColor, opacity, strokeVisible, getRandomColor]);

  // ─── onEachFeature ────────────────────────────────────────────────────────
  const onEachFeature = useCallback((feature, layer, layerId) => {
    const props = feature.properties || {};
    layer.on({
      click: () => { setFeatureInfo(props); setActiveLayerId(layerId); },
      mouseover: (e) => {
        e.target.setStyle({ weight: 2, color: '#fff', fillOpacity: Math.min(opacity + 0.15, 1) });
      },
      mouseout: (e) => {
        const ref = geoJsonRefs.current[layerId];
        if (ref) ref.resetStyle(e.target);
      },
    });
  }, [opacity]);

  // ─── fitToBoundsData ──────────────────────────────────────────────────────
  const fitToBoundsData = useCallback((data) => {
    if (!data || !window.__testMapRef) return;
    try {
      const bounds = L.geoJSON(data).getBounds();
      if (bounds.isValid()) {
        window.__testMapRef.fitBounds(bounds, { padding: [40, 40] });
        addLog('✓ Fit to bounds OK', 'info');
      }
    } catch (e) {
      addLog('Fit bounds gagal: ' + e.message, 'warn');
    }
  }, [addLog]);

  // ─── Add layer to stack ───────────────────────────────────────────────────
  const addLayer = useCallback((data, name, color) => {
    const id = `layer_${Date.now()}`;
    setLayers((prev) => [...prev, { id, name, data, color: color || '#4fc3f7', visible: true }]);
    setActiveLayerId(id);
    addLog(`Layer ditambahkan: ${name}`, 'success');
    setTimeout(() => fitToBoundsData(data), 300);
    setPanelTab('layers');
    return id;
  }, [addLog, fitToBoundsData]);

  // ─── Load GeoJSON / JSON ──────────────────────────────────────────────────
  const loadGeoJson = useCallback(async (url, label, color) => {
    setIsLoading(true);
    setLoadError(null);
    setFeatureInfo(null);
    addLog(`Memuat GeoJSON: ${label || url}`, 'info');
    try {
      const res = await fetch(url);
      const contentType = res.headers.get('content-type') || '';
      if (!res.ok) throw new Error(`HTTP ${res.status} — file tidak ditemukan: ${url}`);
      if (contentType.includes('text/html')) throw new Error(`Server return HTML. Pastikan file ada di /public`);
      const data = await res.json();
      if (!data.features) throw new Error('Bukan GeoJSON valid (tidak ada field "features")');
      addLog(`✓ Dimuat: ${data.features.length.toLocaleString()} fitur`, 'success');
      addLayer(data, label || url, color);
    } catch (err) {
      setLoadError(err.message);
      addLog(`✗ ${err.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [addLog, addLayer]);

  // ─── Load Shapefile (FIXED untuk shpjs v6) ───────────────────────────────
  const loadShapefile = useCallback(async (baseName, label, color) => {
    setIsLoading(true);
    setLoadError(null);
    addLog(`Memuat SHP: /${baseName}.shp + .dbf`, 'info');
    try {
      // Step 1: Import shpjs dengan benar
      const { parseShp, parseDbf, combine } = await getShpLib();

      if (!parseShp || !parseDbf || !combine) {
        throw new Error('shpjs API tidak tersedia — coba: npm install shpjs@latest');
      }

      // Step 2: Fetch kedua file paralel
      const [shpRes, dbfRes] = await Promise.all([
        fetch(`/${baseName}.shp`),
        fetch(`/${baseName}.dbf`),
      ]);

      if (!shpRes.ok) throw new Error(`File ${baseName}.shp tidak ditemukan di /public`);
      if (!dbfRes.ok) throw new Error(`File ${baseName}.dbf tidak ditemukan di /public`);

      const [shpBuf, dbfBuf] = await Promise.all([
        shpRes.arrayBuffer(),
        dbfRes.arrayBuffer(),
      ]);

      addLog('File berhasil difetch, parsing...', 'info');

      // Step 3: Parse dengan cara BENAR untuk shpjs v6
      // parseShp dan parseDbf adalah SYNCHRONOUS, combine juga synchronous
      const geometries  = parseShp(shpBuf);
      const properties  = parseDbf(dbfBuf);
      const data        = combine([geometries, properties]);

      if (!data?.features) throw new Error('Hasil parse tidak valid');

      addLog(`✓ SHP dimuat: ${data.features.length.toLocaleString()} fitur`, 'success');
      addLayer(data, label || baseName, color);
    } catch (err) {
      setLoadError(err.message);
      addLog(`✗ ${err.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [addLog, addLayer]);

  // ─── Upload file (FIXED) ──────────────────────────────────────────────────
  const handleFileUpload = useCallback(async (files) => {
    if (!files || files.length === 0) return;
    const arr = Array.from(files);

    const jsonFile = arr.find((f) => f.name.endsWith('.geojson') || f.name.endsWith('.json'));
    const shpFile  = arr.find((f) => f.name.endsWith('.shp'));
    const dbfFile  = arr.find((f) => f.name.endsWith('.dbf'));
    const zipFile  = arr.find((f) => f.name.endsWith('.zip'));

    // ── GeoJSON / JSON ────────────────────────────────────────────────────
    if (jsonFile) {
      addLog(`Upload JSON: ${jsonFile.name}`, 'info');
      setIsLoading(true);
      setLoadError(null);
      try {
        const text = await jsonFile.text();
        const data = JSON.parse(text);
        if (!data.features) throw new Error('Bukan GeoJSON valid (tidak ada field features)');
        addLog(`✓ Upload OK: ${data.features.length.toLocaleString()} fitur`, 'success');
        addLayer(data, jsonFile.name, '#4fc3f7');
      } catch (err) {
        setLoadError(err.message);
        addLog(`✗ ${err.message}`, 'error');
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // ── ZIP (shpjs bisa langsung baca zip) ───────────────────────────────
    if (zipFile) {
      addLog(`Upload ZIP: ${zipFile.name}`, 'info');
      setIsLoading(true);
      setLoadError(null);
      try {
        const { parseZip } = await getShpLib();
        if (!parseZip) throw new Error('parseZip tidak tersedia di shpjs versi ini');
        const buf  = await zipFile.arrayBuffer();
        const data = await parseZip(buf);
        const fc   = Array.isArray(data) ? data[0] : data;
        if (!fc?.features) throw new Error('Hasil parse ZIP tidak valid');
        addLog(`✓ Upload ZIP OK: ${fc.features.length.toLocaleString()} fitur`, 'success');
        addLayer(fc, zipFile.name, '#ff8a65');
      } catch (err) {
        setLoadError(err.message);
        addLog(`✗ ${err.message}`, 'error');
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // ── SHP + DBF ────────────────────────────────────────────────────────
    if (shpFile) {
      addLog(`Upload SHP: ${shpFile.name}${dbfFile ? ' + DBF' : ' (tanpa DBF)'}`, 'info');
      setIsLoading(true);
      setLoadError(null);
      try {
        const { parseShp, parseDbf, combine } = await getShpLib();

        if (!parseShp || !combine) {
          throw new Error('shpjs API tidak tersedia. Cek: npm install shpjs');
        }

        const shpBuf = await shpFile.arrayBuffer();

        let data;
        if (dbfFile) {
          const dbfBuf = await dbfFile.arrayBuffer();
          // CARA BENAR: synchronous parse lalu combine
          const geometries = parseShp(shpBuf);
          const properties = parseDbf(dbfBuf);
          data = combine([geometries, properties]);
        } else {
          // Tanpa DBF: hanya geometri, properties kosong
          const geometries = parseShp(shpBuf);
          data = {
            type: 'FeatureCollection',
            features: geometries.map((g, i) => ({
              type: 'Feature',
              geometry: g,
              properties: { id: i },
            })),
          };
        }

        if (!data?.features) throw new Error('Hasil parse tidak valid');
        addLog(`✓ Upload SHP OK: ${data.features.length.toLocaleString()} fitur`, 'success');
        addLayer(data, shpFile.name, '#ff8a65');
      } catch (err) {
        setLoadError(err.message);
        addLog(`✗ ${err.message}`, 'error');
      } finally {
        setIsLoading(false);
      }
      return;
    }

    addLog('✗ Format tidak dikenali. Gunakan .shp+.dbf, .geojson, .json, atau .zip', 'error');
  }, [addLog, addLayer]);

  // ─── Preset click ─────────────────────────────────────────────────────────
  const handlePreset = useCallback((preset) => {
    setActivePreset(preset.id);
    if (!preset.file) {
      addLog(`Preset "${preset.label}" belum ada file.`, 'warn');
      return;
    }
    if (preset.ext === 'shp') {
      loadShapefile(preset.file, preset.label, preset.color);
    } else {
      loadGeoJson(`/${preset.file}.${preset.ext}`, preset.label, preset.color);
    }
  }, [addLog, loadShapefile, loadGeoJson]);

  // ─── Manual load ──────────────────────────────────────────────────────────
  const handleManualLoad = () => {
    const val = manualUrl.trim();
    if (!val) return;
    if (loadMethod === 'shp') {
      const base = val.replace(/\.(shp|dbf|prj)$/i, '').replace(/^\//, '');
      loadShapefile(base, base, '#ff8a65');
    } else {
      const url = val.startsWith('/') ? val : '/' + val;
      loadGeoJson(url, val, '#4fc3f7');
    }
  };

  // ─── Layer management ─────────────────────────────────────────────────────
  const toggleLayerVisibility = (id) => {
    setLayers((prev) => prev.map((l) => l.id === id ? { ...l, visible: !l.visible } : l));
  };

  const removeLayer = (id) => {
    setLayers((prev) => prev.filter((l) => l.id !== id));
    if (activeLayerId === id) setActiveLayerId(null);
    addLog('Layer dihapus', 'info');
  };

  const fitLayerBounds = (layerId) => {
    const layer = layers.find((l) => l.id === layerId);
    if (layer) fitToBoundsData(layer.data);
  };

  const updateLayerColor = (id, color) => {
    setLayers((prev) => prev.map((l) => l.id === id ? { ...l, color } : l));
  };

  const clearAllLayers = () => {
    setLayers([]);
    setActiveLayerId(null);
    setFeatureInfo(null);
    addLog('Semua layer dihapus', 'info');
  };

  // ─── Tile layers ──────────────────────────────────────────────────────────
  const tiles = {
    osm:       { url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',               attr: '© OSM',  filter: 'brightness(0.6) saturate(0.4)' },
    topo:      { url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',                 attr: '© Topo', filter: 'brightness(0.65)' },
    satellite: { url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', attr: '© ESRI', filter: 'brightness(0.8)' },
    dark:      { url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',    attr: '© Carto', filter: 'none' },
  };

  useEffect(() => {
    let el = document.getElementById('tile-filter-test');
    if (!el) { el = document.createElement('style'); el.id = 'tile-filter-test'; document.head.appendChild(el); }
    el.textContent = `.leaflet-tile-pane { filter: ${tiles[mapStyle].filter}; transition: filter 0.3s; }`;
  }, [mapStyle]);

  // ─── Stats ────────────────────────────────────────────────────────────────
  const totalFeatures = layers.reduce((sum, l) => sum + (l.visible ? (l.data?.features?.length || 0) : 0), 0);
  const activeLayer   = layers.find((l) => l.id === activeLayerId);

  const modeTips = {
    geojson: 'Load .json atau .geojson dari folder /public',
    shp:     'Load Shapefile dari /public · butuh .shp + .dbf',
    upload:  'Drop file: .shp+.dbf bersamaan, .geojson, .json, atau .zip',
  };

  // ─── RENDER ───────────────────────────────────────────────────────────────
  return (
    <div style={s.root}>
      <style>{css}</style>

      {/* ── PANEL KIRI ── */}
      <aside style={s.panel}>

        {/* Header */}
        <div style={s.panelHeader}>
          <div style={s.headerRow}>
            <div style={s.headerIcon}>⬡</div>
            <div>
              <div style={s.headerTitle}>ShapeFile Tester</div>
              <div style={s.headerSub}>Leaflet · GeoJSON · SHP · Multi-Layer</div>
            </div>
          </div>
          {/* Panel tabs */}
          <div style={{ ...s.tabRow, marginTop: 14 }}>
            {[
              { id: 'load',   label: '📂 Load' },
              { id: 'layers', label: `🗂 Layers ${layers.length > 0 ? `(${layers.length})` : ''}` },
              { id: 'style',  label: '🎨 Style' },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setPanelTab(t.id)}
                style={{ ...s.tab, ...(panelTab === t.id ? s.tabActive : {}) }}
                className="t-tab"
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* ══════════ TAB: LOAD ══════════ */}
        {panelTab === 'load' && (
          <>
            {/* Mode Load */}
            <section style={s.section}>
              <label style={s.secLabel}>MODE LOAD</label>
              <div style={s.tabRow}>
                {[
                  { id: 'geojson', label: '📄 GeoJSON' },
                  { id: 'shp',     label: '📦 Shapefile' },
                  { id: 'upload',  label: '⬆ Upload' },
                ].map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setLoadMethod(m.id)}
                    style={{ ...s.tab, ...(loadMethod === m.id ? s.tabActive : {}) }}
                    className="t-tab"
                  >
                    {m.label}
                  </button>
                ))}
              </div>
              <div style={s.tipBox}>{modeTips[loadMethod]}</div>
            </section>

            {/* Preset + Manual URL */}
            {loadMethod !== 'upload' && (
              <section style={s.section}>
                <label style={s.secLabel}>PRESET FILE</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {PRESET_LAYERS.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => handlePreset(p)}
                      style={{
                        ...s.presetBtn,
                        ...(activePreset === p.id ? s.presetBtnActive : {}),
                        borderColor: activePreset === p.id ? p.color : 'rgba(255,255,255,0.08)',
                      }}
                      className="t-preset"
                    >
                      <span style={{ ...s.presetDot, background: p.color }} />
                      <div style={{ flex: 1, textAlign: 'left' }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>{p.label}</div>
                        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>
                          {p.file ? `/${p.file}.${p.ext}` : 'belum ada file — isi manual'}
                        </div>
                      </div>
                      <span style={{
                        ...s.extBadge,
                        background:  p.ext === 'shp' ? 'rgba(255,138,101,0.15)' : p.ext ? 'rgba(79,195,247,0.12)' : 'rgba(255,255,255,0.05)',
                        color:       p.ext === 'shp' ? '#ff8a65' : p.ext ? '#4fc3f7' : 'rgba(255,255,255,0.2)',
                        borderColor: p.ext === 'shp' ? 'rgba(255,138,101,0.3)' : p.ext ? 'rgba(79,195,247,0.25)' : 'rgba(255,255,255,0.08)',
                      }}>
                        {p.ext ? `.${p.ext}` : '–'}
                      </span>
                    </button>
                  ))}
                </div>

                <div style={{ marginTop: 14 }}>
                  <label style={{ ...s.secLabel, fontSize: 9 }}>
                    {loadMethod === 'shp' ? 'ATAU NAMA FILE (tanpa ekstensi)' : 'ATAU PATH FILE'}
                  </label>
                  <div style={s.inputRow}>
                    <input
                      value={manualUrl}
                      onChange={(e) => setManualUrl(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleManualLoad()}
                      placeholder={loadMethod === 'shp' ? 'Jabar_N24' : '/JABAR_NITROGEN.json'}
                      style={s.input}
                    />
                    <button onClick={handleManualLoad} style={s.loadBtn} className="t-load">Load</button>
                  </div>
                  <div style={s.inputHint}>
                    {loadMethod === 'shp'
                      ? '* Butuh NamaFile.shp + NamaFile.dbf di /public'
                      : '* File harus ada di /public'}
                  </div>
                </div>
              </section>
            )}

            {/* Upload Drop Zone */}
            {loadMethod === 'upload' && (
              <section style={s.section}>
                <label style={s.secLabel}>UPLOAD FILE</label>
                {/* TIP cara test */}
                <div style={{ ...s.tipBox, marginBottom: 10, lineHeight: 1.8 }}>
                  <strong style={{ color: '#ffe082' }}>💡 Cara test SHP:</strong><br />
                  Pilih <strong>.shp + .dbf</strong> bersamaan (Ctrl+klik)<br />
                  Atau zip semua file → upload <strong>.zip</strong>
                </div>
                <div
                  style={{ ...s.dropZone, ...(dragging ? s.dropZoneActive : {}) }}
                  onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={(e) => { e.preventDefault(); setDragging(false); handleFileUpload(e.dataTransfer.files); }}
                  onClick={() => fileInputRef.current?.click()}
                  className="t-drop"
                >
                  <span style={{ fontSize: 30 }}>📂</span>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', marginTop: 8 }}>Drop file di sini atau klik</span>
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', marginTop: 6, textAlign: 'center', lineHeight: 1.8 }}>
                    SHP: pilih <strong style={{ color: 'rgba(255,138,101,0.8)' }}>.shp + .dbf</strong> bersamaan<br />
                    ZIP: <strong style={{ color: 'rgba(255,206,100,0.8)' }}>.zip</strong> berisi shapefile<br />
                    GeoJSON: <strong style={{ color: 'rgba(79,195,247,0.8)' }}>.geojson / .json</strong>
                  </span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".shp,.dbf,.prj,.geojson,.json,.zip"
                    style={{ display: 'none' }}
                    onChange={(e) => handleFileUpload(e.target.files)}
                  />
                </div>
              </section>
            )}

            {/* Dev Log */}
            <div style={s.divider} />
            <section style={s.section}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <label style={{ ...s.secLabel, margin: 0 }}>DEV LOG</label>
                <button onClick={() => setLog([])} style={s.closeBtn}>clear</button>
              </div>
              <div style={s.logBox}>
                {log.length === 0 && (
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', padding: '2px 0' }}>Belum ada aktivitas...</div>
                )}
                {log.map((l) => (
                  <div key={l.id} style={{
                    ...s.logEntry,
                    color: l.type === 'error'   ? '#ef9a9a'
                         : l.type === 'success' ? '#a5d6a7'
                         : l.type === 'warn'    ? '#ffe082'
                         : 'rgba(255,255,255,0.45)',
                  }}>
                    <span style={s.logTs}>{l.ts}</span>{l.msg}
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

        {/* ══════════ TAB: LAYERS ══════════ */}
        {panelTab === 'layers' && (
          <>
            <section style={s.section}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <label style={{ ...s.secLabel, margin: 0 }}>LAYER STACK ({layers.length})</label>
                {layers.length > 0 && (
                  <button onClick={clearAllLayers} style={{ ...s.closeBtn, color: 'rgba(239,154,154,0.7)' }}>
                    hapus semua
                  </button>
                )}
              </div>

              {layers.length === 0 && (
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', textAlign: 'center', padding: '20px 0' }}>
                  Belum ada layer.<br />Pergi ke tab Load untuk menambahkan.
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[...layers].reverse().map((layer) => (
                  <div
                    key={layer.id}
                    style={{
                      ...s.layerCard,
                      borderColor: activeLayerId === layer.id ? layer.color : 'rgba(255,255,255,0.07)',
                      opacity: layer.visible ? 1 : 0.45,
                    }}
                    onClick={() => setActiveLayerId(layer.id)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {/* Color dot / picker */}
                      <label style={{ cursor: 'pointer', flexShrink: 0 }} title="Klik untuk ganti warna">
                        <span style={{ ...s.presetDot, background: layer.color, width: 12, height: 12, display: 'block' }} />
                        <input
                          type="color"
                          value={layer.color}
                          onChange={(e) => { e.stopPropagation(); updateLayerColor(layer.id, e.target.value); }}
                          style={{ display: 'none' }}
                        />
                      </label>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.8)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {layer.name}
                        </div>
                        <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>
                          {layer.data?.features?.length?.toLocaleString()} fitur
                          {!layer.visible && ' · tersembunyi'}
                        </div>
                      </div>
                    </div>
                    {/* Aksi */}
                    <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleLayerVisibility(layer.id); }}
                        style={{ ...s.layerActionBtn, color: layer.visible ? '#00e5ff' : 'rgba(255,255,255,0.25)' }}
                        title={layer.visible ? 'Sembunyikan' : 'Tampilkan'}
                      >
                        {layer.visible ? '👁' : '🙈'}
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); fitLayerBounds(layer.id); }}
                        style={s.layerActionBtn}
                        title="Zoom ke layer"
                      >
                        ⊡
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); removeLayer(layer.id); }}
                        style={{ ...s.layerActionBtn, color: 'rgba(239,154,154,0.6)' }}
                        title="Hapus layer"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Stat total */}
            {layers.length > 0 && (
              <>
                <div style={s.divider} />
                <section style={s.section}>
                  <label style={s.secLabel}>STATISTIK</label>
                  <div style={s.statsGrid}>
                    <div style={s.statCell}>
                      <div style={s.statVal}>{layers.length}</div>
                      <div style={s.statLbl}>Total Layer</div>
                    </div>
                    <div style={s.statCell}>
                      <div style={s.statVal}>{totalFeatures.toLocaleString()}</div>
                      <div style={s.statLbl}>Fitur Aktif</div>
                    </div>
                  </div>
                </section>
              </>
            )}

            {/* Feature Properties */}
            {featureInfo && (
              <>
                <div style={s.divider} />
                <section style={s.section}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <label style={{ ...s.secLabel, margin: 0 }}>PROPERTIES (klik fitur)</label>
                    <button onClick={() => setFeatureInfo(null)} style={s.closeBtn}>✕</button>
                  </div>
                  <div style={s.propsBox}>
                    {Object.entries(featureInfo).slice(0, 30).map(([k, v]) => (
                      <div key={k} style={s.propRow}>
                        <span style={s.propKey}>{k}</span>
                        <span style={s.propVal}>{String(v ?? '—')}</span>
                      </div>
                    ))}
                    {Object.keys(featureInfo).length > 30 && (
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', paddingTop: 6 }}>
                        +{Object.keys(featureInfo).length - 30} field lainnya
                      </div>
                    )}
                  </div>
                </section>
              </>
            )}
          </>
        )}

        {/* ══════════ TAB: STYLE ══════════ */}
        {panelTab === 'style' && (
          <>
            <section style={s.section}>
              <label style={s.secLabel}>MODE WARNA</label>
              <div style={s.tabRow}>
                {[
                  { id: 'gridcode', label: 'Gridcode' },
                  { id: 'single',   label: 'Single' },
                  { id: 'layer',    label: 'Per Layer' },
                  { id: 'random',   label: 'Random' },
                ].map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setColorMode(m.id)}
                    style={{ ...s.tab, ...(colorMode === m.id ? s.tabActive : {}), fontSize: 9 }}
                    className="t-tab"
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              {colorMode === 'gridcode' && (
                <div style={s.colorHint}>
                  Warna berdasar field <code style={s.code}>gridcode</code> (1–5)
                  <div style={{ display: 'flex', gap: 4, marginTop: 8, flexWrap: 'wrap' }}>
                    {Object.entries(LEVEL_COLORS).filter(([k]) => k !== 'default').map(([k, v]) => (
                      <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 9, color: 'rgba(255,255,255,0.5)' }}>
                        <span style={{ width: 10, height: 10, borderRadius: 2, background: v, display: 'inline-block' }} />
                        {k}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {colorMode === 'single' && (
                <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>Warna</span>
                  <input type="color" value={singleColor} onChange={(e) => setSingleColor(e.target.value)} style={s.colorPicker} />
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace' }}>{singleColor}</span>
                </div>
              )}
              {colorMode === 'layer' && (
                <div style={s.colorHint}>Setiap layer pakai warna masing-masing (atur di tab Layers)</div>
              )}
              {colorMode === 'random' && (
                <div style={s.colorHint}>Setiap fitur warna acak unik</div>
              )}
            </section>

            <div style={s.divider} />

            <section style={s.section}>
              <label style={s.secLabel}>OPACITY</label>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)' }}>Transparansi fill</span>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontFamily: 'monospace' }}>{opacity.toFixed(2)}</span>
              </div>
              <input type="range" min={0} max={1} step={0.01} value={opacity}
                onChange={(e) => setOpacity(parseFloat(e.target.value))} style={s.slider} />
            </section>

            <div style={s.divider} />

            <section style={s.section}>
              <label style={s.secLabel}>BORDER</label>
              <button
                onClick={() => setStrokeVisible(!strokeVisible)}
                style={{ ...s.toggleBtn, ...(strokeVisible ? s.toggleBtnOn : {}) }}
                className="t-toggle"
              >
                {strokeVisible ? '●' : '○'} &nbsp;Tampilkan border garis
              </button>
            </section>

            <div style={s.divider} />

            <section style={s.section}>
              <label style={s.secLabel}>BASEMAP</label>
              <div style={s.tabRow}>
                {[
                  { id: 'osm', label: '🗺', name: 'OSM' },
                  { id: 'topo', label: '⛰', name: 'Topo' },
                  { id: 'satellite', label: '🛰', name: 'Satelit' },
                  { id: 'dark', label: '🌑', name: 'Dark' },
                ].map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setMapStyle(m.id)}
                    style={{ ...s.tab, ...(mapStyle === m.id ? s.tabActive : {}), fontSize: 16, padding: '8px 4px' }}
                    className="t-tab"
                    title={m.name}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </section>
          </>
        )}

        <div style={s.footer}>ShapeFile Tester v2 · shpjs@6 · Leaflet · React</div>
      </aside>

      {/* ── MAP ── */}
      <main style={s.mapWrap}>
        <MapContainer
          center={[-6.9175, 107.6191]}
          zoom={9}
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
          preferCanvas
        >
          <TileLayer key={mapStyle} url={tiles[mapStyle].url} attribution={tiles[mapStyle].attr} />
          <MapController center={flyCenter} zoom={flyZoom} />

          {/* Render semua layer yang visible */}
          {layers.filter((l) => l.visible && !isLoading).map((layer) => (
            <GeoJSON
              key={`${layer.id}-${colorMode}-${singleColor}-${opacity}-${strokeVisible}-${layer.color}`}
              ref={(ref) => { if (ref) geoJsonRefs.current[layer.id] = ref; }}
              data={layer.data}
              style={(f, i) => styleFeature(f, layer.color, f?.properties?.FID ?? f?.properties?.OBJECTID ?? i)}
              onEachFeature={(f, l) => onEachFeature(f, l, layer.id)}
              renderer={CANVAS_RENDERER}
            />
          ))}
        </MapContainer>

        {/* Loading */}
        {isLoading && (
          <div style={s.overlay}>
            <div style={s.overlayCard}>
              <span style={s.spin} />
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>Memuat layer...</span>
            </div>
          </div>
        )}

        {/* Error */}
        {loadError && !isLoading && (
          <div style={s.overlay}>
            <div style={{ ...s.overlayCard, borderColor: 'rgba(239,154,154,0.35)', maxWidth: 460, flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 12, color: '#ef9a9a', lineHeight: 1.6 }}>✗ {loadError}</span>
              <button onClick={() => setLoadError(null)} style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', background: 'none', border: 'none', cursor: 'pointer', pointerEvents: 'auto' }}>
                tutup
              </button>
            </div>
          </div>
        )}

        {/* Top badge */}
        <div style={s.topBadge}>
          {layers.length > 0
            ? `${layers.length} layer · ${totalFeatures.toLocaleString()} fitur`
            : 'Belum ada layer — pilih preset atau load manual'}
        </div>

        {/* Zoom controls */}
        <div style={s.zoomBox}>
          <button className="t-zoom" style={s.zoomBtn} onClick={() => window.__testMapRef?.zoomIn()}>+</button>
          <button className="t-zoom" style={{ ...s.zoomBtn, borderTop: '1px solid rgba(255,255,255,0.08)' }} onClick={() => window.__testMapRef?.zoomOut()}>−</button>
        </div>

        {layers.length > 0 && (
          <button
            style={s.fitFloat}
            className="t-fitfloat"
            onClick={() => {
              const visible = layers.filter((l) => l.visible);
              if (visible.length > 0) fitToBoundsData(visible[visible.length - 1].data);
            }}
          >
            ⊡ Fit
          </button>
        )}
      </main>
    </div>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
const s = {
  root: {
    display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden',
    fontFamily: "'IBM Plex Mono','DM Mono',monospace",
    background: '#080c12',
  },
  panel: {
    width: 310, flexShrink: 0,
    background: '#0d1117',
    borderRight: '1px solid rgba(255,255,255,0.06)',
    display: 'flex', flexDirection: 'column',
    overflowY: 'auto', overflowX: 'hidden',
  },
  panelHeader: {
    padding: '20px 18px 16px',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    background: 'linear-gradient(135deg,#0d1117 0%,#131b27 100%)',
  },
  headerRow:  { display: 'flex', alignItems: 'center', gap: 12 },
  headerIcon: {
    width: 36, height: 36,
    background: 'rgba(0,229,255,0.12)', border: '1px solid rgba(0,229,255,0.25)',
    borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 18, color: '#00e5ff',
  },
  headerTitle: { fontSize: 15, fontWeight: 700, color: '#e0f7fa', letterSpacing: 0.5 },
  headerSub:   { fontSize: 9, color: 'rgba(255,255,255,0.25)', marginTop: 2, letterSpacing: 1 },
  section:     { padding: '14px 18px' },
  secLabel: {
    display: 'block', fontSize: 9, fontWeight: 700, letterSpacing: 2,
    color: 'rgba(255,255,255,0.25)', marginBottom: 10, textTransform: 'uppercase',
  },
  divider: { height: 1, background: 'rgba(255,255,255,0.04)', margin: '0 18px' },
  tipBox: {
    marginTop: 8, padding: '6px 10px',
    background: 'rgba(0,229,255,0.06)', border: '1px solid rgba(0,229,255,0.12)',
    borderRadius: 6, fontSize: 10, color: 'rgba(0,229,255,0.6)', lineHeight: 1.5,
  },
  tabRow: { display: 'flex', gap: 4 },
  tab: {
    flex: 1, padding: '7px 4px', fontSize: 10, fontWeight: 600,
    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 6, cursor: 'pointer', color: 'rgba(255,255,255,0.4)',
    transition: 'all 0.15s', letterSpacing: 0.3,
  },
  tabActive: {
    background: 'rgba(0,229,255,0.12)', border: '1px solid rgba(0,229,255,0.3)', color: '#00e5ff',
  },
  presetBtn: {
    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 8, cursor: 'pointer', transition: 'all 0.15s', width: '100%',
  },
  presetBtnActive: { background: 'rgba(0,229,255,0.07)' },
  presetDot:       { width: 8, height: 8, borderRadius: '50%', flexShrink: 0 },
  extBadge: {
    fontSize: 9, padding: '2px 6px', border: '1px solid',
    borderRadius: 8, fontWeight: 700, flexShrink: 0,
  },
  inputRow:  { display: 'flex', gap: 6 },
  input: {
    flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 6, padding: '8px 10px', color: '#fff', fontSize: 11, outline: 'none',
    fontFamily: "'IBM Plex Mono',monospace", transition: 'border-color 0.15s',
  },
  inputHint: { marginTop: 5, fontSize: 9, color: 'rgba(255,255,255,0.2)', lineHeight: 1.5 },
  loadBtn: {
    padding: '8px 14px', background: 'rgba(0,229,255,0.15)', border: '1px solid rgba(0,229,255,0.3)',
    borderRadius: 6, cursor: 'pointer', color: '#00e5ff', fontSize: 11, fontWeight: 700,
    transition: 'all 0.15s', whiteSpace: 'nowrap',
  },
  dropZone: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    padding: '28px 16px', borderRadius: 10, cursor: 'pointer',
    border: '2px dashed rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.02)',
    transition: 'all 0.2s',
  },
  dropZoneActive: { border: '2px dashed rgba(0,229,255,0.5)', background: 'rgba(0,229,255,0.05)' },
  colorPicker:    { width: 32, height: 28, border: 'none', background: 'none', cursor: 'pointer', borderRadius: 4 },
  colorHint:      { marginTop: 8, fontSize: 10, color: 'rgba(255,255,255,0.25)', lineHeight: 1.6 },
  code: {
    background: 'rgba(0,229,255,0.1)', padding: '1px 5px',
    borderRadius: 3, color: '#00e5ff', fontFamily: 'monospace', fontSize: 9,
  },
  slider:    { width: '100%', accentColor: '#00e5ff' },
  toggleBtn: {
    fontSize: 11, padding: '7px 14px', background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, cursor: 'pointer',
    color: 'rgba(255,255,255,0.4)', transition: 'all 0.15s', width: '100%',
  },
  toggleBtnOn: { background: 'rgba(0,229,255,0.12)', border: '1px solid rgba(0,229,255,0.3)', color: '#00e5ff' },

  // Layer card
  layerCard: {
    padding: '10px 12px', borderRadius: 8, border: '1px solid',
    background: 'rgba(255,255,255,0.02)', cursor: 'pointer', transition: 'all 0.15s',
  },
  layerActionBtn: {
    flex: 1, padding: '5px', background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.07)', borderRadius: 5, cursor: 'pointer',
    color: 'rgba(255,255,255,0.4)', fontSize: 12, transition: 'all 0.15s',
  },

  // Stats
  statsGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 10 },
  statCell:  { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: '10px' },
  statVal:   { fontSize: 16, fontWeight: 700, color: '#00e5ff', marginBottom: 3 },
  statLbl:   { fontSize: 9, color: 'rgba(255,255,255,0.25)', letterSpacing: 1 },

  closeBtn: { background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.25)', fontSize: 11, padding: '2px 6px' },
  propsBox: {
    background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 8, padding: '8px 10px', maxHeight: 220, overflowY: 'auto',
  },
  propRow: { display: 'flex', gap: 8, padding: '3px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: 10 },
  propKey: { color: 'rgba(0,229,255,0.6)', flexShrink: 0, minWidth: 80, wordBreak: 'break-all' },
  propVal: { color: 'rgba(255,255,255,0.6)', wordBreak: 'break-all' },
  logBox: {
    background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.05)',
    borderRadius: 8, padding: '8px 10px', maxHeight: 180, overflowY: 'auto',
    fontSize: 10, lineHeight: 1.8,
  },
  logEntry: { display: 'block', wordBreak: 'break-all' },
  logTs:    { color: 'rgba(255,255,255,0.18)', marginRight: 6 },
  footer:   { padding: '12px 18px', fontSize: 9, color: 'rgba(255,255,255,0.12)', borderTop: '1px solid rgba(255,255,255,0.04)', letterSpacing: 1, marginTop: 'auto' },

  // MAP
  mapWrap:  { flex: 1, position: 'relative', overflow: 'hidden' },
  overlay: {
    position: 'absolute', bottom: 80, left: '50%', transform: 'translateX(-50%)',
    zIndex: 999, pointerEvents: 'none', width: 'max-content', maxWidth: '80vw',
  },
  overlayCard: {
    background: 'rgba(8,12,18,0.95)', backdropFilter: 'blur(12px)',
    border: '1px solid rgba(255,255,255,0.1)', borderRadius: 24, padding: '10px 22px',
    display: 'flex', alignItems: 'center', gap: 10,
    boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
  },
  spin: {
    width: 14, height: 14, flexShrink: 0,
    border: '2px solid rgba(0,229,255,0.3)', borderTop: '2px solid #00e5ff',
    borderRadius: '50%', display: 'inline-block', animation: 'tspin 0.8s linear infinite',
  },
  topBadge: {
    position: 'absolute', top: 14, left: '50%', transform: 'translateX(-50%)', zIndex: 999,
    background: 'rgba(8,12,18,0.88)', backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: '7px 20px',
    fontSize: 11, color: 'rgba(255,255,255,0.65)', fontFamily: "'IBM Plex Mono',monospace",
    whiteSpace: 'nowrap', maxWidth: '70vw', overflow: 'hidden', textOverflow: 'ellipsis',
    boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
  },
  zoomBox: {
    position: 'absolute', bottom: 30, right: 18, zIndex: 999,
    display: 'flex', flexDirection: 'column', borderRadius: 8, overflow: 'hidden',
    border: '1px solid rgba(255,255,255,0.09)', boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
  },
  zoomBtn: {
    width: 38, height: 38, background: 'rgba(8,12,18,0.9)', backdropFilter: 'blur(8px)',
    border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.6)', fontSize: 20,
    display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.15s',
  },
  fitFloat: {
    position: 'absolute', bottom: 30, right: 68, zIndex: 999, padding: '8px 14px',
    background: 'rgba(8,12,18,0.9)', backdropFilter: 'blur(8px)',
    border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, cursor: 'pointer',
    color: 'rgba(255,255,255,0.6)', fontSize: 11, fontFamily: "'IBM Plex Mono',monospace",
    transition: 'all 0.15s',
  },
};

const css = `
  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;700&display=swap');
  html,body,#root{margin:0;padding:0;width:100%;height:100%;overflow:hidden;}
  *{box-sizing:border-box;}
  ::-webkit-scrollbar{width:3px;}
  ::-webkit-scrollbar-thumb{background:rgba(0,229,255,0.15);border-radius:2px;}
  .t-tab:hover    {background:rgba(0,229,255,0.08)!important;color:rgba(255,255,255,0.8)!important;}
  .t-preset:hover {background:rgba(0,229,255,0.06)!important;border-color:rgba(0,229,255,0.2)!important;}
  .t-load:hover   {background:rgba(0,229,255,0.28)!important;}
  .t-drop:hover   {border-color:rgba(0,229,255,0.35)!important;background:rgba(0,229,255,0.04)!important;}
  .t-fit:hover    {background:rgba(0,229,255,0.08)!important;color:#00e5ff!important;}
  .t-fitfloat:hover{background:rgba(0,229,255,0.12)!important;color:#00e5ff!important;}
  .t-toggle:hover {background:rgba(255,255,255,0.08)!important;}
  .t-zoom:hover   {background:rgba(0,229,255,0.15)!important;color:#00e5ff!important;}
  .leaflet-control-zoom{display:none!important;}
  .leaflet-popup-content-wrapper{
    background:rgba(8,12,18,0.96)!important;backdrop-filter:blur(16px)!important;
    border:1px solid rgba(255,255,255,0.1)!important;border-radius:10px!important;
    color:#fff!important;padding:0!important;font-family:'IBM Plex Mono',monospace!important;
  }
  .leaflet-popup-content{margin:12px 14px!important;color:#fff!important;}
  .leaflet-popup-tip{background:rgba(8,12,18,0.96)!important;}
  .leaflet-popup-close-button{color:rgba(255,255,255,0.4)!important;}
  @keyframes tspin{to{transform:rotate(360deg);}}
`;