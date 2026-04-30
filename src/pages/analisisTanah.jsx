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
  cream: '#F6F1E7',
  cream2: '#FFFDF4',
  white: '#FFFFFF',
  greenDark: '#076138',
  greenDeep: '#03351F',
  green: '#028739',
  greenSoft: '#46AB68',
  greenPale: '#E3FED3',
  border: 'rgba(6, 78, 46, 0.14)',
  borderStrong: 'rgba(6, 78, 46, 0.24)',
  text: '#12351f',
  muted: '#6b7b70',
  danger: '#b91c1c',
  dangerDark: '#991b1b',
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
    if (source === 'geojson-gridcode') return 'GeoJSON ';
    if (source === 'geojson') return 'GeoJSON';
    if (source === 'default') return 'Default Sistem';
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

  const safeFileName = (value) => {
    return String(value || 'analisis-tanah')
      .toLowerCase()
      .replace(/[^a-z0-9]+/gi, '-')
      .replace(/^-+|-+$/g, '');
  };

  const exportExcel = () => {
    if (!result) {
      alert('Belum ada hasil analisis untuk diexport.');
      return;
    }

    const tanggalExport = new Date().toLocaleString('id-ID');
    const namaFile = `hasil-analisis-${safeFileName(form.pointName)}.xls`;

    const html = `
      <html>
        <head>
          <meta charset="UTF-8" />
          <style>
            body {
              font-family: Arial, sans-serif;
            }

            h2 {
              color: #03351F;
            }

            table {
              border-collapse: collapse;
              width: 100%;
              margin-bottom: 18px;
            }

            th {
              background: #076138;
              color: #ffffff;
              font-weight: bold;
            }

            th, td {
              border: 1px solid #b7d8bf;
              padding: 8px;
              font-size: 12px;
            }

            .section {
              background: #E3FED3;
              color: #03351F;
              font-weight: bold;
            }
          </style>
        </head>
        <body>
          <h2>Hasil Analisis Tanah</h2>

          <table>
            <tr><td class="section" colspan="2">Informasi Titik/Lahan</td></tr>
            <tr><td>Nama Titik</td><td>${form.pointName || '-'}</td></tr>
            <tr><td>Lokasi</td><td>${form.lokasi || '-'}</td></tr>
            <tr><td>Daerah</td><td>${form.daerah || '-'}</td></tr>
            <tr><td>Radius</td><td>${form.radius || 0} m</td></tr>
            <tr><td>Latitude</td><td>${form.lat || '-'}</td></tr>
            <tr><td>Longitude</td><td>${form.lng || '-'}</td></tr>
            <tr><td>Tanggal Export</td><td>${tanggalExport}</td></tr>
          </table>

          <table>
            <tr><td class="section" colspan="3">Kandungan Daun (%)</td></tr>
            <tr>
              <th>Unsur</th>
              <th>Nilai</th>
              <th>Sumber Data</th>
            </tr>
            <tr><td>Nitrogen (N)</td><td>${form.n || '-'}</td><td>${formatSourceLabel(form.nSource)}</td></tr>
            <tr><td>Fosfor (P)</td><td>${form.p || '-'}</td><td>${formatSourceLabel(form.pSource)}</td></tr>
            <tr><td>Kalium (K)</td><td>${form.k || '-'}</td><td>${formatSourceLabel(form.kSource)}</td></tr>
            <tr><td>Magnesium (Mg)</td><td>${form.mg || '-'}</td><td>${formatSourceLabel(form.mgSource)}</td></tr>
          </table>

          <table>
            <tr><td class="section" colspan="4">Parameter Produksi</td></tr>
            <tr><td>Umur</td><td>${form.umur || '-'}</td><td>Luas</td><td>${form.luas || '-'}</td></tr>
            <tr><td>Protas</td><td>${form.protas || '-'}</td><td>Jumlah Pohon</td><td>${form.jumlahPohon || '-'}</td></tr>
          </table>

          <table>
            <tr><td class="section" colspan="4">Rincian Rekomendasi Pupuk</td></tr>
            <tr>
              <th>Jenis Pupuk</th>
              <th>Aplikasi I</th>
              <th>Aplikasi II</th>
              <th>Total</th>
            </tr>
            <tr>
              <td>Urea</td>
              <td>${result.aplikasi1.urea}</td>
              <td>${result.aplikasi2.urea}</td>
              <td>${totalPupuk(result.aplikasi1.urea, result.aplikasi2.urea)}</td>
            </tr>
            <tr>
              <td>TSP</td>
              <td>${result.aplikasi1.tsp}</td>
              <td>${result.aplikasi2.tsp}</td>
              <td>${totalPupuk(result.aplikasi1.tsp, result.aplikasi2.tsp)}</td>
            </tr>
            <tr>
              <td>KCl</td>
              <td>${result.aplikasi1.kcl}</td>
              <td>${result.aplikasi2.kcl}</td>
              <td>${totalPupuk(result.aplikasi1.kcl, result.aplikasi2.kcl)}</td>
            </tr>
            <tr>
              <td>Dolomit</td>
              <td>${result.aplikasi1.dolomit}</td>
              <td>${result.aplikasi2.dolomit}</td>
              <td>${totalPupuk(result.aplikasi1.dolomit, result.aplikasi2.dolomit)}</td>
            </tr>
            <tr>
              <th>Total</th>
              <th>${result.summary.aplikasi1_total}</th>
              <th>${result.summary.aplikasi2_total}</th>
              <th>${result.summary.total_rekomendasi}</th>
            </tr>
          </table>

          <table>
            <tr><td class="section">Rekomendasi Tindakan</td></tr>
            ${
              result.recommendations?.length
                ? result.recommendations
                    .map((item, index) => `<tr><td>${index + 1}. ${item}</td></tr>`)
                    .join('')
                : '<tr><td>Belum ada rekomendasi.</td></tr>'
            }
          </table>
        </body>
      </html>
    `;

    const blob = new Blob([html], {
      type: 'application/vnd.ms-excel;charset=utf-8;',
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = namaFile;
    document.body.appendChild(link);
    link.click();

    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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
            <img src="/ppks.png" alt="Monitoring Hara" style={s.logo} />
            <div>
              <div style={s.logoText}>Monitoring</div>
              <div style={s.logoText}>Hara</div>
            </div>
          </div>

          <nav style={s.nav}>
            <button style={s.navItem} onClick={() => onNavigate('user-dashboard')}>
              Dashboard
            </button>

            <button style={s.navItem} onClick={() => onNavigate('digitasi')}>
              Digitasi
            </button>

            <button style={s.navItem} onClick={() => onNavigate('laporan')}>
              Laporan
            </button>

            <button style={{ ...s.navItem, ...s.navItemActive }}>
              Analisis Tanah
            </button>
          </nav>
        </div>
      </aside>

      <main style={s.main}>
        <header style={s.header}>
          <div>
            <h1 style={s.title}> Analisis Kandungan Tanah</h1>
          </div>
        </header>

        <div style={s.topBar}>
          <div style={s.selectBox}>
            <label style={s.topLabel}>Pilih Titik/Lahan</label>
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

          <button
            style={{
              ...s.exportBtn,
              opacity: result ? 1 : 0.55,
              cursor: result ? 'pointer' : 'not-allowed',
            }}
            onClick={exportExcel}
            disabled={!result}
          >
            Export ke Excel
          </button>
        </div>

        <section style={s.layout}>
          <div style={s.left}>
            <section style={s.panel}>
              <div style={s.panelHeader}>
                <div>
                  <div style={s.panelTag}>KANDUNGAN DAUN (%)</div>
                  <h3 style={s.panelTitle}>Konsentrasi Unsur Hara</h3>
                </div>

                <div style={s.updateText}>
                  Update: {new Date().toLocaleDateString('id-ID')}
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
            </section>

            <section style={s.panel}>
              <div style={s.panelHeader}>
                <div>
                  <div style={s.panelTag}>PETA LOKASI</div>
                  <h3 style={s.panelTitle}>Lokasi Titik Lahan</h3>
                </div>

                {hasMap && <div style={s.updateText}>Radius {mapRadius || 0} m</div>}
              </div>

              {!hasMap ? (
                <div style={s.emptyMap}>
                  <div style={s.emptyIcon}>▧</div>
                  <div style={s.emptyTitle}>Belum Ada Lokasi Aktif</div>
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
                    style={{ height: 310, width: '100%' }}
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
                          color: colors.green,
                          fillColor: colors.green,
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
                  <h3 style={s.panelTitle}>Parameter Produksi</h3>
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
                  Hitung
                </button>

                <button style={s.primaryAction} onClick={simpan}>
                  Hitung & Simpan
                </button>
              </div>
            </section>
          </div>

          <div style={s.right}>
            <section style={s.panel}>
              <div style={s.panelHeader}>
                <div>
                  <div style={s.panelTag}>RINGKASAN ANALISIS</div>
                  <h3 style={s.panelTitleSmall}>Hasil Rekomendasi</h3>
                </div>

                {selectedHistoryId && <span style={s.savedChip}>Tersimpan</span>}
              </div>

              {!result ? (
                <EmptyState
                  title="Belum Ada Analisis"
                  text="Pilih titik lahan, isi parameter produksi, lalu klik tombol Hitung."
                />
              ) : (
                <>
                  <div style={s.resultGrid}>
                    <ResultCard label="Aplikasi I" value={result.summary.aplikasi1_total} />
                    <ResultCard label="Aplikasi II" value={result.summary.aplikasi2_total} />
                    <ResultCard label="Total" value={result.summary.total_rekomendasi} />
                  </div>

                  <div style={s.tableBox}>
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

                  <div style={s.recommendBox}>
                    <div style={s.panelTag}>REKOMENDASI TINDAKAN</div>

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
                  <div style={s.panelTag}>RIWAYAT ANALISIS</div>
                  <h3 style={s.panelTitleSmall}>Perkembangan Titik</h3>
                </div>
              </div>

              {!form.pointId ? (
                <EmptyState
                  title="Riwayat Kosong"
                  text="Pilih titik/lahan untuk menampilkan riwayat analisis."
                  compact
                />
              ) : filteredHistory.length === 0 ? (
                <EmptyState
                  title="Riwayat Kosong"
                  text="Belum ada riwayat analisis untuk titik ini."
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
                        Aplikasi I: {item.aplikasi1_total} | Aplikasi II:{' '}
                        {item.aplikasi2_total} | Total: {item.total_rekomendasi}
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
    background: colors.cream,
    color: colors.text,
    fontFamily: 'Inter, system-ui, sans-serif',
  },

  sidebar: {
    background: colors.greenDark,
    color: colors.white,
    padding: 22,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    minHeight: '100vh',
    boxShadow: '18px 0 50px rgba(6, 78, 46, 0.13)',
  },

  logoBox: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginBottom: 34,
  },

  logo: {
    width: 54,
    height: 54,
    borderRadius: 999,
    background: colors.white,
    padding: 5,
    border: `2px solid ${colors.greenPale}`,
  },

  logoText: {
    fontWeight: 900,
    color: colors.white,
    letterSpacing: 0.2,
    fontSize: 19,
    lineHeight: 1.15,
  },

  nav: {
    display: 'grid',
    gap: 10,
  },

  navItem: {
    width: '100%',
    display: 'flex',
    gap: 12,
    alignItems: 'center',
    border: 'none',
    background: 'transparent',
    color: 'rgba(255,255,255,0.72)',
    padding: '13px 12px',
    textAlign: 'left',
    cursor: 'pointer',
    fontWeight: 900,
    textTransform: 'uppercase',
    fontSize: 12,
    letterSpacing: 0.7,
    borderRadius: 14,
  },

  navItemActive: {
    background: colors.cream2,
    color: colors.greenDark,
  },

  sidebarBottom: {
    display: 'grid',
    gap: 14,
  },

  newBtn: {
    border: 'none',
    background: colors.white,
    color: colors.greenDark,
    padding: '13px 14px',
    fontWeight: 900,
    cursor: 'pointer',
    textTransform: 'uppercase',
    fontSize: 12,
    letterSpacing: 0.7,
    borderRadius: 14,
    boxShadow: '0 14px 28px rgba(0,0,0,0.12)',
  },

  sideSmallBtn: {
    border: 'none',
    background: 'transparent',
    color: 'rgba(255,255,255,0.78)',
    textAlign: 'left',
    cursor: 'pointer',
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    fontWeight: 700,
  },

  main: {
    padding: '28px 32px',
    background: colors.cream,
    minWidth: 0,
  },

  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 16,
    marginBottom: 22,
  },

  eyebrow: {
    color: colors.green,
    fontWeight: 900,
    fontSize: 12,
    letterSpacing: 1.2,
    marginBottom: 6,
    textTransform: 'uppercase',
  },

  title: {
    margin: 0,
    color: colors.greenDeep,
    fontSize: 34,
    letterSpacing: '-0.8px',
  },

  subtitle: {
    color: colors.muted,
    marginTop: 8,
    lineHeight: 1.7,
    maxWidth: 760,
  },

  backBtn: {
    height: 42,
    border: `1px solid ${colors.borderStrong}`,
    background: colors.white,
    color: colors.greenDark,
    cursor: 'pointer',
    padding: '0 14px',
    fontWeight: 900,
    borderRadius: 14,
    boxShadow: '0 10px 24px rgba(6,78,46,0.08)',
  },

  topBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: 14,
    marginBottom: 18,
    flexWrap: 'wrap',
  },

  selectBox: {
    display: 'grid',
    gap: 7,
  },

  topLabel: {
    fontSize: 12,
    color: colors.greenDeep,
    fontWeight: 900,
    textTransform: 'uppercase',
  },

  topSelect: {
    width: 360,
    maxWidth: '100%',
    background: colors.white,
    border: `1px solid ${colors.border}`,
    color: colors.text,
    padding: '12px 14px',
    fontWeight: 800,
    outline: 'none',
    borderRadius: 14,
  },

  exportBtn: {
    border: 'none',
    background: colors.greenDark,
    color: colors.white,
    padding: '12px 16px',
    fontWeight: 900,
    borderRadius: 14,
    boxShadow: '0 12px 24px rgba(6,78,46,0.18)',
  },

  layout: {
    display: 'grid',
    gridTemplateColumns: '1fr 390px',
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
    background: colors.white,
    border: `1px solid ${colors.border}`,
    padding: 20,
    borderRadius: 24,
    boxShadow: '0 14px 36px rgba(6,78,46,0.08)',
  },

  panelHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 16,
  },

  panelTag: {
    color: colors.green,
    fontSize: 11,
    fontWeight: 900,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 5,
  },

  panelTitle: {
    margin: 0,
    color: colors.greenDeep,
    fontSize: 21,
  },

  panelTitleSmall: {
    margin: 0,
    color: colors.greenDeep,
    fontSize: 17,
  },

  updateText: {
    color: colors.muted,
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
    background: colors.cream2,
    border: `1px solid ${colors.border}`,
    padding: 16,
    minHeight: 128,
    borderRadius: 18,
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
    color: colors.green,
  },

  sourcePill: {
    display: 'inline-block',
    marginTop: 12,
    padding: '5px 8px',
    fontSize: 10,
    fontWeight: 900,
    textTransform: 'uppercase',
    borderRadius: 999,
  },

  sourceGeo: {
    background: colors.greenPale,
    color: colors.greenDark,
    border: `1px solid ${colors.border}`,
  },

  sourceDefault: {
    background: colors.white,
    color: colors.muted,
    border: `1px solid ${colors.border}`,
  },

  mapWrap: {
    position: 'relative',
    overflow: 'hidden',
    border: `1px solid ${colors.border}`,
    borderRadius: 18,
  },

  coordBadge: {
    position: 'absolute',
    left: 14,
    bottom: 14,
    background: colors.white,
    color: colors.greenDark,
    padding: '8px 10px',
    fontWeight: 900,
    fontSize: 11,
    zIndex: 500,
    borderRadius: 999,
    border: `1px solid ${colors.border}`,
  },

  emptyMap: {
    border: `1px dashed ${colors.borderStrong}`,
    padding: 34,
    color: colors.muted,
    textAlign: 'center',
    minHeight: 230,
    display: 'grid',
    placeItems: 'center',
    background: colors.cream2,
    borderRadius: 18,
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
    color: colors.greenDeep,
    fontSize: 12,
    fontWeight: 900,
  },

  input: {
    background: colors.cream2,
    border: `1px solid ${colors.border}`,
    color: colors.text,
    padding: '12px 13px',
    outline: 'none',
    borderRadius: 14,
  },

  actions: {
    display: 'flex',
    gap: 12,
    marginTop: 16,
    flexWrap: 'wrap',
  },

  outlineAction: {
    border: `1px solid ${colors.border}`,
    background: colors.cream2,
    color: colors.greenDark,
    padding: '12px 14px',
    cursor: 'pointer',
    fontWeight: 900,
    borderRadius: 14,
  },

  primaryAction: {
    border: 'none',
    background: colors.greenDark,
    color: colors.white,
    padding: '12px 14px',
    cursor: 'pointer',
    fontWeight: 900,
    borderRadius: 14,
    boxShadow: '0 12px 24px rgba(6,78,46,0.18)',
  },

  savedChip: {
    color: colors.greenDark,
    background: colors.greenPale,
    border: `1px solid ${colors.border}`,
    padding: '6px 9px',
    fontSize: 11,
    fontWeight: 900,
    borderRadius: 999,
  },

  resultGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 10,
    marginBottom: 14,
  },

  resultCard: {
    background: colors.cream2,
    border: `1px solid ${colors.border}`,
    padding: 12,
    borderRadius: 16,
  },

  resultLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: 900,
    textTransform: 'uppercase',
  },

  resultValue: {
    color: colors.green,
    fontSize: 28,
    fontWeight: 900,
    marginTop: 8,
  },

  tableBox: {
    overflowX: 'auto',
    border: `1px solid ${colors.border}`,
    borderRadius: 16,
  },

  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },

  totalRow: {
    background: colors.greenPale,
    fontWeight: 900,
  },

  recommendBox: {
    marginTop: 14,
    background: colors.cream2,
    border: `1px solid ${colors.border}`,
    padding: 14,
    borderRadius: 18,
  },

  recommendItem: {
    display: 'grid',
    gridTemplateColumns: '24px 1fr',
    gap: 10,
    color: colors.text,
    fontSize: 13,
    lineHeight: 1.5,
  },

  historyList: {
    display: 'grid',
    gap: 10,
    maxHeight: 430,
    overflowY: 'auto',
    paddingRight: 6,
  },

  historyCard: {
    background: colors.cream2,
    border: `1px solid ${colors.border}`,
    padding: 12,
    borderRadius: 16,
  },

  historyActive: {
    border: `1px solid ${colors.green}`,
  },

  historyTop: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 10,
  },

  historyName: {
    color: colors.greenDeep,
    fontWeight: 900,
  },

  historyMeta: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 4,
  },

  historyValue: {
    marginTop: 10,
    color: colors.text,
    fontSize: 12,
    lineHeight: 1.6,
  },

  detailBtn: {
    border: `1px solid ${colors.border}`,
    background: colors.white,
    color: colors.greenDark,
    fontWeight: 900,
    cursor: 'pointer',
    padding: '6px 8px',
    borderRadius: 10,
  },

  emptyState: {
    border: `1px dashed ${colors.borderStrong}`,
    minHeight: 180,
    display: 'grid',
    placeItems: 'center',
    textAlign: 'center',
    padding: 18,
    background: colors.cream2,
    borderRadius: 18,
  },

  emptyCompact: {
    border: `1px dashed ${colors.borderStrong}`,
    minHeight: 120,
    display: 'grid',
    placeItems: 'center',
    textAlign: 'center',
    padding: 14,
    background: colors.cream2,
    borderRadius: 18,
  },

  emptyIcon: {
    color: colors.green,
    fontSize: 26,
  },

  emptyTitle: {
    color: colors.greenDeep,
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
    background: ${colors.cream};
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
    color: rgba(18, 53, 31, 0.36);
  }

  input:focus,
  select:focus {
    border-color: rgba(6, 78, 46, 0.34) !important;
    box-shadow: 0 0 0 3px rgba(70, 171, 104, 0.12);
    background: #ffffff !important;
  }

  select option {
    background: ${colors.cream2};
    color: ${colors.text};
  }

  table th,
  table td {
    padding: 10px;
    border-bottom: 1px solid rgba(6, 78, 46, 0.12);
    color: ${colors.text};
    text-align: left;
    font-size: 12px;
  }

  table th {
    color: ${colors.greenDeep};
    font-weight: 900;
    text-transform: uppercase;
    background: ${colors.cream2};
  }

  div::-webkit-scrollbar {
    width: 8px;
  }

  div::-webkit-scrollbar-track {
    background: rgba(6, 78, 46, 0.06);
    border-radius: 999px;
  }

  div::-webkit-scrollbar-thumb {
    background: rgba(6, 78, 46, 0.28);
    border-radius: 999px;
  }

  div::-webkit-scrollbar-thumb:hover {
    background: rgba(6, 78, 46, 0.42);
  }

  .leaflet-container {
    background: ${colors.cream2};
  }

  .leaflet-popup-content-wrapper,
  .leaflet-popup-tip {
    background: ${colors.white};
    color: ${colors.text};
  }

  @media (max-width: 1180px) {
    div[style*="grid-template-columns: 250px 1fr"] {
      grid-template-columns: 1fr !important;
    }

    aside {
      display: none !important;
    }

    div[style*="grid-template-columns: 1fr 390px"] {
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