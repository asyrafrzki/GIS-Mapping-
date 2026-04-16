import React, { useEffect, useState } from 'react';
import { apiRequest } from '../services/api';

function badgeStyle(status) {
  if (status === 'selesai') {
    return { background: 'rgba(34,197,94,0.14)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.25)' };
  }
  if (status === 'diproses') {
    return { background: 'rgba(251,191,36,0.14)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.25)' };
  }
  return { background: 'rgba(96,165,250,0.14)', color: '#60a5fa', border: '1px solid rgba(96,165,250,0.25)' };
}

export default function UserDashboard({ token, currentUser, onNavigate, onLogout }) {
  const [data, setData] = useState({
    totalPoints: 0,
    totalReports: 0,
    latestPoints: [],
    latestReports: [],
  });

  useEffect(() => {
    apiRequest('/dashboard/user', { token })
      .then(setData)
      .catch(console.error);
  }, [token]);

  return (
    <div style={s.page}>
      <style>{css}</style>

      <div style={s.topBar}>
        <div>
          <div style={s.kicker}>USER DASHBOARD</div>
          <h1 style={s.title}>Halo, {currentUser.name}</h1>
          <p style={s.desc}>
            Pantau lahan, titik digitasi, dan status laporanmu dalam satu tampilan.
          </p>
        </div>

        <div style={s.navRow}>
          <button style={s.secondaryBtn} onClick={() => onNavigate('map')}>Peta</button>
          <button style={s.secondaryBtn} onClick={() => onNavigate('digitasi')}>Digitasi</button>
          <button style={s.secondaryBtn} onClick={() => onNavigate('laporan')}>Laporan</button>
          <button style={s.dangerBtn} onClick={onLogout}>Logout</button>
        </div>
      </div>

      <div style={s.summaryGrid}>
        <div style={s.summaryCard} className="glass">
          <div style={s.summaryValue}>{data.totalPoints}</div>
          <div style={s.summaryLabel}>Titik Lahan Saya</div>
        </div>
        <div style={s.summaryCard} className="glass">
          <div style={{ ...s.summaryValue, color: '#60a5fa' }}>{data.totalReports}</div>
          <div style={s.summaryLabel}>Laporan Saya</div>
        </div>
      </div>

      <div style={s.contentGrid}>
        <div style={s.card} className="glass">
          <div style={s.cardHeader}>
            <h3 style={s.cardTitle}>Titik Terbaru</h3>
            <button style={s.linkBtn} onClick={() => onNavigate('digitasi')}>Lihat semua</button>
          </div>

          {data.latestPoints.length === 0 ? (
            <div style={s.empty}>Belum ada titik digitasi.</div>
          ) : (
            data.latestPoints.map((p) => (
              <div key={p.id} style={s.itemRow}>
                <div>
                  <div style={s.itemTitle}>{p.nama}</div>
                  <div style={s.itemMeta}>
                    {p.jenis} · {p.lokasi || '-'} · {p.daerah || '-'}
                  </div>
                  <div style={s.itemSub}>
                    {p.tanah_user ? `Tanah: ${p.tanah_user}` : `Radius: ${p.radius} m`}
                  </div>
                </div>
                <span style={s.simpleBadge}>{p.radius} m</span>
              </div>
            ))
          )}
        </div>

        <div style={s.card} className="glass">
          <div style={s.cardHeader}>
            <h3 style={s.cardTitle}>Laporan Terbaru</h3>
            <button style={s.linkBtn} onClick={() => onNavigate('laporan')}>Kelola laporan</button>
          </div>

          {data.latestReports.length === 0 ? (
            <div style={s.empty}>Belum ada laporan.</div>
          ) : (
            data.latestReports.map((r) => (
              <div key={r.id} style={s.itemRow}>
                <div>
                  <div style={s.itemTitle}>{r.title}</div>
                  <div style={s.itemMeta}>{r.category}</div>
                </div>
                <span style={{ ...s.statusBadge, ...badgeStyle(r.status) }}>
                  {r.status}
                </span>
              </div>
            ))
          )}
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
  navRow: {
    display: 'flex',
    gap: 10,
    flexWrap: 'wrap',
  },
  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0,1fr))',
    gap: 16,
    marginBottom: 18,
  },
  summaryCard: {
    padding: 22,
    borderRadius: 22,
  },
  summaryValue: {
    fontSize: 38,
    fontWeight: 800,
    color: '#4ade80',
  },
  summaryLabel: {
    marginTop: 8,
    color: 'rgba(255,255,255,0.62)',
    fontSize: 15,
  },
  contentGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 16,
  },
  card: {
    padding: 22,
    borderRadius: 22,
    minHeight: 340,
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 10,
    alignItems: 'center',
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  cardTitle: {
    margin: 0,
    fontSize: 24,
  },
  itemRow: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 14,
    alignItems: 'flex-start',
    padding: '14px 0',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
  },
  itemTitle: {
    fontWeight: 700,
    fontSize: 16,
  },
  itemMeta: {
    marginTop: 4,
    color: 'rgba(255,255,255,0.56)',
    fontSize: 14,
  },
  itemSub: {
    marginTop: 6,
    color: 'rgba(255,255,255,0.72)',
    fontSize: 14,
  },
  simpleBadge: {
    padding: '7px 10px',
    borderRadius: 999,
    background: 'rgba(168,85,247,0.14)',
    color: '#c084fc',
    border: '1px solid rgba(168,85,247,0.22)',
    fontSize: 12,
    fontWeight: 700,
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
  linkBtn: {
    border: 'none',
    background: 'transparent',
    color: '#60a5fa',
    cursor: 'pointer',
    fontWeight: 700,
  },
  secondaryBtn: {
    padding: '11px 15px',
    borderRadius: 14,
    border: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(255,255,255,0.04)',
    color: '#fff',
    cursor: 'pointer',
    fontWeight: 600,
  },
  dangerBtn: {
    padding: '11px 15px',
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

  @media (max-width: 920px) {
    div[style*="grid-template-columns: repeat(2, minmax(0,1fr))"],
    div[style*="grid-template-columns: 1fr 1fr"] {
      grid-template-columns: 1fr !important;
    }
  }
`;