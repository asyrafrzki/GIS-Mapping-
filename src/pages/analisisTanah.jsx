import React, { useEffect, useMemo, useState } from 'react';
import { apiRequest } from '../services/api';
import { MapContainer, TileLayer, Marker, Circle, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const colors = {
  bg: '#06140d',
  bg2: '#071b11',
  sidebar: '#071c12',
  panel: '#0b2417',
  panel2: '#0f2d1d',
  panel3: '#113522',
  line: 'rgba(148, 212, 157, 0.14)',
  lineStrong: 'rgba(148, 212, 157, 0.28)',
  text: '#E3FED3',
  muted: 'rgba(227,254,211,0.58)',
  soft: '#E3FED3',
  pastel: '#94D49D',
  medium: '#46AB68',
  dark: '#028739',
  danger: '#ef4444',
};

const EMPTY_FORM = {
  pointId: '',
  pointName: '',
  lokasi: '',
  daerah: '',
  radius: '',
  lat: '',
  lng: '',
  n: '',
  p: '',
  k: '',
  mg: '',
  nSource: '',
  pSource: '',
  kSource: '',
  mgSource: '',
  umur: '',
  luas: '',
  protas: '',
  jumlahPohon: '',
};

export default function AnalisisTanah({ token, onNavigate }) {
  const [points, setPoints] = useState([]);
  const [history, setHistory] = useState([]);
  const [result, setResult] = useState(null);
  const [selectedHistoryId, setSelectedHistoryId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const loadPoints = async () => {
    try {
      const data = await apiRequest('/analisis-tanah/points', { token });
      setPoints(data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadHistory = async () => {
    try {
      const data = await apiRequest('/analisis-tanah/history', { token });
      setHistory(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadPoints();
    loadHistory();
  }, [token]);

  const buildRecommendationsFromHistory = () => [
    'Hasil ini berasal dari analisis yang sudah tersimpan.',
    'Lakukan evaluasi ulang setelah aplikasi II untuk memastikan respon tanaman.',
  ];

  const buildResultFromHistory = (row) => ({
    summary: {
      aplikasi1_total: Number(row.aplikasi1_total),
      aplikasi2_total: Number(row.aplikasi2_total),
      total_rekomendasi: Number(row.total_rekomendasi),
    },
    aplikasi1: {
      urea: Number(row.urea_app1),
      tsp: Number(row.tsp_app1),
      kcl: Number(row.kcl_app1),
      dolomit: Number(row.dolomit_app1),
      total: Number(row.aplikasi1_total),
    },
    aplikasi2: {
      urea: Number(row.urea_app2),
      tsp: Number(row.tsp_app2),
      kcl: Number(row.kcl_app2),
      dolomit: Number(row.dolomit_app2),
      total: Number(row.aplikasi2_total),
    },
    recommendations: buildRecommendationsFromHistory(),
  });

  const handleSelectPoint = async (pointId) => {
    if (!pointId) {
      setForm(EMPTY_FORM);
      setResult(null);
      setSelectedHistoryId(null);
      return;
    }

    try {
      const data = await apiRequest(`/analisis-tanah/point/${pointId}/context`, { token });

      setForm((prev) => ({
        ...prev,
        pointId: String(data.point.id),
        pointName: data.point.nama || '',
        lokasi: data.point.lokasi || '',
        daerah: data.point.daerah || '',
        radius: data.point.radius || '',
        lat: data.point.lat || '',
        lng: data.point.lng || '',
        n: data.nutrients.n,
        p: data.nutrients.p,
        k: data.nutrients.k,
        mg: data.nutrients.mg,
        nSource: data.nutrients.sources.n,
        pSource: data.nutrients.sources.p,
        kSource: data.nutrients.sources.k,
        mgSource: data.nutrients.sources.mg,
        umur: data.latestAnalysis?.umur ?? '',
        luas: data.latestAnalysis?.luas ?? '',
        protas: data.latestAnalysis?.protas ?? '',
        jumlahPohon: data.latestAnalysis?.jumlah_pohon ?? '',
      }));

      if (data.latestAnalysis) {
        setResult(buildResultFromHistory(data.latestAnalysis));
        setSelectedHistoryId(data.latestAnalysis.id);
      } else {
        setResult(null);
        setSelectedHistoryId(null);
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const hitung = async () => {
    try {
      const data = await apiRequest('/analisis-tanah/calculate', {
        method: 'POST',
        token,
        body: {
          umur: Number(form.umur),
          luas: Number(form.luas),
          protas: Number(form.protas),
          jumlahPohon: Number(form.jumlahPohon),
          n: Number(form.n),
          p: Number(form.p),
          k: Number(form.k),
          mg: Number(form.mg),
        },
      });

      setResult(data);
      setSelectedHistoryId(null);
    } catch (err) {
      alert(err.message);
    }
  };

  const simpan = async () => {
    try {
      const data = await apiRequest('/analisis-tanah/save', {
        method: 'POST',
        token,
        body: {
          pointId: Number(form.pointId),
          umur: Number(form.umur),
          luas: Number(form.luas),
          protas: Number(form.protas),
          jumlahPohon: Number(form.jumlahPohon),
        },
      });

      setResult(data.result);
      await loadHistory();
      setSelectedHistoryId(data.data.id);
      alert('Analisis berhasil disimpan.');
    } catch (err) {
      alert(err.message);
    }
  };

  const showHistoryDetail = (item) => {
    setSelectedHistoryId(item.id);

    setForm((prev) => ({
      ...prev,
      pointId: item.point_id ? String(item.point_id) : '',
      pointName: item.point_name || '',
      lokasi: item.lokasi || '',
      daerah: item.daerah || '',
      radius: item.radius || '',
      lat: item.lat || '',
      lng: item.lng || '',
      n: item.n ?? '',
      p: item.p ?? '',
      k: item.k ?? '',
      mg: item.mg ?? '',
      nSource: item.n_source || '',
      pSource: item.p_source || '',
      kSource: item.k_source || '',
      mgSource: item.mg_source || '',
      umur: item.umur ?? '',
      luas: item.luas ?? '',
      protas: item.protas ?? '',
      jumlahPohon: item.jumlah_pohon ?? '',
    }));

    setResult(buildResultFromHistory(item));
  };

  const filteredHistory = useMemo(() => {
    return form.pointId
      ? history.filter((item) => String(item.point_id) === String(form.pointId))
      : [];
  }, [history, form.pointId]);

  const formatSourceLabel = (source) => {
    if (source === 'geojson-gridcode') return 'GeoJSON Grid';
    if (source === 'geojson') return 'GeoJSON';
    if (source === 'default') return 'Default';
    return source || '-';
  };

  const sourceTone = (source) => {
    if (source === 'geojson' || source === 'geojson-gridcode') return s.sourceGeo;
    return s.sourceDefault;
  };

  const totalPupuk = (a, b) => {
    return (Number(a) + Number(b)).toFixed(2).replace(/\.00$/, '');
  };

  const formatDate = (value) => {
    if (!value) return '-';

    return new Date(value).toLocaleString('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const mapLat = Number(form.lat);
  const mapLng = Number(form.lng);
  const mapRadius = Number(form.radius) || 0;
  const hasMap = !Number.isNaN(mapLat) && !Number.isNaN(mapLng) && mapLat && mapLng;

  return (
    <div style={s.shell}>
      <style>{css}</style>

      <aside style={s.sidebar}>
        <div>
          <div style={s.logoBox}>
            <img src="/ppks.png" alt="PPKS" style={s.logo} />
            <div>
              <div style={s.logoText}>SoilMap</div>
              <div style={s.logoSub}>Nutrient System</div>
            </div>
          </div>

          <nav style={s.nav}>
            <button style={s.navItem} onClick={() => onNavigate('user-dashboard')}>
              <span>▦</span>
              Dashboard
            </button>

            <button style={s.navItem} onClick={() => onNavigate('map')}>
              <span>◫</span>
              Map
            </button>

            <button style={s.navItem} onClick={() => onNavigate('digitasi')}>
              <span>◇</span>
              Digitization
            </button>

            <button style={s.navItem} onClick={() => onNavigate('laporan')}>
              <span>▣</span>
              Reports
            </button>

            <button style={{ ...s.navItem, ...s.navItemActive }}>
              <span>⚗</span>
              Soil Analysis
            </button>
          </nav>
        </div>

        <div style={s.sidebarBottom}>
          <button style={s.newBtn} onClick={() => onNavigate('digitasi')}>
            New Field Report
          </button>

          <button style={s.sideSmallBtn} onClick={() => onNavigate('user-dashboard')}>
            ← Back Dashboard
          </button>
        </div>
      </aside>

      <main style={s.main}>
        <div style={s.searchRow}>
          <input style={s.searchInput} placeholder="Search parameters..." />

          <select
            style={s.topSelect}
            value={form.pointId}
            onChange={(e) => handleSelectPoint(e.target.value)}
          >
            <option value="">Pilih Titik/Lahan</option>
            {points.map((point) => (
              <option key={point.id} value={point.id}>
                {point.nama} - {point.lokasi || '-'} - {point.daerah || '-'}
              </option>
            ))}
          </select>
        </div>

        <header style={s.header}>
          <div>
            <div style={s.eyebrow}>SOIL ANALYSIS REPORT</div>
            <h1 style={s.title}>Analisis Kandungan Tanah</h1>
            <p style={s.subtitle}>
              Real-time nutrient concentration monitoring, spatial tracking, and fertilizer
              recommendation history.
            </p>
          </div>

          <button style={s.backBtn} onClick={() => onNavigate('user-dashboard')}>
            ← Dashboard User
          </button>
        </header>

        <section style={s.layout}>
          <div style={s.left}>
            <section style={s.panel}>
              <div style={s.panelHeader}>
                <div>
                  <div style={s.panelTag}>KANDUNGAN DAUN (%)</div>
                  <h3 style={s.panelTitle}>Nutrient Concentration</h3>
                </div>

                <div style={s.updateText}>
                  Last update: {new Date().toLocaleDateString('id-ID')}
                </div>
              </div>

              <div style={s.nutrientGrid}>
                <NutrientBlock
                  name="Nitrogen (N)"
                  value={form.n || '-'}
                  source={formatSourceLabel(form.nSource)}
                  sourceStyle={sourceTone(form.nSource)}
                />

                <NutrientBlock
                  name="Phosphor (P)"
                  value={form.p || '-'}
                  source={formatSourceLabel(form.pSource)}
                  sourceStyle={sourceTone(form.pSource)}
                />

                <NutrientBlock
                  name="Kalium (K)"
                  value={form.k || '-'}
                  source={formatSourceLabel(form.kSource)}
                  sourceStyle={sourceTone(form.kSource)}
                />

                <NutrientBlock
                  name="Magnesium (Mg)"
                  value={form.mg || '-'}
                  source={formatSourceLabel(form.mgSource)}
                  sourceStyle={sourceTone(form.mgSource)}
                />
              </div>
            </section>

            <section style={s.panel}>
              <div style={s.panelHeader}>
                <div>
                  <div style={s.panelTag}>SPATIAL DISTRIBUTION MAP</div>
                  <h3 style={s.panelTitle}>Lokasi Titik Lahan</h3>
                </div>

                {hasMap && (
                  <div style={s.updateText}>
                    Radius {mapRadius || 0} m
                  </div>
                )}
              </div>

              {!hasMap ? (
                <div style={s.emptyMap}>
                  <div style={s.emptyIcon}>▧</div>
                  <div style={s.emptyTitle}>No Active Location</div>
                  <div style={s.emptyText}>
                    Pilih titik/lahan terlebih dahulu untuk menampilkan lokasi pada peta.
                  </div>
                </div>
              ) : (
                <div style={s.mapWrap}>
                  <MapContainer
                    center={[mapLat, mapLng]}
                    zoom={15}
                    scrollWheelZoom={false}
                    style={{ height: 300, width: '100%' }}
                  >
                    <TileLayer
                      attribution="&copy; OpenStreetMap"
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />

                    <Marker position={[mapLat, mapLng]}>
                      <Popup>
                        <strong>{form.pointName}</strong>
                        <br />
                        {form.lokasi} - {form.daerah}
                      </Popup>
                    </Marker>

                    {mapRadius > 0 && (
                      <Circle
                        center={[mapLat, mapLng]}
                        radius={mapRadius}
                        pathOptions={{
                          color: colors.medium,
                          fillColor: colors.medium,
                          fillOpacity: 0.16,
                        }}
                      />
                    )}
                  </MapContainer>

                  <div style={s.coordBadge}>
                    LAT: {mapLat.toFixed(5)} | LONG: {mapLng.toFixed(5)}
                  </div>
                </div>
              )}
            </section>

            <section style={s.panel}>
              <div style={s.panelHeader}>
                <div>
                  <div style={s.panelTag}>INPUT PARAMETER</div>
                  <h3 style={s.panelTitle}>Production Parameters</h3>
                </div>
              </div>

              <div style={s.inputGrid}>
                <InputField
                  label="Umur"
                  value={form.umur}
                  onChange={(value) => setForm({ ...form, umur: value })}
                />

                <InputField
                  label="Luas"
                  value={form.luas}
                  onChange={(value) => setForm({ ...form, luas: value })}
                />

                <InputField
                  label="Protas"
                  value={form.protas}
                  onChange={(value) => setForm({ ...form, protas: value })}
                />

                <InputField
                  label="Jumlah Pohon"
                  value={form.jumlahPohon}
                  onChange={(value) => setForm({ ...form, jumlahPohon: value })}
                />
              </div>

              <div style={s.actions}>
                <button style={s.outlineAction} onClick={hitung}>
                  Calculate
                </button>

                <button style={s.primaryAction} onClick={simpan}>
                  Calculate & Save
                </button>
              </div>
            </section>
          </div>

          <div style={s.right}>
            <section style={s.panel}>
              <div style={s.panelHeader}>
                <div>
                  <div style={s.panelTag}>ANALYSIS SUMMARY</div>
                  <h3 style={s.panelTitleSmall}>Result Overview</h3>
                </div>

                {selectedHistoryId && <span style={s.savedChip}>Saved</span>}
              </div>

              {!result ? (
                <EmptyState
                  title="No Active Analysis"
                  text="Run a new field test or select a saved analysis to generate fertilizer summary."
                />
              ) : (
                <>
                  <div style={s.resultGrid}>
                    <ResultCard label="App I" value={result.summary.aplikasi1_total} />
                    <ResultCard label="App II" value={result.summary.aplikasi2_total} />
                    <ResultCard label="Total" value={result.summary.total_rekomendasi} />
                  </div>

                  <div style={s.tableBox}>
                    <table style={s.table}>
                      <thead>
                        <tr>
                          <th>Pupuk</th>
                          <th>I</th>
                          <th>II</th>
                          <th>Total</th>
                        </tr>
                      </thead>

                      <tbody>
                        <tr>
                          <td>Urea</td>
                          <td>{result.aplikasi1.urea}</td>
                          <td>{result.aplikasi2.urea}</td>
                          <td>{totalPupuk(result.aplikasi1.urea, result.aplikasi2.urea)}</td>
                        </tr>

                        <tr>
                          <td>TSP</td>
                          <td>{result.aplikasi1.tsp}</td>
                          <td>{result.aplikasi2.tsp}</td>
                          <td>{totalPupuk(result.aplikasi1.tsp, result.aplikasi2.tsp)}</td>
                        </tr>

                        <tr>
                          <td>KCl</td>
                          <td>{result.aplikasi1.kcl}</td>
                          <td>{result.aplikasi2.kcl}</td>
                          <td>{totalPupuk(result.aplikasi1.kcl, result.aplikasi2.kcl)}</td>
                        </tr>

                        <tr>
                          <td>Dolomit</td>
                          <td>{result.aplikasi1.dolomit}</td>
                          <td>{result.aplikasi2.dolomit}</td>
                          <td>
                            {totalPupuk(result.aplikasi1.dolomit, result.aplikasi2.dolomit)}
                          </td>
                        </tr>

                        <tr style={s.totalRow}>
                          <td>Total</td>
                          <td>{result.summary.aplikasi1_total}</td>
                          <td>{result.summary.aplikasi2_total}</td>
                          <td>{result.summary.total_rekomendasi}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div style={s.recommendBox}>
                    <div style={s.panelTag}>RECOMMENDATION</div>

                    {result.recommendations?.length ? (
                      result.recommendations.map((item, index) => (
                        <div key={index} style={s.recommendItem}>
                          <span>{index + 1}</span>
                          <p>{item}</p>
                        </div>
                      ))
                    ) : (
                      <div style={s.emptyText}>Belum ada rekomendasi.</div>
                    )}
                  </div>
                </>
              )}
            </section>

            <section style={s.panel}>
              <div style={s.panelHeader}>
                <div>
                  <div style={s.panelTag}>ANALYSIS HISTORY</div>
                  <h3 style={s.panelTitleSmall}>Tracking Record</h3>
                </div>
              </div>

              {!form.pointId ? (
                <EmptyState
                  title="Records Empty"
                  text="Select field point to show analysis history."
                  compact
                />
              ) : filteredHistory.length === 0 ? (
                <EmptyState
                  title="Records Empty"
                  text="No history for selected field point."
                  compact
                />
              ) : (
                <div style={s.historyList}>
                  {filteredHistory.map((item) => (
                    <div
                      key={item.id}
                      style={{
                        ...s.historyCard,
                        ...(selectedHistoryId === item.id ? s.historyActive : {}),
                      }}
                    >
                      <div style={s.historyTop}>
                        <div>
                          <div style={s.historyName}>{item.point_name || 'Tanpa titik'}</div>
                          <div style={s.historyMeta}>{formatDate(item.created_at)}</div>
                        </div>

                        <button style={s.detailBtn} onClick={() => showHistoryDetail(item)}>
                          Detail
                        </button>
                      </div>

                      <div style={s.historyValue}>
                        App I: {item.aplikasi1_total} | App II: {item.aplikasi2_total} | Total:{' '}
                        {item.total_rekomendasi}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </section>
      </main>
    </div>
  );
}

function InputField({ label, value, onChange }) {
  return (
    <label style={s.formGroup}>
      <span>{label}</span>
      <input style={s.input} value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

function NutrientBlock({ name, value, source, sourceStyle }) {
  return (
    <div style={s.nutrientCard}>
      <div style={s.nutrientName}>{name}</div>

      <div style={s.nutrientValue}>
        {value}
        {value !== '-' && <span>%</span>}
      </div>

      <div style={{ ...s.sourcePill, ...sourceStyle }}>{source}</div>
    </div>
  );
}

function ResultCard({ label, value }) {
  return (
    <div style={s.resultCard}>
      <div style={s.resultLabel}>{label}</div>
      <div style={s.resultValue}>{value}</div>
    </div>
  );
}

function EmptyState({ title, text, compact }) {
  return (
    <div style={compact ? s.emptyCompact : s.emptyState}>
      <div style={s.emptyIcon}>▧</div>
      <div style={s.emptyTitle}>{title}</div>
      <div style={s.emptyText}>{text}</div>
    </div>
  );
}

const s = {
  shell: {
    minHeight: '100vh',
    display: 'grid',
    gridTemplateColumns: '250px 1fr',
    background: colors.bg,
    color: colors.text,
    fontFamily: 'Inter, system-ui, sans-serif',
  },

  sidebar: {
    background: colors.sidebar,
    borderRight: `1px solid ${colors.line}`,
    padding: 22,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    minHeight: '100vh',
  },

  logoBox: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginBottom: 34,
  },

  logo: {
    width: 42,
    height: 42,
    borderRadius: 999,
    background: '#fff',
    padding: 4,
  },

  logoText: {
    fontWeight: 900,
    color: colors.soft,
  },

  logoSub: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 2,
  },

  nav: {
    display: 'grid',
    gap: 8,
  },

  navItem: {
    width: '100%',
    display: 'flex',
    gap: 12,
    alignItems: 'center',
    border: 'none',
    background: 'transparent',
    color: colors.muted,
    padding: '13px 12px',
    textAlign: 'left',
    cursor: 'pointer',
    fontWeight: 800,
    textTransform: 'uppercase',
    fontSize: 12,
    letterSpacing: 0.7,
  },

  navItemActive: {
    background: 'rgba(70,171,104,0.14)',
    color: colors.soft,
    borderRight: `4px solid ${colors.medium}`,
  },

  sidebarBottom: {
    display: 'grid',
    gap: 14,
  },

  newBtn: {
    border: 'none',
    background: colors.medium,
    color: '#04140c',
    padding: '13px 14px',
    fontWeight: 900,
    cursor: 'pointer',
    textTransform: 'uppercase',
    fontSize: 12,
    letterSpacing: 0.7,
  },

  sideSmallBtn: {
    border: 'none',
    background: 'transparent',
    color: colors.muted,
    textAlign: 'left',
    cursor: 'pointer',
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },

  main: {
    padding: '18px 24px',
    background: `linear-gradient(180deg, ${colors.bg2}, #06130d)`,
    minWidth: 0,
  },

  searchRow: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 14,
    marginBottom: 26,
  },

  searchInput: {
    width: 270,
    maxWidth: '100%',
    background: '#07170f',
    border: `1px solid ${colors.line}`,
    color: colors.soft,
    padding: '10px 13px',
    outline: 'none',
    fontSize: 12,
  },

  topSelect: {
    width: 340,
    maxWidth: '100%',
    background: colors.panel,
    border: `1px solid ${colors.line}`,
    color: colors.soft,
    padding: '10px 12px',
    fontWeight: 900,
    textTransform: 'uppercase',
    outline: 'none',
  },

  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 16,
    marginBottom: 22,
  },

  eyebrow: {
    color: colors.medium,
    fontWeight: 900,
    fontSize: 12,
    letterSpacing: 1.2,
    marginBottom: 6,
    textTransform: 'uppercase',
  },

  title: {
    margin: 0,
    color: colors.soft,
    fontSize: 32,
    letterSpacing: '-0.8px',
  },

  subtitle: {
    color: colors.muted,
    marginTop: 6,
    lineHeight: 1.6,
    maxWidth: 650,
  },

  backBtn: {
    height: 40,
    border: `1px solid ${colors.line}`,
    background: 'transparent',
    color: colors.soft,
    cursor: 'pointer',
    padding: '0 12px',
    fontWeight: 900,
  },

  layout: {
    display: 'grid',
    gridTemplateColumns: '1fr 380px',
    gap: 18,
    alignItems: 'start',
  },

  left: {
    display: 'grid',
    gap: 18,
  },

  right: {
    display: 'grid',
    gap: 18,
    alignContent: 'start',
  },

  panel: {
    background: colors.panel,
    border: `1px solid ${colors.line}`,
    padding: 18,
  },

  panelHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 16,
  },

  panelTag: {
    color: colors.medium,
    fontSize: 11,
    fontWeight: 900,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 5,
  },

  panelTitle: {
    margin: 0,
    color: colors.soft,
    fontSize: 20,
  },

  panelTitleSmall: {
    margin: 0,
    color: colors.soft,
    fontSize: 16,
  },

  updateText: {
    color: 'rgba(227,254,211,.32)',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  nutrientGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
    gap: 14,
  },

  nutrientCard: {
    background: colors.panel2,
    border: `1px solid ${colors.line}`,
    padding: 16,
    minHeight: 128,
  },

  nutrientName: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: 900,
  },

  nutrientValue: {
    marginTop: 16,
    fontSize: 34,
    lineHeight: 1,
    fontWeight: 900,
    color: '#fff',
  },

  sourcePill: {
    display: 'inline-block',
    marginTop: 12,
    padding: '5px 8px',
    fontSize: 10,
    fontWeight: 900,
    textTransform: 'uppercase',
  },

  sourceGeo: {
    background: 'rgba(70,171,104,0.14)',
    color: colors.pastel,
    border: `1px solid ${colors.line}`,
  },

  sourceDefault: {
    background: 'rgba(227,254,211,0.06)',
    color: colors.muted,
    border: `1px solid ${colors.line}`,
  },

  mapWrap: {
    position: 'relative',
    overflow: 'hidden',
    border: `1px solid ${colors.line}`,
    filter: 'saturate(.65) brightness(.86)',
  },

  coordBadge: {
    position: 'absolute',
    left: 14,
    bottom: 14,
    background: colors.panel,
    color: colors.medium,
    padding: '8px 10px',
    fontWeight: 900,
    fontSize: 11,
    zIndex: 500,
  },

  emptyMap: {
    border: `1px dashed ${colors.line}`,
    padding: 34,
    color: colors.muted,
    textAlign: 'center',
    minHeight: 230,
    display: 'grid',
    placeItems: 'center',
  },

  inputGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
    gap: 14,
    marginTop: 14,
  },

  formGroup: {
    display: 'grid',
    gap: 7,
    color: colors.muted,
    fontSize: 12,
    fontWeight: 900,
  },

  input: {
    background: colors.panel2,
    border: `1px solid ${colors.line}`,
    color: colors.soft,
    padding: '12px 13px',
    outline: 'none',
  },

  actions: {
    display: 'flex',
    gap: 12,
    marginTop: 16,
    flexWrap: 'wrap',
  },

  outlineAction: {
    border: `1px solid ${colors.line}`,
    background: 'transparent',
    color: colors.soft,
    padding: '12px 14px',
    cursor: 'pointer',
    fontWeight: 900,
  },

  primaryAction: {
    border: 'none',
    background: colors.medium,
    color: '#04140c',
    padding: '12px 14px',
    cursor: 'pointer',
    fontWeight: 900,
  },

  savedChip: {
    color: colors.pastel,
    border: `1px solid ${colors.line}`,
    padding: '6px 9px',
    fontSize: 11,
    fontWeight: 900,
  },

  resultGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 10,
    marginBottom: 14,
  },

  resultCard: {
    background: colors.panel2,
    border: `1px solid ${colors.line}`,
    padding: 12,
  },

  resultLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: 900,
    textTransform: 'uppercase',
  },

  resultValue: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 900,
    marginTop: 8,
  },

  tableBox: {
    overflowX: 'auto',
    border: `1px solid ${colors.line}`,
  },

  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },

  totalRow: {
    background: 'rgba(70,171,104,0.10)',
  },

  recommendBox: {
    marginTop: 14,
    background: colors.panel2,
    border: `1px solid ${colors.line}`,
    padding: 14,
  },

  recommendItem: {
    display: 'grid',
    gridTemplateColumns: '24px 1fr',
    gap: 10,
    color: colors.soft,
    fontSize: 13,
    lineHeight: 1.5,
  },

  historyList: {
    display: 'grid',
    gap: 10,
  },

  historyCard: {
    background: colors.panel2,
    border: `1px solid ${colors.line}`,
    padding: 12,
  },

  historyActive: {
    border: `1px solid ${colors.medium}`,
  },

  historyTop: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 10,
  },

  historyName: {
    color: colors.soft,
    fontWeight: 900,
  },

  historyMeta: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 4,
  },

  historyValue: {
    marginTop: 10,
    color: colors.muted,
    fontSize: 12,
    lineHeight: 1.6,
  },

  detailBtn: {
    border: `1px solid ${colors.line}`,
    background: 'transparent',
    color: colors.medium,
    fontWeight: 900,
    cursor: 'pointer',
    padding: '6px 8px',
  },

  emptyState: {
    border: `1px dashed ${colors.line}`,
    minHeight: 180,
    display: 'grid',
    placeItems: 'center',
    textAlign: 'center',
    padding: 18,
  },

  emptyCompact: {
    border: `1px dashed ${colors.line}`,
    minHeight: 120,
    display: 'grid',
    placeItems: 'center',
    textAlign: 'center',
    padding: 14,
  },

  emptyIcon: {
    color: colors.medium,
    fontSize: 26,
  },

  emptyTitle: {
    color: colors.soft,
    fontWeight: 900,
  },

  emptyText: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 1.6,
  },
};

const css = `
  * {
    box-sizing: border-box;
  }

  body {
    margin: 0;
  }

  button,
  input,
  select {
    font-family: inherit;
  }

  button {
    transition: transform .15s ease, opacity .15s ease, background .15s ease;
  }

  button:hover {
    transform: translateY(-1px);
    opacity: .96;
  }

  input::placeholder {
    color: rgba(227,254,211,.35);
  }

  select option {
    background: #0b2417;
    color: #E3FED3;
  }

  table th,
  table td {
    padding: 10px;
    border-bottom: 1px solid rgba(148,212,157,.12);
    color: #E3FED3;
    text-align: left;
    font-size: 12px;
  }

  table th {
    color: rgba(227,254,211,.55);
    font-weight: 900;
    text-transform: uppercase;
  }

  .leaflet-container {
    background: #0b2417;
  }

  @media (max-width: 1180px) {
    div[style*="grid-template-columns: 250px 1fr"] {
      grid-template-columns: 1fr !important;
    }

    aside {
      display: none !important;
    }

    div[style*="grid-template-columns: 1fr 380px"] {
      grid-template-columns: 1fr !important;
    }

    div[style*="grid-template-columns: repeat(4, minmax(0, 1fr))"] {
      grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
    }
  }

  @media (max-width: 760px) {
    div[style*="justify-content: space-between"] {
      flex-direction: column;
    }

    input[style],
    select[style] {
      width: 100% !important;
    }
  }

  @media (max-width: 650px) {
    div[style*="grid-template-columns: repeat(4, minmax(0, 1fr))"],
    div[style*="grid-template-columns: repeat(2, minmax(0, 1fr))"],
    div[style*="grid-template-columns: repeat(3, 1fr)"] {
      grid-template-columns: 1fr !important;
    }
  }
`;