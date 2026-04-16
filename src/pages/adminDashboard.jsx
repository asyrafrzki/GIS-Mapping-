import React, { useEffect, useState } from 'react';
import { apiRequest } from '../services/api';

export default function AdminDashboard({ token, currentUser, onLogout }) {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalPoints: 0,
    totalReports: 0,
    pendingReports: 0,
  });
  const [reports, setReports] = useState([]);

  const loadData = async () => {
    try {
      const [dashboardData, reportData] = await Promise.all([
        apiRequest('/dashboard/admin', { token }),
        apiRequest('/reports/admin', { token }),
      ]);
      setStats(dashboardData);
      setReports(reportData);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadData();
  }, [token]);

  const updateStatus = async (id, status) => {
    try {
      await apiRequest(`/reports/admin/${id}`, {
        method: 'PUT',
        token,
        body: { status, adminNote: '' },
      });
      loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div>
          <div style={s.kicker}>ADMIN DASHBOARD</div>
          <h1>Halo, {currentUser.name}</h1>
          <p>Kelola laporan user dan pantau aktivitas sistem.</p>
        </div>
        <button style={s.logout} onClick={onLogout}>Logout</button>
      </div>

      <div style={s.grid}>
        <Card title="Total User" value={stats.totalUsers} />
        <Card title="Total Titik" value={stats.totalPoints} />
        <Card title="Total Laporan" value={stats.totalReports} />
        <Card title="Laporan Pending" value={stats.pendingReports} />
      </div>

      <div style={s.card}>
        <h3>Semua Laporan</h3>
        {reports.length === 0 ? (
          <div>Belum ada laporan.</div>
        ) : (
          reports.map((r) => (
            <div key={r.id} style={s.reportItem}>
              <div>
                <strong>{r.title}</strong> — {r.user_name} ({r.user_email})
                <div style={s.meta}>{r.category} · {r.status}</div>
                <div style={s.msg}>{r.message}</div>
              </div>
              <div style={s.row}>
                <button style={s.btn} onClick={() => updateStatus(r.id, 'diproses')}>Diproses</button>
                <button style={s.btn} onClick={() => updateStatus(r.id, 'selesai')}>Selesai</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function Card({ title, value }) {
  return (
    <div style={s.card}>
      <div style={s.value}>{value}</div>
      <div>{title}</div>
    </div>
  );
}

const s = {
  page: { minHeight: '100vh', background: '#0a0a12', color: '#fff', padding: 20 },
  header: { display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 20 },
  kicker: { fontSize: 11, letterSpacing: 2, color: '#9ca3af' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 },
  card: { padding: 18, borderRadius: 16, background: '#111625', border: '1px solid rgba(255,255,255,0.08)' },
  value: { fontSize: 32, fontWeight: 800, color: '#60a5fa' },
  logout: { padding: '10px 14px', borderRadius: 10, border: 'none', background: '#7f1d1d', color: '#fff', cursor: 'pointer' },
  reportItem: { padding: 14, borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' },
  meta: { color: '#9ca3af', fontSize: 13, marginTop: 4 },
  msg: { marginTop: 8, color: '#d1d5db' },
  row: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  btn: { padding: '9px 12px', borderRadius: 10, border: 'none', background: '#374151', color: '#fff', cursor: 'pointer' },
};