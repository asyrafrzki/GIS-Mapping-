import React, { useEffect, useState } from 'react';
import { apiRequest } from '../services/api';

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
      'Lakukan evaluasi ulang setelah aplikasi 2 untuk memastikan respon tanaman.',
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
    recommendations: buildRecommendationsFromHistory(row),
  });

  const handleSelectPoint = async (pointId) => {
    if (!pointId) {
      setForm({
        pointId: '',
        pointName: '',
        lokasi: '',
        daerah: '',
        radius: '',
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

  const filteredHistory = form.pointId
    ? history.filter((item) => String(item.point_id) === String(form.pointId))
    : [];

  return (
    <div style={s.page}>
      <style>{css}</style>

      <div style={s.header}>
        <div>
          <div style={s.kicker}>ANALISIS TANAH</div>
          <h1 style={s.title}>Perhitungan Dosis Berbasis Titik & Radius</h1>
          <p style={s.desc}>
            Pilih lahan, sistem mengambil kandungan daun N dan Mg dari GeoJSON daerah titik, lalu hitung rekomendasi dosis berdasarkan input produksi.
          </p>
        </div>

        <button style={s.secondaryBtn} onClick={() => onNavigate('user-dashboard')}>
          ← Dashboard User
        </button>
      </div>

      <div style={s.layout}>
        <div style={s.leftCol}>
          <div style={s.card} className="glass">
            <h3 style={s.sectionTitle}>Informasi Titik</h3>

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

            <label style={s.label}>Nama Titik</label>
            <input style={s.input} value={form.pointName} readOnly />

            <label style={s.label}>Lokasi</label>
            <input style={s.input} value={form.lokasi} readOnly />

            <label style={s.label}>Daerah</label>
            <input style={s.input} value={form.daerah} readOnly />

            <label style={s.label}>Radius Area (maks 100 m)</label>
            <input style={s.input} value={form.radius} readOnly />
          </div>

          <div style={s.card} className="glass">
            <h3 style={s.sectionTitle}>Kandungan Daun (%)</h3>

            <div style={s.readonlyRow}>
              <div style={s.readonlyItem}>
                <div style={s.readonlyLabel}>Nitrogen (N)</div>
                <div style={s.readonlyValue}>{form.n || '-'}</div>
                <div style={s.sourceBadge}>{form.nSource || '-'}</div>
              </div>

              <div style={s.readonlyItem}>
                <div style={s.readonlyLabel}>Fosfor (P)</div>
                <div style={s.readonlyValue}>{form.p || '-'}</div>
                <div style={s.sourceBadge}>{form.pSource || '-'}</div>
              </div>

              <div style={s.readonlyItem}>
                <div style={s.readonlyLabel}>Kalium (K)</div>
                <div style={s.readonlyValue}>{form.k || '-'}</div>
                <div style={s.sourceBadge}>{form.kSource || '-'}</div>
              </div>

              <div style={s.readonlyItem}>
                <div style={s.readonlyLabel}>Magnesium (Mg)</div>
                <div style={s.readonlyValue}>{form.mg || '-'}</div>
                <div style={s.sourceBadge}>{form.mgSource || '-'}</div>
              </div>
            </div>

            <div style={s.noteText}>
              N dan Mg diambil otomatis dari GeoJSON berdasarkan lokasi titik. P dan K sementara memakai nilai default sistem sampai file GeoJSON tersedia.
            </div>
          </div>

          <div style={s.card} className="glass">
            <h3 style={s.sectionTitle}>Input Produksi</h3>

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

            <div style={s.buttonRow}>
              <button style={s.primaryBtn} onClick={hitung}>
                Hitung
              </button>
              <button style={s.saveBtn} onClick={simpan}>
                Hitung & Simpan
              </button>
            </div>
          </div>
        </div>

        <div style={s.rightCol}>
          <div style={s.card} className="glass">
            <div style={s.resultHeader}>
              <h3 style={s.sectionTitle}>Hasil Perhitungan</h3>
              {selectedHistoryId && <span style={s.historyBadge}>Data tersimpan</span>}
            </div>

            {!result ? (
              <div style={s.empty}>Belum ada hasil perhitungan.</div>
            ) : (
              <>
                <div style={s.summaryGrid}>
                  <div style={s.summaryCard}>
                    <div style={s.summaryLabel}>Aplikasi I</div>
                    <div style={s.summaryValue}>{result.summary.aplikasi1_total}</div>
                  </div>

                  <div style={s.summaryCard}>
                    <div style={s.summaryLabel}>Aplikasi II</div>
                    <div style={s.summaryValue}>{result.summary.aplikasi2_total}</div>
                  </div>

                  <div style={s.summaryCard}>
                    <div style={s.summaryLabel}>Total Rekomendasi</div>
                    <div style={s.summaryValue}>{result.summary.total_rekomendasi}</div>
                  </div>
                </div>

                <div style={s.detailTableWrap}>
                  <div style={s.detailTitle}>Rincian Per Jenis Pupuk</div>
                  <table style={s.detailTable}>
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
                        <td>{Number(result.aplikasi1.urea) + Number(result.aplikasi2.urea)}</td>
                      </tr>
                      <tr>
                        <td>TSP</td>
                        <td>{result.aplikasi1.tsp}</td>
                        <td>{result.aplikasi2.tsp}</td>
                        <td>{Number(result.aplikasi1.tsp) + Number(result.aplikasi2.tsp)}</td>
                      </tr>
                      <tr>
                        <td>KCl</td>
                        <td>{result.aplikasi1.kcl}</td>
                        <td>{result.aplikasi2.kcl}</td>
                        <td>{Number(result.aplikasi1.kcl) + Number(result.aplikasi2.kcl)}</td>
                      </tr>
                      <tr>
                        <td>Dolomit</td>
                        <td>{result.aplikasi1.dolomit}</td>
                        <td>{result.aplikasi2.dolomit}</td>
                        <td>{Number(result.aplikasi1.dolomit) + Number(result.aplikasi2.dolomit)}</td>
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

                <div style={s.rekomendasiCard}>
                  <h4 style={s.rekomendasiTitle}>Rekomendasi Tindakan</h4>
                  <div style={s.rekomendasiList}>
                    {result.recommendations?.length ? (
                      result.recommendations.map((item, idx) => (
                        <div key={idx} style={s.rekomendasiItem}>
                          <span style={s.rekomendasiDot}>✓</span>
                          <span>{item}</span>
                        </div>
                      ))
                    ) : (
                      <div style={s.empty}>Belum ada rekomendasi.</div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          <div style={s.card} className="glass">
            <h3 style={s.sectionTitle}>Riwayat Analisis</h3>

            {!form.pointId ? (
              <div style={s.empty}>Pilih titik/lahan terlebih dahulu untuk melihat riwayat analisis.</div>
            ) : filteredHistory.length === 0 ? (
              <div style={s.empty}>Belum ada riwayat analisis untuk titik yang dipilih.</div>
            ) : (
              filteredHistory.map((item) => (
                <div
                  key={item.id}
                  style={{
                    ...s.historyItem,
                    border:
                      selectedHistoryId === item.id
                        ? '1px solid rgba(96,165,250,0.35)'
                        : '1px solid transparent',
                  }}
                >
                  <div style={s.historyTop}>
                    <div>
                      <div style={s.historyTitle}>{item.point_name || 'Tanpa titik'}</div>
                      <div style={s.historyMeta}>
                        {item.lokasi || '-'} · {item.daerah || '-'} · Radius {item.radius || 0} m
                      </div>
                    </div>

                    <button style={s.viewBtn} onClick={() => showHistoryDetail(item)}>
                      Lihat Detail
                    </button>
                  </div>

                  <div style={s.historyBlock}>
                    <div style={s.historySubTitle}>Aplikasi I</div>
                    <div style={s.historyLine}>
                      Urea: {item.urea_app1} | TSP: {item.tsp_app1} | KCl: {item.kcl_app1} | Dolomit: {item.dolomit_app1} | Total: {item.aplikasi1_total}
                    </div>
                  </div>

                  <div style={s.historyBlock}>
                    <div style={s.historySubTitle}>Aplikasi II</div>
                    <div style={s.historyLine}>
                      Urea: {item.urea_app2} | TSP: {item.tsp_app2} | KCl: {item.kcl_app2} | Dolomit: {item.dolomit_app2} | Total: {item.aplikasi2_total}
                    </div>
                  </div>

                  <div style={s.historyTotal}>
                    Total Rekomendasi: {item.total_rekomendasi}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const s = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #040816 0%, #07111f 45%, #081625 100%)',
    color: '#fff',
    padding: 24,
    fontFamily: 'Inter, system-ui, sans-serif',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 18,
    flexWrap: 'wrap',
    marginBottom: 20,
    alignItems: 'flex-start',
  },
  kicker: {
    fontSize: 11,
    letterSpacing: 2,
    color: '#95a3b8',
    marginBottom: 8,
  },
  title: {
    margin: 0,
    fontSize: 40,
    letterSpacing: '-1px',
  },
  desc: {
    marginTop: 12,
    color: 'rgba(255,255,255,0.68)',
    lineHeight: 1.8,
    maxWidth: 760,
  },
  layout: {
    display: 'grid',
    gridTemplateColumns: '430px 1fr',
    gap: 16,
  },
  leftCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  rightCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  card: {
    padding: 22,
    borderRadius: 22,
  },
  sectionTitle: {
    marginTop: 0,
    marginBottom: 14,
    fontSize: 24,
  },
  label: {
    display: 'block',
    marginTop: 14,
    marginBottom: 8,
    color: 'rgba(255,255,255,0.82)',
    fontWeight: 600,
  },
  input: {
    width: '100%',
    padding: '14px 16px',
    borderRadius: 16,
    border: '1px solid rgba(255,255,255,0.08)',
    background: '#101a2d',
    color: '#fff',
    outline: 'none',
  },
  readonlyRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 12,
  },
  readonlyItem: {
    padding: 14,
    borderRadius: 16,
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.05)',
  },
  readonlyLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    marginBottom: 6,
  },
  readonlyValue: {
    fontSize: 22,
    fontWeight: 800,
    marginBottom: 8,
  },
  sourceBadge: {
    display: 'inline-block',
    padding: '4px 8px',
    borderRadius: 999,
    background: 'rgba(96,165,250,0.14)',
    border: '1px solid rgba(96,165,250,0.25)',
    color: '#60a5fa',
    fontSize: 12,
    fontWeight: 700,
    textTransform: 'capitalize',
  },
  noteText: {
    marginTop: 14,
    color: 'rgba(255,255,255,0.6)',
    lineHeight: 1.7,
  },
  buttonRow: {
    display: 'flex',
    gap: 10,
    marginTop: 18,
    flexWrap: 'wrap',
  },
  primaryBtn: {
    padding: '12px 16px',
    borderRadius: 14,
    border: 'none',
    background: '#2563eb',
    color: '#fff',
    cursor: 'pointer',
    fontWeight: 700,
  },
  saveBtn: {
    padding: '12px 16px',
    borderRadius: 14,
    border: 'none',
    background: '#16a34a',
    color: '#fff',
    cursor: 'pointer',
    fontWeight: 700,
  },
  secondaryBtn: {
    padding: '12px 16px',
    borderRadius: 14,
    border: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(255,255,255,0.04)',
    color: '#fff',
    cursor: 'pointer',
    fontWeight: 600,
  },
  resultHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 10,
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  historyBadge: {
    padding: '6px 10px',
    borderRadius: 999,
    background: 'rgba(34,197,94,0.14)',
    border: '1px solid rgba(34,197,94,0.25)',
    color: '#22c55e',
    fontSize: 12,
    fontWeight: 700,
  },
  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0,1fr))',
    gap: 12,
    marginBottom: 18,
  },
  summaryCard: {
    padding: 18,
    borderRadius: 18,
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.05)',
  },
  summaryLabel: {
    color: 'rgba(255,255,255,0.56)',
    fontSize: 13,
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 28,
    fontWeight: 800,
  },
  detailTableWrap: {
    marginTop: 8,
    marginBottom: 18,
    overflowX: 'auto',
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: 700,
    marginBottom: 12,
  },
  detailTable: {
    width: '100%',
    borderCollapse: 'collapse',
    background: 'rgba(255,255,255,0.02)',
    borderRadius: 16,
    overflow: 'hidden',
  },
  totalRow: {
    fontWeight: 800,
    background: 'rgba(96,165,250,0.08)',
  },
  rekomendasiCard: {
    marginTop: 8,
    padding: 16,
    borderRadius: 18,
    background: 'rgba(34,197,94,0.07)',
    border: '1px solid rgba(34,197,94,0.14)',
  },
  rekomendasiTitle: {
    marginTop: 0,
    marginBottom: 12,
    fontSize: 20,
    color: '#86efac',
  },
  rekomendasiList: {
    display: 'grid',
    gap: 10,
  },
  rekomendasiItem: {
    display: 'flex',
    gap: 10,
    alignItems: 'flex-start',
    color: 'rgba(255,255,255,0.88)',
    lineHeight: 1.7,
  },
  rekomendasiDot: {
    color: '#4ade80',
    fontWeight: 800,
    marginTop: 1,
  },
  empty: {
    color: 'rgba(255,255,255,0.45)',
  },
  historyItem: {
    padding: 16,
    borderRadius: 16,
    background: 'rgba(255,255,255,0.02)',
    marginBottom: 12,
  },
  historyTop: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 12,
    flexWrap: 'wrap',
    alignItems: 'center',
    marginBottom: 10,
  },
  viewBtn: {
    padding: '10px 14px',
    borderRadius: 12,
    border: 'none',
    background: '#2563eb',
    color: '#fff',
    cursor: 'pointer',
    fontWeight: 700,
  },
  historyTitle: {
    fontWeight: 700,
    fontSize: 18,
  },
  historyMeta: {
    marginTop: 4,
    color: 'rgba(255,255,255,0.56)',
  },
  historyBlock: {
    marginTop: 10,
    padding: 12,
    borderRadius: 12,
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.05)',
  },
  historySubTitle: {
    fontSize: 13,
    fontWeight: 700,
    marginBottom: 6,
    color: '#93c5fd',
  },
  historyLine: {
    color: 'rgba(255,255,255,0.82)',
    lineHeight: 1.7,
  },
  historyTotal: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    background: 'rgba(34,197,94,0.08)',
    border: '1px solid rgba(34,197,94,0.14)',
    fontWeight: 700,
    color: '#bbf7d0',
  },
};

const css = `
  * { box-sizing: border-box; }

  .glass {
    background: rgba(10,18,35,0.86);
    border: 1px solid rgba(255,255,255,0.08);
    backdrop-filter: blur(14px);
    box-shadow: 0 18px 60px rgba(0,0,0,0.24);
  }

  select, option {
    background: #101a2d;
    color: #fff;
  }

  table th, table td {
    padding: 14px 12px;
    border-bottom: 1px solid rgba(255,255,255,0.08);
    text-align: left;
  }

  table th {
    color: rgba(255,255,255,0.72);
    font-size: 14px;
  }

  table td {
    color: rgba(255,255,255,0.9);
  }

  @media (max-width: 980px) {
    div[style*="grid-template-columns: 430px 1fr"] {
      grid-template-columns: 1fr !important;
    }

    div[style*="grid-template-columns: repeat(3, minmax(0,1fr))"] {
      grid-template-columns: 1fr !important;
    }

    div[style*="grid-template-columns: 1fr 1fr"] {
      grid-template-columns: 1fr !important;
    }
  }
`;