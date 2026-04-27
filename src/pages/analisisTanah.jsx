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

export default function AnalisisTanah({ token, onNavigate }) {
  const [points, setPoints] = useState([]);
  const [history, setHistory] = useState([]);
  const [result, setResult] = useState(null);
  const [selectedHistoryId, setSelectedHistoryId] = useState(null);

  const [form, setForm] = useState({
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
  });

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

  const buildRecommendationsFromHistory = () => {
    return [
      'Hasil ini berasal dari analisis yang sudah tersimpan.',
      'Lakukan evaluasi ulang setelah aplikasi II untuk memastikan respon tanaman.',
    ];
  };

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
      setForm({
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
      });
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

  const totalPupuk = (a, b) => (Number(a) + Number(b)).toFixed(2).replace(/\.00$/, '');

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
    <div style={s.page}>
      <style>{css}</style>

      <header style={s.topbar}>
        <div>
          <div style={s.eyebrow}>ANALISIS TANAH</div>
          <h1 style={s.title}>Perhitungan Dosis Berbasis Titik & Radius</h1>
          <p style={s.subtitle}>
            Analisis kandungan daun berdasarkan titik lahan, lalu hitung rekomendasi dosis pupuk
            dengan tampilan yang lebih fokus, rapi, dan mudah dibaca.
          </p>
        </div>

        <button style={s.backButton} onClick={() => onNavigate('user-dashboard')}>
          ← Dashboard User
        </button>
      </header>

      <main style={s.mainGrid}>
        <aside style={s.sidebar}>
          <section style={s.panel}>
            <div style={s.panelHeader}>
              <div style={s.panelTag}>TITIK</div>
              <h3 style={s.panelTitle}>Pemilihan Lahan</h3>
            </div>

            <label style={s.label}>Pilih Titik/Lahan</label>
            <select
              style={s.input}
              value={form.pointId}
              onChange={(e) => handleSelectPoint(e.target.value)}
            >
              <option value="">Pilih titik</option>
              {points.map((point) => (
                <option key={point.id} value={point.id}>
                  {point.nama} - {point.lokasi || '-'} - {point.daerah || '-'}
                </option>
              ))}
            </select>

            <div style={s.metaStack}>
              <MetaCard label="Nama Titik" value={form.pointName} />
              <MetaCard label="Lokasi" value={form.lokasi} />
              <MetaCard label="Daerah" value={form.daerah} />
              <MetaCard label="Radius Area" value={form.radius ? `${form.radius} m` : '-'} />
              <MetaCard
                label="Koordinat"
                value={hasMap ? `${mapLat.toFixed(6)}, ${mapLng.toFixed(6)}` : '-'}
              />
            </div>
          </section>

          <section style={s.panel}>
            <div style={s.panelHeader}>
              <div style={s.panelTag}>PETA TITIK</div>
              <h3 style={s.panelTitle}>Lokasi Lahan</h3>
            </div>

            {!hasMap ? (
              <div style={s.emptyState}>Pilih titik untuk menampilkan lokasi pada peta.</div>
            ) : (
              <div style={s.mapWrap}>
                <MapContainer
                  center={[mapLat, mapLng]}
                  zoom={15}
                  scrollWheelZoom={false}
                  style={{ height: '280px', width: '100%', borderRadius: '18px' }}
                >
                  <TileLayer
                    attribution='&copy; OpenStreetMap'
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
                        color: '#1f5c3f',
                        fillColor: '#1f5c3f',
                        fillOpacity: 0.15,
                      }}
                    />
                  )}
                </MapContainer>
              </div>
            )}
          </section>

          <section style={s.panel}>
            <div style={s.panelHeader}>
              <div style={s.panelTag}>KANDUNGAN</div>
              <h3 style={s.panelTitle}>Kandungan Daun (%)</h3>
            </div>

            <div style={s.nutrientGrid}>
              <NutrientBlock
                name="Nitrogen (N)"
                value={form.n || '-'}
                source={formatSourceLabel(form.nSource)}
                sourceStyle={sourceTone(form.nSource)}
              />
              <NutrientBlock
                name="Fosfor (P)"
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

            <div style={s.helperNote}>
              N dan Mg dibaca otomatis dari GeoJSON sesuai lokasi titik. P dan K sementara
              memakai nilai default sistem sampai file GeoJSON tersedia.
            </div>
          </section>

          <section style={s.panel}>
            <div style={s.panelHeader}>
              <div style={s.panelTag}>PRODUKSI</div>
              <h3 style={s.panelTitle}>Input Parameter</h3>
            </div>

            <label style={s.label}>Umur</label>
            <input
              style={s.input}
              value={form.umur}
              onChange={(e) => setForm({ ...form, umur: e.target.value })}
            />

            <label style={s.label}>Luas</label>
            <input
              style={s.input}
              value={form.luas}
              onChange={(e) => setForm({ ...form, luas: e.target.value })}
            />

            <label style={s.label}>Protas</label>
            <input
              style={s.input}
              value={form.protas}
              onChange={(e) => setForm({ ...form, protas: e.target.value })}
            />

            <label style={s.label}>Jumlah Pohon</label>
            <input
              style={s.input}
              value={form.jumlahPohon}
              onChange={(e) => setForm({ ...form, jumlahPohon: e.target.value })}
            />

            <div style={s.actions}>
              <button style={s.secondaryAction} onClick={hitung}>
                Hitung
              </button>
              <button style={s.primaryAction} onClick={simpan}>
                Hitung & Simpan
              </button>
            </div>
          </section>
        </aside>

        <section style={s.content}>
          <section style={s.heroResult}>
            <div style={s.heroResultTop}>
              <div>
                <div style={s.panelTag}>HASIL</div>
                <h3 style={s.resultTitle}>Ringkasan Analisis</h3>
              </div>

              {selectedHistoryId && <div style={s.savedChip}>Data tersimpan</div>}
            </div>

            {!result ? (
              <div style={s.emptyState}>
                Belum ada hasil perhitungan. Pilih titik, isi parameter produksi, lalu klik
                tombol hitung.
              </div>
            ) : (
              <>
                <div style={s.resultCards}>
                  <ResultCard label="Aplikasi I" value={result.summary.aplikasi1_total} />
                  <ResultCard label="Aplikasi II" value={result.summary.aplikasi2_total} />
                  <ResultCard label="Total Rekomendasi" value={result.summary.total_rekomendasi} />
                </div>

                <div style={s.resultSplit}>
                  <div style={s.tableWrap}>
                    <div style={s.blockTitle}>Rincian Per Jenis Pupuk</div>

                    <table style={s.table}>
                      <thead>
                        <tr>
                          <th>Pupuk</th>
                          <th>Aplikasi I</th>
                          <th>Aplikasi II</th>
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
                          <td>{totalPupuk(result.aplikasi1.dolomit, result.aplikasi2.dolomit)}</td>
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

                  <div style={s.recommendPanel}>
                    <div style={s.blockTitle}>Rekomendasi Tindakan</div>
                    <div style={s.recommendList}>
                      {result.recommendations?.length ? (
                        result.recommendations.map((item, idx) => (
                          <div key={idx} style={s.recommendItem}>
                            <span style={s.recommendIndex}>{idx + 1}</span>
                            <span>{item}</span>
                          </div>
                        ))
                      ) : (
                        <div style={s.emptySmall}>Belum ada rekomendasi.</div>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
          </section>

          <section style={s.historySection}>
            <div style={s.historyHeader}>
              <div>
                <div style={s.panelTag}>RIWAYAT</div>
                <h3 style={s.resultTitle}>
                  {form.pointName ? `Riwayat Analisis - ${form.pointName}` : 'Riwayat Analisis'}
                </h3>
              </div>
            </div>

            {!form.pointId ? (
              <div style={s.emptyState}>Pilih titik/lahan terlebih dahulu untuk melihat riwayat analisis.</div>
            ) : filteredHistory.length === 0 ? (
              <div style={s.emptyState}>Belum ada riwayat analisis untuk titik yang dipilih.</div>
            ) : (
              <div style={s.historyList}>
                {filteredHistory.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      ...s.historyCard,
                      ...(selectedHistoryId === item.id ? s.historyCardActive : {}),
                    }}
                  >
                    <div style={s.historyCardTop}>
                      <div>
                        <div style={s.historyName}>{item.point_name || 'Tanpa titik'}</div>
                        <div style={s.historyMeta}>
                          {item.lokasi || '-'} · {item.daerah || '-'} · Radius {item.radius || 0} m
                        </div>
                        <div style={s.historyDate}>
                          Tanggal analisis: {formatDate(item.created_at)}
                        </div>
                      </div>

                      <button style={s.detailBtn} onClick={() => showHistoryDetail(item)}>
                        Lihat Detail
                      </button>
                    </div>

                    <div style={s.historyMetrics}>
                      <HistoryGroup
                        title="Aplikasi I"
                        data={[
                          ['Urea', item.urea_app1],
                          ['TSP', item.tsp_app1],
                          ['KCl', item.kcl_app1],
                          ['Dolomit', item.dolomit_app1],
                          ['Total', item.aplikasi1_total],
                        ]}
                      />
                      <HistoryGroup
                        title="Aplikasi II"
                        data={[
                          ['Urea', item.urea_app2],
                          ['TSP', item.tsp_app2],
                          ['KCl', item.kcl_app2],
                          ['Dolomit', item.dolomit_app2],
                          ['Total', item.aplikasi2_total],
                        ]}
                      />
                    </div>

                    <div style={s.historyFooter}>
                      Total Rekomendasi: {item.total_rekomendasi}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </section>
      </main>
    </div>
  );
}

function MetaCard({ label, value }) {
  return (
    <div style={s.metaCard}>
      <div style={s.metaLabel}>{label}</div>
      <div style={s.metaValue}>{value || '-'}</div>
    </div>
  );
}

function NutrientBlock({ name, value, source, sourceStyle }) {
  return (
    <div style={s.nutrientCard}>
      <div style={s.nutrientName}>{name}</div>
      <div style={s.nutrientValue}>{value}</div>
      <div style={{ ...s.sourcePill, ...sourceStyle }}>{source}</div>
    </div>
  );
}

function ResultCard({ label, value }) {
  return (
    <div style={s.resultCard}>
      <div style={s.resultCardLabel}>{label}</div>
      <div style={s.resultCardValue}>{value}</div>
    </div>
  );
}

function HistoryGroup({ title, data }) {
  return (
    <div style={s.historyGroup}>
      <div style={s.historyGroupTitle}>{title}</div>
      <div style={s.historyGroupGrid}>
        {data.map(([label, value]) => (
          <div key={label} style={s.historyMetric}>
            <div style={s.historyMetricLabel}>{label}</div>
            <div style={s.historyMetricValue}>{value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

const s = {
  page: {
    minHeight: '100vh',
    padding: 28,
    color: '#f8fafc',
    fontFamily: 'Inter, system-ui, sans-serif',
    background: '#076935',
  },

  topbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 20,
    flexWrap: 'wrap',
    marginBottom: 28,
  },

  eyebrow: {
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: 3,
    color: 'rgba(248,250,252,0.65)',
    marginBottom: 10,
  },

  title: {
    margin: 0,
    fontSize: 52,
    lineHeight: 1.04,
    letterSpacing: '-1.5px',
    fontWeight: 900,
    color: '#ffffff',
    maxWidth: 920,
  },

  subtitle: {
    marginTop: 16,
    maxWidth: 820,
    fontSize: 18,
    lineHeight: 1.85,
    color: 'rgba(255,255,255,0.72)',
  },

  backButton: {
    border: '1px solid rgba(255,255,255,0.08)',
    background: '#13261b',
    color: '#ffffff',
    borderRadius: 16,
    padding: '14px 18px',
    fontWeight: 700,
    cursor: 'pointer',
  },

  mainGrid: {
    display: 'grid',
    gridTemplateColumns: '390px 1fr',
    gap: 22,
    alignItems: 'start',
  },

  sidebar: {
    display: 'flex',
    flexDirection: 'column',
    gap: 18,
    position: 'sticky',
    top: 18,
  },

  content: {
    display: 'grid',
    gap: 20,
  },

  panel: {
    background: '#102017',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 24,
    padding: 20,
  },

  heroResult: {
    background: '#102017',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 28,
    padding: 22,
  },

  panelHeader: {
    marginBottom: 14,
  },

  panelTag: {
    display: 'inline-block',
    fontSize: 11,
    letterSpacing: 2.2,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.58)',
    fontWeight: 700,
    marginBottom: 8,
  },

  panelTitle: {
    margin: 0,
    fontSize: 23,
    fontWeight: 800,
    letterSpacing: '-0.3px',
    color: '#f5f8f5',
  },

  label: {
    display: 'block',
    marginTop: 14,
    marginBottom: 8,
    fontWeight: 700,
    color: '#f2f6f2',
  },

  input: {
    width: '100%',
    borderRadius: 16,
    border: '1px solid rgba(255,255,255,0.08)',
    background: '#13261b',
    color: '#ffffff',
    padding: '15px 16px',
    fontSize: 15,
    outline: 'none',
  },

  metaStack: {
    display: 'grid',
    gap: 12,
    marginTop: 16,
  },

  metaCard: {
    borderRadius: 18,
    background: '#13261b',
    border: '1px solid rgba(255,255,255,0.05)',
    padding: 14,
  },

  metaLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.56)',
    marginBottom: 6,
    fontWeight: 600,
  },

  metaValue: {
    fontSize: 17,
    fontWeight: 700,
    color: '#ffffff',
  },

  mapWrap: {
    marginTop: 10,
    borderRadius: 18,
    overflow: 'hidden',
    border: '1px solid rgba(255,255,255,0.06)',
  },

  nutrientGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 12,
  },

  nutrientCard: {
    borderRadius: 20,
    background: '#13261b',
    border: '1px solid rgba(255,255,255,0.05)',
    padding: 16,
    minHeight: 148,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
  },

  nutrientName: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.72)',
    fontWeight: 600,
  },

  nutrientValue: {
    fontSize: 34,
    fontWeight: 900,
    lineHeight: 1,
    color: '#ffffff',
    letterSpacing: '-0.8px',
    marginTop: 12,
    marginBottom: 10,
  },

  sourcePill: {
    width: 'fit-content',
    padding: '6px 10px',
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 700,
    border: '1px solid rgba(255,255,255,0.08)',
  },

  sourceGeo: {
    background: 'rgba(31,92,63,0.22)',
    color: '#ffffff',
    border: '1px solid rgba(31,92,63,0.45)',
  },

  sourceDefault: {
    background: 'rgba(255,255,255,0.05)',
    color: '#ffffff',
    border: '1px solid rgba(255,255,255,0.12)',
  },

  helperNote: {
    marginTop: 16,
    borderRadius: 18,
    background: '#13261b',
    border: '1px solid rgba(255,255,255,0.05)',
    padding: 16,
    color: 'rgba(255,255,255,0.72)',
    lineHeight: 1.8,
  },

  actions: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 12,
    marginTop: 18,
  },

  secondaryAction: {
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 16,
    background: '#13261b',
    color: '#ffffff',
    padding: '14px 18px',
    fontWeight: 800,
    cursor: 'pointer',
    fontSize: 15,
  },

  primaryAction: {
    border: 'none',
    borderRadius: 16,
    background: '#1f5c3f',
    color: '#ffffff',
    padding: '14px 18px',
    fontWeight: 800,
    cursor: 'pointer',
    fontSize: 15,
  },

  heroResultTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    flexWrap: 'wrap',
    marginBottom: 18,
  },

  savedChip: {
    borderRadius: 999,
    background: 'rgba(31,92,63,0.18)',
    color: '#ffffff',
    border: '1px solid rgba(31,92,63,0.35)',
    fontSize: 12,
    fontWeight: 800,
    padding: '7px 12px',
  },

  resultTitle: {
    margin: 0,
    fontSize: 26,
    fontWeight: 800,
    color: '#f3f7f3',
  },

  emptyState: {
    borderRadius: 20,
    background: '#13261b',
    border: '1px dashed rgba(255,255,255,0.12)',
    padding: 18,
    color: 'rgba(255,255,255,0.58)',
    lineHeight: 1.85,
  },

  resultCards: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    gap: 14,
    marginBottom: 18,
  },

  resultCard: {
    background: '#13261b',
    border: '1px solid rgba(255,255,255,0.05)',
    borderRadius: 22,
    padding: 18,
    minHeight: 110,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
  },

  resultCardLabel: {
    color: 'rgba(255,255,255,0.58)',
    fontSize: 14,
    fontWeight: 600,
  },

  resultCardValue: {
    fontSize: 42,
    lineHeight: 1,
    fontWeight: 900,
    letterSpacing: '-1px',
    color: '#ffffff',
  },

  resultSplit: {
    display: 'grid',
    gridTemplateColumns: '1.15fr 0.85fr',
    gap: 18,
  },

  tableWrap: {
    background: '#13261b',
    border: '1px solid rgba(255,255,255,0.05)',
    borderRadius: 22,
    padding: 16,
    overflowX: 'auto',
  },

  blockTitle: {
    fontSize: 20,
    fontWeight: 800,
    marginBottom: 14,
    color: '#f2f6f2',
  },

  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },

  totalRow: {
    background: 'rgba(31,92,63,0.18)',
    fontWeight: 800,
  },

  recommendPanel: {
    background: '#13261b',
    border: '1px solid rgba(255,255,255,0.05)',
    borderRadius: 22,
    padding: 16,
  },

  recommendList: {
    display: 'grid',
    gap: 12,
  },

  recommendItem: {
    display: 'grid',
    gridTemplateColumns: '34px 1fr',
    gap: 12,
    alignItems: 'start',
    color: '#ffffff',
    lineHeight: 1.8,
  },

  recommendIndex: {
    width: 34,
    height: 34,
    borderRadius: 12,
    background: '#1f5c3f',
    border: '1px solid rgba(255,255,255,0.08)',
    display: 'grid',
    placeItems: 'center',
    fontWeight: 800,
    color: '#ffffff',
    fontSize: 13,
  },

  emptySmall: {
    color: 'rgba(255,255,255,0.58)',
  },

  historySection: {
    background: '#102017',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 28,
    padding: 22,
  },

  historyHeader: {
    marginBottom: 16,
  },

  historyList: {
    display: 'grid',
    gap: 14,
  },

  historyCard: {
    background: '#13261b',
    border: '1px solid rgba(255,255,255,0.05)',
    borderRadius: 22,
    padding: 18,
  },

  historyCardActive: {
    border: '1px solid rgba(215, 251, 233, 0.45)',
  },

  historyCardTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    flexWrap: 'wrap',
    marginBottom: 14,
  },

  historyName: {
    fontSize: 18,
    fontWeight: 800,
    color: '#f5f8f5',
  },

  historyMeta: {
    marginTop: 6,
    fontSize: 14,
    color: 'rgba(255,255,255,0.56)',
  },

  historyDate: {
    marginTop: 8,
    fontSize: 13,
    color: 'rgba(255,255,255,0.72)',
    fontWeight: 600,
  },

  detailBtn: {
    border: 'none',
    borderRadius: 14,
    background: '#1f5c3f',
    color: '#ffffff',
    padding: '11px 16px',
    fontWeight: 700,
    cursor: 'pointer',
  },

  historyMetrics: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 12,
  },

  historyGroup: {
    background: '#163025',
    border: '1px solid rgba(255,255,255,0.04)',
    borderRadius: 18,
    padding: 14,
  },

  historyGroupTitle: {
    fontSize: 14,
    fontWeight: 800,
    color: '#ffffff',
    marginBottom: 10,
  },

  historyGroupGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(5, minmax(0,1fr))',
    gap: 10,
  },

  historyMetric: {
    background: '#1c382b',
    border: '1px solid rgba(255,255,255,0.04)',
    borderRadius: 14,
    padding: 12,
  },

  historyMetricLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.56)',
    marginBottom: 6,
    fontWeight: 600,
  },

  historyMetricValue: {
    fontSize: 18,
    fontWeight: 800,
    color: '#f6f9f6',
  },

  historyFooter: {
    marginTop: 14,
    borderRadius: 16,
    background: 'rgba(31,92,63,0.18)',
    border: '1px solid rgba(31,92,63,0.35)',
    padding: 14,
    fontWeight: 800,
    color: '#ffffff',
  },
};

const css = `
  * { box-sizing: border-box; }

  select, input {
    font-family: inherit;
  }

  select, option {
    background: #18df6b;
    color: #ffffff;
  }

  input::placeholder {
    color: rgba(255,255,255,0.34);
  }

  table th, table td {
    padding: 15px 12px;
    text-align: left;
    border-bottom: 1px solid rgba(255,255,255,0.08);
  }

  table th {
    color: rgba(255,255,255,0.62);
    font-size: 14px;
    font-weight: 700;
  }

  table td {
    color: #ffffff;
    font-size: 15px;
  }

  button {
    transition: transform 0.16s ease, opacity 0.16s ease, background 0.16s ease;
  }

  button:hover {
    transform: translateY(-1px);
    opacity: 0.98;
  }

  @media (max-width: 1180px) {
    div[style*="grid-template-columns: 390px 1fr"] {
      grid-template-columns: 1fr !important;
    }

    aside[style*="position: sticky"] {
      position: static !important;
    }
  }

  @media (max-width: 980px) {
    div[style*="grid-template-columns: repeat(3, minmax(0, 1fr))"] {
      grid-template-columns: 1fr !important;
    }

    div[style*="grid-template-columns: 1.15fr 0.85fr"] {
      grid-template-columns: 1fr !important;
    }

    div[style*="grid-template-columns: 1fr 1fr"] {
      grid-template-columns: 1fr !important;
    }

    div[style*="grid-template-columns: repeat(5, minmax(0,1fr))"] {
      grid-template-columns: 1fr 1fr !important;
    }

    h1 {
      font-size: 40px !important;
    }
  }

  @media (max-width: 560px) {
    div[style*="grid-template-columns: repeat(5, minmax(0,1fr))"] {
      grid-template-columns: 1fr !important;
    }
  }
`;