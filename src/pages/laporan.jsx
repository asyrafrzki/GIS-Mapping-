import React, { useEffect, useState } from 'react';
import { apiRequest } from '../services/api';

function statusStyle(status) {
  if (status === 'selesai') {
    return {
      background: 'rgba(34,197,94,0.14)',
      color: '#22c55e',
      border: '1px solid rgba(34,197,94,0.25)',
    };
  }

  if (status === 'diproses') {
    return {
      background: 'rgba(251,191,36,0.14)',
      color: '#fbbf24',
      border: '1px solid rgba(251,191,36,0.25)',
    };
  }

  return {
    background: 'rgba(96,165,250,0.14)',
    color: '#60a5fa',
    border: '1px solid rgba(96,165,250,0.25)',
  };
}

export default function LaporanPage({ token, onNavigate }) {
  const [reports, setReports] = useState([]);

  const loadReports = async () => {
    try {
      const data = await apiRequest('/reports/me', { token });
      setReports(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadReports();
  }, [token]);

  const removeReport = async (id) => {
    const ok = window.confirm('Hapus laporan ini?');
    if (!ok) return;

    try {
      await apiRequest(`/reports/me/${id}`, {
        method: 'DELETE',
        token,
      });
      loadReports();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div style={s.page}>
      <style>{css}</style>

      <div style={s.topBar}>
        <div>
          <div style={s.kicker}>STATUS LAPORAN</div>
          <h1 style={s.title}>Laporan Masalah Lahan</h1>
          <p style={s.desc}>
            Laporan dibuat dari titik masalah lahan yang sudah kamu kirim dari halaman digitasi.
          </p>
        </div>

        <button style={s.secondaryBtn} onClick={() => onNavigate('user-dashboard')}>
          ← Kembali
        </button>
      </div>

      <div style={s.card} className="glass">
        <h3 style={s.cardTitle}>Daftar Status Laporan</h3>

        {reports.length === 0 ? (
          <div style={s.empty}>Belum ada laporan yang dikirim.</div>
        ) : (
          reports.map((r) => (
            <div key={r.id} style={s.reportItem}>
              <div style={s.reportTop}>
                <div>
                  <div style={s.reportTitle}>{r.title}</div>
                  <div style={s.reportMeta}>
                    {r.point_name || '-'} · {r.lokasi || '-'} · {r.daerah || '-'}
                  </div>
                </div>

                <span style={{ ...s.statusBadge, ...statusStyle(r.status) }}>
                  {r.status}
                </span>
              </div>

              <div style={s.processBox}>
                <strong>Status saat ini:</strong>{' '}
                {r.status === 'menunggu persetujuan'
                  ? 'Laporan menunggu persetujuan admin'
                  : r.status === 'diproses'
                  ? 'Laporan sedang diproses admin'
                  : 'Laporan sudah selesai ditindaklanjuti'}
              </div>

              <div style={s.reportMessage}>
                {r.message}
              </div>

              <div style={s.reportActions}>
                <button style={s.dangerBtn} onClick={() => removeReport(r.id)}>
                  Hapus
                </button>
              </div>
            </div>
          ))
        )}
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
  topBar: {
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
    maxWidth: 700,
  },
  card: {
    padding: 22,
    borderRadius: 22,
  },
  cardTitle: {
    marginTop: 0,
    marginBottom: 14,
    fontSize: 24,
  },
  reportItem: {
    padding: '16px 0',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
  },
  reportTop: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 14,
    flexWrap: 'wrap',
    alignItems: 'flex-start',
  },
  reportTitle: {
    fontWeight: 700,
    fontSize: 17,
  },
  reportMeta: {
    marginTop: 4,
    color: 'rgba(255,255,255,0.54)',
    fontSize: 14,
  },
  processBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 14,
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.06)',
    color: 'rgba(255,255,255,0.72)',
  },
  reportMessage: {
    marginTop: 12,
    color: 'rgba(255,255,255,0.82)',
    lineHeight: 1.8,
    whiteSpace: 'pre-wrap',
  },
  reportActions: {
    display: 'flex',
    gap: 10,
    marginTop: 14,
    flexWrap: 'wrap',
  },
  statusBadge: {
    padding: '7px 10px',
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 700,
    textTransform: 'capitalize',
  },
  empty: {
    color: 'rgba(255,255,255,0.38)',
    padding: '20px 0',
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
  dangerBtn: {
    padding: '12px 16px',
    borderRadius: 14,
    border: 'none',
    background: '#991b1b',
    color: '#fff',
    cursor: 'pointer',
    fontWeight: 700,
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
`;