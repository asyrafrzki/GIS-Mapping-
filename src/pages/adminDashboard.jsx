import React, { useEffect, useMemo, useState } from 'react';
import { apiRequest } from '../services/api';

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
  borderStrong: 'rgba(6, 78, 46, 0.26)',
  text: '#12351f',
  muted: '#6b7b70',
  danger: '#b91c1c',
  warning: '#b45309',
};

const ICONS = {
  land: 'https://cdn.jsdelivr.net/npm/lucide-static@0.468.0/icons/map-pinned.svg',
  pin: 'https://cdn.jsdelivr.net/npm/lucide-static@0.468.0/icons/map-pin.svg',
  ruler: 'https://cdn.jsdelivr.net/npm/lucide-static@0.468.0/icons/ruler.svg',
  flask: 'https://cdn.jsdelivr.net/npm/lucide-static@0.468.0/icons/flask-conical.svg',
  close: 'https://cdn.jsdelivr.net/npm/lucide-static@0.468.0/icons/x.svg',
  save: 'https://cdn.jsdelivr.net/npm/lucide-static@0.468.0/icons/save.svg',
  search: 'https://cdn.jsdelivr.net/npm/lucide-static@0.468.0/icons/search.svg',
  alert: 'https://cdn.jsdelivr.net/npm/lucide-static@0.468.0/icons/triangle-alert.svg',
  check: 'https://cdn.jsdelivr.net/npm/lucide-static@0.468.0/icons/circle-check.svg',
};

function Icon({ src, size = 20, color = colors.greenDark }) {
  return (
    <span
      style={{
        width: size,
        height: size,
        display: 'inline-block',
        background: color,
        WebkitMask: `url(${src}) center / contain no-repeat`,
        mask: `url(${src}) center / contain no-repeat`,
        flex: `0 0 ${size}px`,
      }}
    />
  );
}

function formatDate(value) {
  if (!value) return '-';

  return new Date(value).toLocaleString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function totalPupuk(a, b) {
  return (Number(a || 0) + Number(b || 0)).toFixed(2).replace(/\.00$/, '');
}

function hasAnalysis(item) {
  return Boolean(item.analysis_id);
}

function getLandTitle(item) {
  return item.tanah_user || item.point_name || 'Tanah User';
}

function getProblemStatus(item) {
  if (!hasAnalysis(item)) {
    return {
      label: 'Belum Dianalisis',
      tone: 'neutral',
      icon: ICONS.flask,
      items: ['Tanah ini sudah dibuat user, tetapi belum memiliki hasil analisis tanah.'],
    };
  }

  const total = Number(item.total_rekomendasi || 0);
  const n = Number(item.n || 0);
  const p = Number(item.p || 0);
  const k = Number(item.k || 0);
  const mg = Number(item.mg || 0);

  const problems = [];

  if (total < 0) {
    problems.push('Total rekomendasi bernilai minus, perlu cek ulang input parameter produksi.');
  }

  if (n < 2.3) problems.push('Nitrogen relatif rendah.');
  if (p < 0.14) problems.push('Fosfor relatif rendah.');
  if (k < 0.9) problems.push('Kalium relatif rendah.');
  if (mg < 0.2) problems.push('Magnesium relatif rendah.');

  if (problems.length === 0) {
    return {
      label: 'Aman',
      tone: 'good',
      icon: ICONS.check,
      items: ['Hasil analisis tidak menunjukkan masalah besar berdasarkan batas sederhana sistem.'],
    };
  }

  return {
    label: 'Perlu Perhatian',
    tone: 'warning',
    icon: ICONS.alert,
    items: problems,
  };
}

function InfoBox({ label, value }) {
  return (
    <div style={s.infoBox}>
      <div style={s.infoLabel}>{label}</div>
      <div style={s.infoValue}>{value || '-'}</div>
    </div>
  );
}

function MiniNutrient({ label, value }) {
  return (
    <div style={s.miniNutrient}>
      <div style={s.miniLabel}>{label}</div>
      <div style={s.miniValue}>{value ?? '-'}%</div>
    </div>
  );
}

export default function AdminDashboard({ token, currentUser, onLogout }) {
  const [soilItems, setSoilItems] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [adminNote, setAdminNote] = useState('');
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    try {
      const data = await apiRequest('/analisis-tanah/admin', { token });
      const rows = Array.isArray(data) ? data : [];

      setSoilItems(rows);

      if (selectedItem) {
        const updated = rows.find((item) => item.point_id === selectedItem.point_id);
        if (updated) {
          setSelectedItem(updated);
          setAdminNote(updated.admin_note || '');
        }
      }
    } catch (err) {
      console.error(err);
      alert(err.message || 'Gagal mengambil data tanah user.');
    }
  };

  useEffect(() => {
    loadData();
  }, [token]);

  const filteredItems = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) return soilItems;

    return soilItems.filter((item) => {
      const searchableText = [
        item.tanah_user,
        item.point_name,
        item.lokasi,
        item.daerah,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchableText.includes(keyword);
    });
  }, [soilItems, search]);

  const openDetail = (item) => {
    setSelectedItem(item);
    setAdminNote(item.admin_note || '');
  };

  const closeDetail = () => {
    setSelectedItem(null);
    setAdminNote('');
  };

  const saveRecommendation = async () => {
    if (!selectedItem) return;

    if (!selectedItem.analysis_id) {
      alert(
        'Tanah ini belum punya hasil analisis. Rekomendasi admin baru bisa disimpan setelah user melakukan analisis tanah.'
      );
      return;
    }

    try {
      setSaving(true);

      await apiRequest(`/analisis-tanah/admin/${selectedItem.analysis_id}/recommendation`, {
        method: 'PUT',
        token,
        body: {
          adminNote,
        },
      });

      await loadData();
      alert('Rekomendasi admin berhasil disimpan.');
    } catch (err) {
      alert(err.message || 'Gagal menyimpan rekomendasi admin.');
    } finally {
      setSaving(false);
    }
  };

  const selectedProblem = selectedItem ? getProblemStatus(selectedItem) : null;

  return (
    <div style={s.page}>
      <style>{css}</style>

      <header style={s.header}>
        <div>
          <div style={s.kicker}>ADMIN DASHBOARD</div>
          <h1 style={s.title}>Tanah User</h1>
          <p style={s.desc}>
            Lihat seluruh tanah yang dibuat user. Klik card untuk membuka detail analisis dan memberi rekomendasi admin.
          </p>
        </div>

        <div style={s.headerActions}>
          <button type="button" style={s.outlineBtn} onClick={loadData}>
            Refresh
          </button>

          <button type="button" style={s.logoutBtn} onClick={onLogout}>
            Logout
          </button>
        </div>
      </header>

      <section style={s.panel}>
        <div style={s.panelHeader}>
          <div>
            <div style={s.panelTag}>GRID TANAH</div>
            <h2 style={s.panelTitle}>Daftar Tanah User</h2>
          </div>

          <div style={s.searchWrapper} className="admin-search-wrapper">
            <Icon src={ICONS.search} size={19} color={colors.muted} />
            <input
              className="admin-search-input"
              style={s.searchInput}
              placeholder="Cari nama tanah, lokasi, daerah..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            {search && (
              <button type="button" style={s.clearSearchBtn} onClick={() => setSearch('')}>
                ×
              </button>
            )}
          </div>
        </div>

        {filteredItems.length === 0 ? (
          <div style={s.emptyState}>
            Tidak ada tanah yang cocok dengan kata kunci <strong>{search}</strong>.
          </div>
        ) : (
          <div style={s.soilGrid}>
            {filteredItems.map((item) => {
              const problem = getProblemStatus(item);
              const title = getLandTitle(item);

              return (
                <button
                  type="button"
                  key={`${item.point_id}-${item.analysis_id || 'no-analysis'}`}
                  style={s.soilCard}
                  onClick={() => openDetail(item)}
                >
                  <div style={s.cardTop}>
                    <div style={s.iconCircle}>
                      <Icon src={ICONS.land} size={23} color={colors.white} />
                    </div>
                  </div>

                  <div style={s.soilName}>{title}</div>

                  <div style={s.smallRow}>
                    <Icon src={ICONS.pin} size={15} color={colors.green} />
                    <span>{item.lokasi || '-'}</span>
                  </div>

                  <div style={s.smallRow}>
                    <Icon src={ICONS.ruler} size={15} color={colors.green} />
                    <span>{item.radius ? `${item.radius} m` : '-'}</span>
                  </div>

                  <div style={s.cardBottom}>
                    <span
                      style={{
                        ...s.statusBadge,
                        ...(problem.tone === 'good'
                          ? s.goodBadge
                          : problem.tone === 'warning'
                            ? s.warningBadge
                            : s.neutralBadge),
                      }}
                    >
                      {problem.label}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {selectedItem && (
        <div style={s.modalOverlay} onClick={closeDetail}>
          <div style={s.modal} onClick={(e) => e.stopPropagation()}>
            <div style={s.modalHeader}>
              <div>
                <div style={s.panelTag}>DETAIL TANAH</div>
                <h2 style={s.modalTitle}>{getLandTitle(selectedItem)}</h2>
                <p style={s.modalDesc}>
                  {selectedItem.lokasi || '-'} · {selectedItem.daerah || '-'} · Ukuran{' '}
                  {selectedItem.radius || 0} m
                </p>
              </div>

              <button type="button" style={s.closeBtn} onClick={closeDetail}>
                <Icon src={ICONS.close} size={20} color={colors.greenDark} />
              </button>
            </div>

            <div style={s.modalBody}>
              <div style={s.modalLeft}>
                <div style={s.whiteCard}>
                  <div style={s.cardTitle}>Informasi Tanah</div>

                  <div style={s.infoGrid}>
                    <InfoBox label="Nama Titik" value={selectedItem.point_name} />
                    <InfoBox label="Nama Tanah" value={selectedItem.tanah_user} />
                    <InfoBox label="Lokasi" value={selectedItem.lokasi} />
                    <InfoBox label="Daerah" value={selectedItem.daerah} />
                    <InfoBox
                      label="Ukuran Tanah"
                      value={selectedItem.radius ? `${selectedItem.radius} m` : '-'}
                    />
                    <InfoBox
                      label="Koordinat"
                      value={`${selectedItem.lat || '-'}, ${selectedItem.lng || '-'}`}
                    />
                    <InfoBox label="Dibuat Oleh" value={selectedItem.user_name} />
                    <InfoBox label="Dibuat Pada" value={formatDate(selectedItem.point_created_at)} />
                  </div>
                </div>

                {!hasAnalysis(selectedItem) ? (
                  <div style={s.whiteCard}>
                    <div style={s.cardTitle}>Analisis Tanah</div>
                    <div style={s.emptyState}>
                      Tanah ini belum memiliki hasil analisis. User perlu membuka menu Analisis Tanah lalu klik
                      <strong> Hitung & Simpan</strong>.
                    </div>
                  </div>
                ) : (
                  <>
                    <div style={s.whiteCard}>
                      <div style={s.cardTitle}>Kandungan Hara</div>

                      <div style={s.nutrientGrid}>
                        <MiniNutrient label="Nitrogen (N)" value={selectedItem.n} />
                        <MiniNutrient label="Fosfor (P)" value={selectedItem.p} />
                        <MiniNutrient label="Kalium (K)" value={selectedItem.k} />
                        <MiniNutrient label="Magnesium (Mg)" value={selectedItem.mg} />
                      </div>
                    </div>

                    <div style={s.whiteCard}>
                      <div style={s.cardTitle}>Cek Masalah</div>

                      <div
                        style={{
                          ...s.problemBox,
                          ...(selectedProblem?.tone === 'good'
                            ? s.problemGood
                            : selectedProblem?.tone === 'warning'
                              ? s.problemWarning
                              : s.problemNeutral),
                        }}
                      >
                        <div style={s.problemTitleRow}>
                          <Icon
                            src={selectedProblem?.icon}
                            size={20}
                            color={
                              selectedProblem?.tone === 'warning'
                                ? colors.warning
                                : selectedProblem?.tone === 'good'
                                  ? colors.greenDark
                                  : colors.muted
                            }
                          />
                          <strong>{selectedProblem?.label}</strong>
                        </div>

                        <ol style={s.problemList}>
                          {selectedProblem?.items.map((item, index) => (
                            <li key={index}>{item}</li>
                          ))}
                        </ol>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div style={s.modalRight}>
                {hasAnalysis(selectedItem) && (
                  <div style={s.whiteCard}>
                    <div style={s.cardTitle}>Hasil Rekomendasi Pupuk</div>

                    <div style={s.resultGrid}>
                      <div style={s.resultCard}>
                        <div style={s.resultLabel}>Aplikasi I</div>
                        <div style={s.resultValue}>{selectedItem.aplikasi1_total}</div>
                      </div>

                      <div style={s.resultCard}>
                        <div style={s.resultLabel}>Aplikasi II</div>
                        <div style={s.resultValue}>{selectedItem.aplikasi2_total}</div>
                      </div>

                      <div style={s.resultCard}>
                        <div style={s.resultLabel}>Total</div>
                        <div style={s.resultValue}>{selectedItem.total_rekomendasi}</div>
                      </div>
                    </div>

                    <div style={s.tableWrap}>
                      <table style={s.table}>
                        <thead>
                          <tr>
                            <th>Pupuk</th>
                            <th>Apl I</th>
                            <th>Apl II</th>
                            <th>Total</th>
                          </tr>
                        </thead>

                        <tbody>
                          <tr>
                            <td>Urea</td>
                            <td>{selectedItem.urea_app1}</td>
                            <td>{selectedItem.urea_app2}</td>
                            <td>{totalPupuk(selectedItem.urea_app1, selectedItem.urea_app2)}</td>
                          </tr>

                          <tr>
                            <td>TSP</td>
                            <td>{selectedItem.tsp_app1}</td>
                            <td>{selectedItem.tsp_app2}</td>
                            <td>{totalPupuk(selectedItem.tsp_app1, selectedItem.tsp_app2)}</td>
                          </tr>

                          <tr>
                            <td>KCl</td>
                            <td>{selectedItem.kcl_app1}</td>
                            <td>{selectedItem.kcl_app2}</td>
                            <td>{totalPupuk(selectedItem.kcl_app1, selectedItem.kcl_app2)}</td>
                          </tr>

                          <tr>
                            <td>Dolomit</td>
                            <td>{selectedItem.dolomit_app1}</td>
                            <td>{selectedItem.dolomit_app2}</td>
                            <td>{totalPupuk(selectedItem.dolomit_app1, selectedItem.dolomit_app2)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <div style={s.whiteCard}>
                  <div style={s.cardTitle}>Rekomendasi Admin</div>

                  <textarea
                    style={{
                      ...s.textarea,
                      opacity: hasAnalysis(selectedItem) ? 1 : 0.65,
                    }}
                    disabled={!hasAnalysis(selectedItem)}
                    placeholder={
                      hasAnalysis(selectedItem)
                        ? `Contoh:
- Lakukan validasi lapangan pada area dengan unsur rendah.
- Evaluasi ulang setelah aplikasi pupuk tahap II.
- Perhatikan kondisi drainase dan kelembapan tanah.`
                        : 'Rekomendasi bisa diisi setelah user melakukan analisis tanah.'
                    }
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                  />

                  <div style={s.previewBox}>
                    <div style={s.previewLabel}>Preview</div>
                    <div style={s.previewText}>{adminNote.trim() || 'Belum ada rekomendasi admin.'}</div>
                  </div>

                  <button
                    type="button"
                    style={{
                      ...s.saveBtn,
                      opacity: hasAnalysis(selectedItem) ? 1 : 0.55,
                      cursor: hasAnalysis(selectedItem) ? 'pointer' : 'not-allowed',
                    }}
                    onClick={saveRecommendation}
                    disabled={!hasAnalysis(selectedItem) || saving}
                  >
                    <Icon src={ICONS.save} size={18} color={colors.white} />
                    {saving ? 'Menyimpan...' : 'Simpan Rekomendasi'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  page: {
    minHeight: '100vh',
    background: colors.cream,
    color: colors.text,
    padding: 28,
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
    fontSize: 12,
    letterSpacing: 2,
    color: colors.green,
    marginBottom: 8,
    fontWeight: 900,
  },

  title: {
    margin: 0,
    fontSize: 42,
    letterSpacing: '-1px',
    color: colors.greenDeep,
    lineHeight: 1.1,
  },

  desc: {
    marginTop: 12,
    color: colors.muted,
    lineHeight: 1.8,
    maxWidth: 850,
    fontSize: 15,
  },

  headerActions: {
    display: 'flex',
    gap: 10,
    flexWrap: 'wrap',
  },

  outlineBtn: {
    padding: '12px 16px',
    borderRadius: 14,
    border: `1px solid ${colors.borderStrong}`,
    background: colors.white,
    color: colors.greenDark,
    cursor: 'pointer',
    fontWeight: 900,
    boxShadow: '0 10px 24px rgba(6,78,46,0.08)',
  },

  logoutBtn: {
    padding: '12px 16px',
    borderRadius: 14,
    border: 'none',
    background: colors.danger,
    color: colors.white,
    cursor: 'pointer',
    fontWeight: 900,
    boxShadow: '0 10px 24px rgba(185,28,28,0.12)',
  },

  panel: {
    background: colors.white,
    border: `1px solid ${colors.border}`,
    borderRadius: 24,
    padding: 22,
    boxShadow: '0 14px 36px rgba(6,78,46,0.08)',
  },

  panelHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 18,
    flexWrap: 'wrap',
    alignItems: 'center',
    marginBottom: 22,
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
    fontSize: 26,
    color: colors.greenDeep,
  },

  searchWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    background: colors.cream2,
    border: `1px solid ${colors.border}`,
    borderRadius: 16,
    padding: '0 12px',
    width: 360,
    maxWidth: '100%',
    height: 52,
    boxShadow: '0 6px 18px rgba(6,78,46,0.04)',
  },

  searchInput: {
    flex: 1,
    border: 'none',
    background: 'transparent',
    outline: 'none',
    color: colors.text,
    fontSize: 14,
    minWidth: 0,
    height: '100%',
  },

  clearSearchBtn: {
    width: 28,
    height: 28,
    borderRadius: 999,
    border: `1px solid ${colors.border}`,
    background: colors.white,
    color: colors.muted,
    cursor: 'pointer',
    fontSize: 18,
    lineHeight: 1,
  },

  emptyState: {
    padding: 18,
    background: colors.cream2,
    borderRadius: 16,
    border: `1px dashed ${colors.borderStrong}`,
    color: colors.muted,
    lineHeight: 1.7,
  },

  soilGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
    gap: 16,
  },

  soilCard: {
    textAlign: 'left',
    border: `1px solid ${colors.border}`,
    background: colors.cream2,
    borderRadius: 20,
    padding: 18,
    cursor: 'pointer',
    color: colors.text,
    boxShadow: '0 8px 20px rgba(6,78,46,0.05)',
    minHeight: 190,
  },

  cardTop: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 12,
  },

  iconCircle: {
    width: 46,
    height: 46,
    borderRadius: 15,
    background: colors.greenDark,
    display: 'grid',
    placeItems: 'center',
    boxShadow: '0 10px 18px rgba(6,78,46,0.16)',
  },

  soilName: {
    fontSize: 18,
    fontWeight: 900,
    color: colors.greenDeep,
    lineHeight: 1.25,
    marginBottom: 12,
  },

  smallRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    color: colors.muted,
    fontSize: 14,
    marginTop: 8,
    lineHeight: 1.4,
  },

  cardBottom: {
    marginTop: 14,
  },

  statusBadge: {
    display: 'inline-block',
    padding: '7px 10px',
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 900,
  },

  goodBadge: {
    background: colors.greenPale,
    color: colors.greenDark,
    border: `1px solid ${colors.border}`,
  },

  warningBadge: {
    background: 'rgba(245, 158, 11, 0.12)',
    color: colors.warning,
    border: '1px solid rgba(245, 158, 11, 0.22)',
  },

  neutralBadge: {
    background: colors.white,
    color: colors.muted,
    border: `1px solid ${colors.border}`,
  },

  modalOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(3, 20, 12, 0.54)',
    backdropFilter: 'blur(8px)',
    zIndex: 2000,
    display: 'grid',
    placeItems: 'center',
    padding: 22,
  },

  modal: {
    width: 'min(1180px, 100%)',
    maxHeight: '92vh',
    overflowY: 'auto',
    background: colors.white,
    borderRadius: 26,
    border: `1px solid ${colors.border}`,
    boxShadow: '0 28px 80px rgba(3, 20, 12, 0.28)',
    padding: 22,
  },

  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 16,
    alignItems: 'flex-start',
    marginBottom: 18,
  },

  modalTitle: {
    margin: 0,
    fontSize: 30,
    color: colors.greenDeep,
    letterSpacing: '-0.6px',
  },

  modalDesc: {
    marginTop: 8,
    color: colors.muted,
    lineHeight: 1.7,
  },

  closeBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    border: `1px solid ${colors.border}`,
    background: colors.cream2,
    cursor: 'pointer',
    display: 'grid',
    placeItems: 'center',
  },

  modalBody: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr) minmax(360px, 460px)',
    gap: 16,
    alignItems: 'start',
  },

  modalLeft: {
    display: 'grid',
    gap: 14,
  },

  modalRight: {
    display: 'grid',
    gap: 14,
  },

  whiteCard: {
    background: colors.cream2,
    border: `1px solid ${colors.border}`,
    borderRadius: 20,
    padding: 16,
  },

  cardTitle: {
    fontSize: 18,
    color: colors.greenDeep,
    fontWeight: 900,
    marginBottom: 14,
  },

  infoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: 10,
  },

  infoBox: {
    padding: 11,
    borderRadius: 14,
    border: `1px solid ${colors.border}`,
    background: colors.white,
  },

  infoLabel: {
    fontSize: 11,
    color: colors.muted,
    marginBottom: 5,
    fontWeight: 800,
  },

  infoValue: {
    fontSize: 13,
    color: colors.greenDeep,
    fontWeight: 900,
    lineHeight: 1.5,
    wordBreak: 'break-word',
  },

  nutrientGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
    gap: 10,
  },

  miniNutrient: {
    background: colors.white,
    border: `1px solid ${colors.border}`,
    borderRadius: 16,
    padding: 13,
  },

  miniLabel: {
    fontSize: 12,
    color: colors.muted,
    fontWeight: 800,
  },

  miniValue: {
    fontSize: 22,
    color: colors.green,
    fontWeight: 900,
    marginTop: 8,
  },

  problemBox: {
    padding: 14,
    borderRadius: 16,
    lineHeight: 1.7,
  },

  problemTitleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },

  problemGood: {
    background: colors.greenPale,
    border: `1px solid ${colors.border}`,
    color: colors.greenDeep,
  },

  problemWarning: {
    background: 'rgba(245, 158, 11, 0.12)',
    border: '1px solid rgba(245, 158, 11, 0.22)',
    color: colors.greenDeep,
  },

  problemNeutral: {
    background: colors.white,
    border: `1px solid ${colors.border}`,
    color: colors.muted,
  },

  problemList: {
    margin: '10px 0 0',
    paddingLeft: 20,
  },

  resultGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    gap: 10,
    marginBottom: 14,
  },

  resultCard: {
    background: colors.white,
    border: `1px solid ${colors.border}`,
    borderRadius: 16,
    padding: 13,
  },

  resultLabel: {
    fontSize: 11,
    color: colors.muted,
    fontWeight: 900,
    textTransform: 'uppercase',
  },

  resultValue: {
    fontSize: 24,
    color: colors.green,
    fontWeight: 900,
    marginTop: 8,
  },

  tableWrap: {
    overflowX: 'auto',
    borderRadius: 16,
    border: `1px solid ${colors.border}`,
    background: colors.white,
  },

  table: {
    width: '100%',
    borderCollapse: 'collapse',
    minWidth: 420,
  },

  textarea: {
    width: '100%',
    minHeight: 170,
    padding: '14px 16px',
    borderRadius: 16,
    border: `1px solid ${colors.border}`,
    background: colors.white,
    color: colors.text,
    outline: 'none',
    fontFamily: 'inherit',
    resize: 'vertical',
    lineHeight: 1.7,
  },

  previewBox: {
    marginTop: 12,
    padding: 14,
    borderRadius: 16,
    background: colors.white,
    border: `1px solid ${colors.border}`,
  },

  previewLabel: {
    fontSize: 12,
    fontWeight: 900,
    color: colors.green,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  previewText: {
    color: colors.text,
    lineHeight: 1.8,
    whiteSpace: 'pre-wrap',
  },

  saveBtn: {
    width: '100%',
    marginTop: 14,
    padding: '14px 16px',
    borderRadius: 16,
    border: 'none',
    background: colors.greenDark,
    color: colors.white,
    cursor: 'pointer',
    fontWeight: 900,
    boxShadow: '0 12px 24px rgba(6,78,46,0.18)',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
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
  textarea {
    font-family: inherit;
  }

  button {
    transition: transform .15s ease, opacity .15s ease, box-shadow .15s ease;
  }

  button:hover {
    transform: translateY(-1px);
    opacity: .96;
  }

  .admin-search-input {
    outline: none !important;
    box-shadow: none !important;
    border: none !important;
  }

  .admin-search-input:focus,
  .admin-search-input:focus-visible {
    outline: none !important;
    box-shadow: none !important;
    border: none !important;
    background: transparent !important;
  }

  .admin-search-wrapper:focus-within {
    border-color: rgba(6, 78, 46, 0.24) !important;
    box-shadow: 0 8px 22px rgba(6, 78, 46, 0.08);
    background: #ffffff !important;
  }

  input::placeholder,
  textarea::placeholder {
    color: rgba(18, 53, 31, 0.36);
  }

  textarea:focus {
    border-color: rgba(6, 78, 46, 0.34) !important;
    box-shadow: 0 0 0 3px rgba(70, 171, 104, 0.12);
    background: #ffffff !important;
  }

  table th,
  table td {
    padding: 11px;
    text-align: left;
    border-bottom: 1px solid rgba(6, 78, 46, 0.12);
    font-size: 13px;
    color: ${colors.text};
  }

  table th {
    background: ${colors.greenPale};
    color: ${colors.greenDeep};
    font-weight: 900;
    text-transform: uppercase;
    font-size: 12px;
  }

  div::-webkit-scrollbar {
    width: 8px;
    height: 8px;
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

  @media (max-width: 980px) {
    div[style*="grid-template-columns: minmax(0, 1fr) minmax(360px, 460px)"] {
      grid-template-columns: 1fr !important;
    }

    div[style*="grid-template-columns: repeat(4, minmax(0, 1fr))"],
    div[style*="grid-template-columns: repeat(3, minmax(0, 1fr))"],
    div[style*="grid-template-columns: repeat(2, minmax(0, 1fr))"] {
      grid-template-columns: 1fr !important;
    }

    input[style] {
      width: 100% !important;
    }
  }
`;