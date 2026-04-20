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

  const mapHistoryRowToResult = (row) => {
    if (!row) return null;

    return {
      produksi: Number(row.produksi),
      prodPerPohon: Number(row.prod_per_pohon),
      prod_n: Number(row.prod_n),
      prod_p: Number(row.prod_p),
      prod_k: Number(row.prod_k),
      prod_mg: Number(row.prod_mg),
      bio_n: Number(row.bio_n),
      bio_p: Number(row.bio_p),
      bio_k: Number(row.bio_k),
      bio_mg: Number(row.bio_mg),
      urea_awal: Number(row.urea_awal),
      tsp_awal: Number(row.tsp_awal),
      kcl_awal: Number(row.kcl_awal),
      dolomit_awal: Number(row.dolomit_awal),
      urea_akhir: Number(row.urea_akhir),
      tsp_akhir: Number(row.tsp_akhir),
      kcl_akhir: Number(row.kcl_akhir),
      dolomit_akhir: Number(row.dolomit_akhir),
      aplikasi1: {
        urea: Number(row.urea_app1),
        tsp: Number(row.tsp_app1),
        kcl: Number(row.kcl_app1),
        dolomit: Number(row.dolomit_app1),
      },
      aplikasi2: {
        urea: Number(row.urea_app2),
        tsp: Number(row.tsp_app2),
        kcl: Number(row.kcl_app2),
        dolomit: Number(row.dolomit_app2),
      },
    };
  };

  const fillFormFromHistory = (row) => {
    setForm({
      pointId: row.point_id ? String(row.point_id) : '',
      pointName: row.point_name || '',
      lokasi: row.lokasi || '',
      daerah: row.daerah || '',
      radius: row.radius || '',
      n: row.n ?? '',
      p: row.p ?? '',
      k: row.k ?? '',
      mg: row.mg ?? '',
      umur: row.umur ?? '',
      luas: row.luas ?? '',
      protas: row.protas ?? '',
      jumlahPohon: row.jumlah_pohon ?? '',
    });
  };

  const handleSelectPoint = async (id) => {
    const point = points.find((item) => String(item.id) === String(id));

    if (!point) {
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
        umur: '',
        luas: '',
        protas: '',
        jumlahPohon: '',
      });
      setResult(null);
      setSelectedHistoryId(null);
      return;
    }

    setForm((prev) => ({
      ...prev,
      pointId: String(point.id),
      pointName: point.nama || '',
      lokasi: point.lokasi || '',
      daerah: point.daerah || '',
      radius: point.radius || '',
    }));

    setSelectedHistoryId(null);

    try {
      const latest = await apiRequest(`/analisis-tanah/point/${point.id}/latest`, {
        token,
      });

      if (latest) {
        fillFormFromHistory(latest);
        setResult(mapHistoryRowToResult(latest));
        setSelectedHistoryId(latest.id);
      } else {
        setResult(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const hitung = async () => {
    try {
      const data = await apiRequest('/analisis-tanah/calculate', {
        method: 'POST',
        token,
        body: {
          n: Number(form.n),
          p: Number(form.p),
          k: Number(form.k),
          mg: Number(form.mg),
          umur: Number(form.umur),
          luas: Number(form.luas),
          protas: Number(form.protas),
          jumlahPohon: Number(form.jumlahPohon),
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
          pointId: form.pointId ? Number(form.pointId) : null,
          n: Number(form.n),
          p: Number(form.p),
          k: Number(form.k),
          mg: Number(form.mg),
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
    fillFormFromHistory(item);
    setResult(mapHistoryRowToResult(item));
    setSelectedHistoryId(item.id);
  };

  return (
    <div style={s.page}>
      <style>{css}</style>

      <div style={s.header}>
        <div>
          <div style={s.kicker}>ANALISIS TANAH</div>
          <h1 style={s.title}>Perhitungan Dosis Berbasis Titik & Radius</h1>
          <p style={s.desc}>
            Pilih titik lahan, isi kandungan unsur tanah, lalu hitung rekomendasi dosis pupuk beserta detail perhitungannya.
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

            <label style={s.label}>Radius Area</label>
            <input style={s.input} value={form.radius} readOnly />
          </div>

          <div style={s.card} className="glass">
            <h3 style={s.sectionTitle}>Input Kandungan Tanah</h3>

            <label style={s.label}>N</label>
            <input style={s.input} value={form.n} onChange={(e) => setForm({ ...form, n: e.target.value })} />

            <label style={s.label}>P</label>
            <input style={s.input} value={form.p} onChange={(e) => setForm({ ...form, p: e.target.value })} />

            <label style={s.label}>K</label>
            <input style={s.input} value={form.k} onChange={(e) => setForm({ ...form, k: e.target.value })} />

            <label style={s.label}>Mg</label>
            <input style={s.input} value={form.mg} onChange={(e) => setForm({ ...form, mg: e.target.value })} />
          </div>

          <div style={s.card} className="glass">
            <h3 style={s.sectionTitle}>Input Produksi</h3>

            <label style={s.label}>Umur</label>
            <input style={s.input} value={form.umur} onChange={(e) => setForm({ ...form, umur: e.target.value })} />

            <label style={s.label}>Luas</label>
            <input style={s.input} value={form.luas} onChange={(e) => setForm({ ...form, luas: e.target.value })} />

            <label style={s.label}>Protas</label>
            <input style={s.input} value={form.protas} onChange={(e) => setForm({ ...form, protas: e.target.value })} />

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
                <div style={s.resultGrid}>
                  <div style={s.resultBox}>
                    <div style={s.resultLabel}>Produksi</div>
                    <div style={s.resultValue}>{result.produksi.toFixed(2)}</div>
                  </div>
                  <div style={s.resultBox}>
                    <div style={s.resultLabel}>Produksi/Pohon</div>
                    <div style={s.resultValue}>{result.prodPerPohon.toFixed(2)}</div>
                  </div>
                </div>

                <div style={s.subSection}>
                  <h4 style={s.subTitle}>Detail Prod</h4>
                  <div style={s.detailGrid}>
                    <div>Prod N: {result.prod_n.toFixed(2)}</div>
                    <div>Prod P: {result.prod_p.toFixed(2)}</div>
                    <div>Prod K: {result.prod_k.toFixed(2)}</div>
                    <div>Prod Mg: {result.prod_mg.toFixed(2)}</div>
                  </div>
                </div>

                <div style={s.subSection}>
                  <h4 style={s.subTitle}>Detail Bio</h4>
                  <div style={s.detailGrid}>
                    <div>Bio N: {result.bio_n.toFixed(2)}</div>
                    <div>Bio P: {result.bio_p.toFixed(2)}</div>
                    <div>Bio K: {result.bio_k.toFixed(2)}</div>
                    <div>Bio Mg: {result.bio_mg.toFixed(2)}</div>
                  </div>
                </div>

                <div style={s.tableWrap}>
                  <table style={s.table}>
                    <thead>
                      <tr>
                        <th>Pupuk</th>
                        <th>Awal</th>
                        <th>Akhir</th>
                        <th>Aplikasi 1</th>
                        <th>Aplikasi 2</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>Urea</td>
                        <td>{result.urea_awal}</td>
                        <td>{result.urea_akhir}</td>
                        <td>{result.aplikasi1.urea}</td>
                        <td>{result.aplikasi2.urea}</td>
                      </tr>
                      <tr>
                        <td>TSP</td>
                        <td>{result.tsp_awal}</td>
                        <td>{result.tsp_akhir}</td>
                        <td>{result.aplikasi1.tsp}</td>
                        <td>{result.aplikasi2.tsp}</td>
                      </tr>
                      <tr>
                        <td>KCl</td>
                        <td>{result.kcl_awal}</td>
                        <td>{result.kcl_akhir}</td>
                        <td>{result.aplikasi1.kcl}</td>
                        <td>{result.aplikasi2.kcl}</td>
                      </tr>
                      <tr>
                        <td>Dolomit</td>
                        <td>{result.dolomit_awal}</td>
                        <td>{result.dolomit_akhir}</td>
                        <td>{result.aplikasi1.dolomit}</td>
                        <td>{result.aplikasi2.dolomit}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>

          <div style={s.card} className="glass">
            <h3 style={s.sectionTitle}>Riwayat Analisis</h3>

            {history.length === 0 ? (
              <div style={s.empty}>Belum ada riwayat analisis.</div>
            ) : (
              history.map((item) => (
                <div
                  key={item.id}
                  style={{
                    ...s.historyItem,
                    border:
                      selectedHistoryId === item.id
                        ? '1px solid rgba(96,165,250,0.35)'
                        : '1px solid transparent',
                    borderRadius: 14,
                    padding: 14,
                    marginBottom: 10,
                    background:
                      selectedHistoryId === item.id
                        ? 'rgba(96,165,250,0.06)'
                        : 'rgba(255,255,255,0.01)',
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

                  <div style={s.historyDose}>
                    Urea {item.urea_akhir} | TSP {item.tsp_akhir} | KCl {item.kcl_akhir} | Dolomit {item.dolomit_akhir}
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
  viewBtn: {
    padding: '10px 14px',
    borderRadius: 12,
    border: 'none',
    background: '#2563eb',
    color: '#fff',
    cursor: 'pointer',
    fontWeight: 700,
  },
  empty: {
    color: 'rgba(255,255,255,0.45)',
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
  resultGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 12,
    marginBottom: 16,
  },
  resultBox: {
    padding: 14,
    borderRadius: 16,
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.05)',
  },
  resultLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.56)',
    marginBottom: 6,
  },
  resultValue: {
    fontSize: 22,
    fontWeight: 800,
  },
  subSection: {
    marginBottom: 16,
  },
  subTitle: {
    marginBottom: 10,
  },
  detailGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 10,
    color: 'rgba(255,255,255,0.82)',
  },
  tableWrap: {
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  historyItem: {},
  historyTop: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 12,
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  historyTitle: {
    fontWeight: 700,
    fontSize: 16,
  },
  historyMeta: {
    marginTop: 4,
    color: 'rgba(255,255,255,0.56)',
  },
  historyDose: {
    marginTop: 8,
    color: 'rgba(255,255,255,0.82)',
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

  table th, table td {
    padding: 12px;
    border-bottom: 1px solid rgba(255,255,255,0.08);
    text-align: left;
  }

  select, option {
    background: #101a2d;
    color: #fff;
  }

  @media (max-width: 980px) {
    div[style*="grid-template-columns: 430px 1fr"] {
      grid-template-columns: 1fr !important;
    }
  }
`;