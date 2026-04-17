import React, { useEffect, useMemo, useState } from 'react';
import { apiRequest } from '../services/api';

function getStatusStyle(status) {
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

  if (status === 'ditolak') {
    return {
      background: 'rgba(239,68,68,0.14)',
      color: '#ef4444',
      border: '1px solid rgba(239,68,68,0.25)',
    };
  }

  return {
    background: 'rgba(96,165,250,0.14)',
    color: '#60a5fa',
    border: '1px solid rgba(96,165,250,0.25)',
  };
}

function StatCard({ title, value, accent, subtitle }) {
  return (
    <div style={{ ...s.statCard, ...accent }} className="glass">
      <div style={s.statValue}>{value}</div>
      <div style={s.statTitle}>{title}</div>
      {subtitle ? <div style={s.statSubtitle}>{subtitle}</div> : null}
    </div>
  );
}

export default function AdminDashboard({ token, currentUser, onLogout }) {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalPoints: 0,
    totalReports: 0,
    pendingReports: 0,
    processedReports: 0,
    completedReports: 0,
  });

  const [reports, setReports] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('semua');
  const [selectedNoteId, setSelectedNoteId] = useState(null);
  const [adminNoteDraft, setAdminNoteDraft] = useState('');

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

  const filteredReports = useMemo(() => {
    return reports.filter((r) => {
      const matchStatus =
        statusFilter === 'semua' ? true : r.status === statusFilter;

      const keyword = search.toLowerCase();
      const text = [
        r.title,
        r.user_name,
        r.user_email,
        r.point_name,
        r.lokasi,
        r.daerah,
        r.message,
      ]
        .join(' ')
        .toLowerCase();

      const matchSearch = keyword ? text.includes(keyword) : true;

      return matchStatus && matchSearch;
    });
  }, [reports, search, statusFilter]);

  const updateStatus = async (id, status, note = '') => {
    try {
      await apiRequest(`/reports/admin/${id}`, {
        method: 'PUT',
        token,
        body: {
          status,
          adminNote: note,
        },
      });

      if (selectedNoteId === id) {
        setSelectedNoteId(null);
        setAdminNoteDraft('');
      }

      loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  const openNoteEditor = (report) => {
    setSelectedNoteId(report.id);
    setAdminNoteDraft(report.admin_note || '');
  };

  return (
    <div style={s.page}>
      <style>{css}</style>

      <div style={s.header}>
        <div>
          <div style={s.kicker}>ADMIN DASHBOARD</div>
          <h1 style={s.title}>Halo, {currentUser.name}</h1>
          <p style={s.desc}>
            Kelola laporan user, pantau status tindak lanjut, dan monitoring aktivitas sistem secara menyeluruh.
          </p>
        </div>

        <div style={s.headerActions}>
          <button style={s.refreshBtn} onClick={loadData}>
            Refresh
          </button>
          <button style={s.logout} onClick={onLogout}>
            Logout
          </button>
        </div>
      </div>

      <div style={s.statsGrid}>
        <StatCard
          title="Total User"
          value={stats.totalUsers}
          subtitle="Pengguna aktif sistem"
          accent={{ borderLeft: '4px solid #60a5fa' }}
        />
        <StatCard
          title="Total Titik"
          value={stats.totalPoints}
          subtitle="Seluruh digitasi masuk"
          accent={{ borderLeft: '4px solid #22c55e' }}
        />
        <StatCard
          title="Total Laporan"
          value={stats.totalReports}
          subtitle="Semua laporan user"
          accent={{ borderLeft: '4px solid #a855f7' }}
        />
        <StatCard
          title="Menunggu Persetujuan"
          value={stats.pendingReports}
          subtitle="Perlu ditinjau admin"
          accent={{ borderLeft: '4px solid #fbbf24' }}
        />
        <StatCard
          title="Diproses"
          value={stats.processedReports}
          subtitle="Sedang ditangani"
          accent={{ borderLeft: '4px solid #fb923c' }}
        />
        <StatCard
          title="Selesai"
          value={stats.completedReports}
          subtitle="Sudah ditutup"
          accent={{ borderLeft: '4px solid #10b981' }}
        />
      </div>

      <div style={s.panel} className="glass">
        <div style={s.panelTop}>
          <div>
            <h3 style={s.panelTitle}>Manajemen Laporan</h3>
            <p style={s.panelDesc}>
              Filter, cari, dan ubah status laporan yang dikirim dari titik masalah lahan.
            </p>
          </div>
        </div>

        <div style={s.filterRow}>
          <input
            style={s.searchInput}
            placeholder="Cari judul, user, email, lokasi, daerah..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <select
            style={s.select}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="semua">Semua Status</option>
            <option value="menunggu persetujuan">Menunggu Persetujuan</option>
            <option value="diproses">Diproses</option>
            <option value="selesai">Selesai</option>
            <option value="ditolak">Ditolak</option>
          </select>
        </div>

        <div style={s.resultInfo}>
          Menampilkan <strong>{filteredReports.length}</strong> laporan
        </div>

        {filteredReports.length === 0 ? (
          <div style={s.emptyState}>Belum ada laporan yang sesuai filter.</div>
        ) : (
          filteredReports.map((r) => (
            <div key={r.id} style={s.reportCard}>
              <div style={s.reportTop}>
                <div style={{ flex: 1 }}>
                  <div style={s.reportTitle}>{r.title}</div>
                  <div style={s.reportMeta}>
                    {r.user_name} · {r.user_email}
                  </div>

                  <div style={s.badgeRow}>
                    <span style={s.typeBadge}>{r.category}</span>
                    <span style={{ ...s.statusBadge, ...getStatusStyle(r.status) }}>
                      {r.status}
                    </span>
                  </div>
                </div>
              </div>

              <div style={s.reportGrid}>
                <div style={s.infoCard}>
                  <div style={s.infoLabel}>Titik Masalah</div>
                  <div style={s.infoValue}>{r.point_name || '-'}</div>
                </div>

                <div style={s.infoCard}>
                  <div style={s.infoLabel}>Lokasi</div>
                  <div style={s.infoValue}>{r.lokasi || '-'}</div>
                </div>

                <div style={s.infoCard}>
                  <div style={s.infoLabel}>Daerah</div>
                  <div style={s.infoValue}>{r.daerah || '-'}</div>
                </div>

                <div style={s.infoCard}>
                  <div style={s.infoLabel}>Radius</div>
                  <div style={s.infoValue}>{r.radius ? `${r.radius} m` : '-'}</div>
                </div>
              </div>

              <div style={s.messageBox}>
                <div style={s.sectionLabel}>Isi Laporan</div>
                <div style={s.messageText}>{r.message}</div>
              </div>

              {r.deskripsi ? (
                <div style={s.messageBox}>
                  <div style={s.sectionLabel}>Deskripsi Masalah</div>
                  <div style={s.messageText}>{r.deskripsi}</div>
                </div>
              ) : null}

              <div style={s.noteBox}>
                <div style={s.sectionLabel}>Catatan Admin</div>
                <div style={s.noteText}>
                  {r.admin_note ? r.admin_note : 'Belum ada catatan admin.'}
                </div>
              </div>

              {selectedNoteId === r.id && (
                <div style={s.editorBox}>
                  <textarea
                    style={s.textarea}
                    placeholder="Tulis catatan admin..."
                    value={adminNoteDraft}
                    onChange={(e) => setAdminNoteDraft(e.target.value)}
                  />
                  <div style={s.editorActions}>
                    <button
                      style={s.saveBtn}
                      onClick={() => updateStatus(r.id, r.status, adminNoteDraft)}
                    >
                      Simpan Catatan
                    </button>
                    <button
                      style={s.cancelBtn}
                      onClick={() => {
                        setSelectedNoteId(null);
                        setAdminNoteDraft('');
                      }}
                    >
                      Batal
                    </button>
                  </div>
                </div>
              )}

              <div style={s.actionRow}>
                <button style={s.grayBtn} onClick={() => openNoteEditor(r)}>
                  Catatan Admin
                </button>

                <button
                  style={s.blueBtn}
                  onClick={() => updateStatus(r.id, 'menunggu persetujuan', r.admin_note || '')}
                >
                  Pending
                </button>

                <button
                  style={s.orangeBtn}
                  onClick={() => updateStatus(r.id, 'diproses', r.admin_note || '')}
                >
                  Diproses
                </button>

                <button
                  style={s.greenBtn}
                  onClick={() => updateStatus(r.id, 'selesai', r.admin_note || '')}
                >
                  Selesai
                </button>

                <button
                  style={s.redBtn}
                  onClick={() => updateStatus(r.id, 'ditolak', r.admin_note || '')}
                >
                  Tolak
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
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 18,
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    marginBottom: 22,
  },
  kicker: {
    fontSize: 11,
    letterSpacing: 2,
    color: '#9ca3af',
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
  headerActions: {
    display: 'flex',
    gap: 10,
    flexWrap: 'wrap',
  },
  refreshBtn: {
    padding: '12px 16px',
    borderRadius: 14,
    border: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(255,255,255,0.04)',
    color: '#fff',
    cursor: 'pointer',
    fontWeight: 700,
  },
  logout: {
    padding: '12px 16px',
    borderRadius: 14,
    border: 'none',
    background: '#991b1b',
    color: '#fff',
    cursor: 'pointer',
    fontWeight: 700,
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(6, minmax(0,1fr))',
    gap: 14,
    marginBottom: 20,
  },
  statCard: {
    padding: 18,
    borderRadius: 18,
  },
  statValue: {
    fontSize: 34,
    fontWeight: 800,
    marginBottom: 8,
  },
  statTitle: {
    fontSize: 15,
    fontWeight: 700,
  },
  statSubtitle: {
    marginTop: 8,
    color: 'rgba(255,255,255,0.54)',
    fontSize: 13,
    lineHeight: 1.6,
  },
  panel: {
    padding: 22,
    borderRadius: 22,
  },
  panelTop: {
    marginBottom: 16,
  },
  panelTitle: {
    margin: 0,
    fontSize: 26,
  },
  panelDesc: {
    marginTop: 10,
    color: 'rgba(255,255,255,0.62)',
    lineHeight: 1.8,
  },
  filterRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 260px',
    gap: 12,
    marginBottom: 14,
  },
  searchInput: {
    width: '100%',
    padding: '14px 16px',
    borderRadius: 14,
    border: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(255,255,255,0.04)',
    color: '#fff',
    outline: 'none',
  },
  select: {
    width: '100%',
    padding: '14px 16px',
    borderRadius: 14,
    border: '1px solid rgba(255,255,255,0.08)',
    background: '#101a2d',
    color: '#fff',
    outline: 'none',
  },
  resultInfo: {
    marginBottom: 16,
    color: 'rgba(255,255,255,0.58)',
  },
  emptyState: {
    padding: 20,
    color: 'rgba(255,255,255,0.45)',
  },
  reportCard: {
    padding: 18,
    borderRadius: 18,
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.06)',
    marginBottom: 14,
  },
  reportTop: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 12,
    flexWrap: 'wrap',
    marginBottom: 14,
  },
  reportTitle: {
    fontSize: 20,
    fontWeight: 800,
  },
  reportMeta: {
    marginTop: 6,
    color: 'rgba(255,255,255,0.56)',
    fontSize: 14,
  },
  badgeRow: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
    marginTop: 10,
  },
  typeBadge: {
    padding: '6px 10px',
    borderRadius: 999,
    background: 'rgba(168,85,247,0.14)',
    border: '1px solid rgba(168,85,247,0.22)',
    color: '#c084fc',
    fontSize: 12,
    fontWeight: 700,
  },
  statusBadge: {
    padding: '6px 10px',
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 700,
    textTransform: 'capitalize',
  },
  reportGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, minmax(0,1fr))',
    gap: 10,
    marginBottom: 14,
  },
  infoCard: {
    padding: 12,
    borderRadius: 14,
    background: 'rgba(255,255,255,0.025)',
    border: '1px solid rgba(255,255,255,0.05)',
  },
  infoLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.48)',
    marginBottom: 6,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: 600,
    color: 'rgba(255,255,255,0.88)',
    lineHeight: 1.6,
  },
  messageBox: {
    marginBottom: 12,
    padding: 14,
    borderRadius: 14,
    background: 'rgba(255,255,255,0.025)',
    border: '1px solid rgba(255,255,255,0.05)',
  },
  noteBox: {
    marginBottom: 12,
    padding: 14,
    borderRadius: 14,
    background: 'rgba(96,165,250,0.06)',
    border: '1px solid rgba(96,165,250,0.12)',
  },
  sectionLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.52)',
    marginBottom: 8,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  messageText: {
    color: 'rgba(255,255,255,0.82)',
    lineHeight: 1.8,
    whiteSpace: 'pre-wrap',
  },
  noteText: {
    color: 'rgba(255,255,255,0.82)',
    lineHeight: 1.8,
    whiteSpace: 'pre-wrap',
  },
  editorBox: {
    marginBottom: 14,
    padding: 14,
    borderRadius: 14,
    background: 'rgba(255,255,255,0.025)',
    border: '1px solid rgba(255,255,255,0.05)',
  },
  textarea: {
    width: '100%',
    minHeight: 100,
    resize: 'vertical',
    padding: '14px 16px',
    borderRadius: 14,
    border: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(255,255,255,0.04)',
    color: '#fff',
    outline: 'none',
    fontFamily: 'inherit',
  },
  editorActions: {
    display: 'flex',
    gap: 10,
    marginTop: 12,
    flexWrap: 'wrap',
  },
  actionRow: {
    display: 'flex',
    gap: 10,
    flexWrap: 'wrap',
    marginTop: 10,
  },
  grayBtn: {
    padding: '11px 14px',
    borderRadius: 12,
    border: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(255,255,255,0.04)',
    color: '#fff',
    cursor: 'pointer',
    fontWeight: 700,
  },
  blueBtn: {
    padding: '11px 14px',
    borderRadius: 12,
    border: 'none',
    background: '#2563eb',
    color: '#fff',
    cursor: 'pointer',
    fontWeight: 700,
  },
  orangeBtn: {
    padding: '11px 14px',
    borderRadius: 12,
    border: 'none',
    background: '#d97706',
    color: '#fff',
    cursor: 'pointer',
    fontWeight: 700,
  },
  greenBtn: {
    padding: '11px 14px',
    borderRadius: 12,
    border: 'none',
    background: '#16a34a',
    color: '#fff',
    cursor: 'pointer',
    fontWeight: 700,
  },
  redBtn: {
    padding: '11px 14px',
    borderRadius: 12,
    border: 'none',
    background: '#b91c1c',
    color: '#fff',
    cursor: 'pointer',
    fontWeight: 700,
  },
  saveBtn: {
    padding: '11px 14px',
    borderRadius: 12,
    border: 'none',
    background: '#16a34a',
    color: '#fff',
    cursor: 'pointer',
    fontWeight: 700,
  },
  cancelBtn: {
    padding: '11px 14px',
    borderRadius: 12,
    border: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(255,255,255,0.04)',
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

  input::placeholder,
  textarea::placeholder {
    color: rgba(255,255,255,0.28);
  }

  select,
  option {
    background: #101a2d;
    color: #ffffff;
  }

  @media (max-width: 1280px) {
    div[style*="grid-template-columns: repeat(6, minmax(0,1fr))"] {
      grid-template-columns: repeat(3, minmax(0,1fr)) !important;
    }
  }

  @media (max-width: 980px) {
    div[style*="grid-template-columns: repeat(4, minmax(0,1fr))"] {
      grid-template-columns: repeat(2, minmax(0,1fr)) !important;
    }

    div[style*="grid-template-columns: 1fr 260px"] {
      grid-template-columns: 1fr !important;
    }

    div[style*="grid-template-columns: repeat(6, minmax(0,1fr))"] {
      grid-template-columns: repeat(2, minmax(0,1fr)) !important;
    }
  }

  @media (max-width: 640px) {
    div[style*="grid-template-columns: repeat(6, minmax(0,1fr))"],
    div[style*="grid-template-columns: repeat(4, minmax(0,1fr))"] {
      grid-template-columns: 1fr !important;
    }
  }
`;