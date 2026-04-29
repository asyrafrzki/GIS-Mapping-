import React, { useEffect, useState } from 'react';
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
  borderStrong: 'rgba(6, 78, 46, 0.24)',
  text: '#12351f',
  muted: '#6b7b70',
  danger: '#b91c1c',
};

const LOGO_SRC = '/ppks.png';

const ICONS = {
  dashboard: 'https://cdn.jsdelivr.net/npm/lucide-static@0.468.0/icons/layout-dashboard.svg',
  digitasi: 'https://cdn.jsdelivr.net/npm/lucide-static@0.468.0/icons/map-pinned.svg',
  laporan: 'https://cdn.jsdelivr.net/npm/lucide-static@0.468.0/icons/file-text.svg',
  analisis: 'https://cdn.jsdelivr.net/npm/lucide-static@0.468.0/icons/flask-conical.svg',
  titik: 'https://cdn.jsdelivr.net/npm/lucide-static@0.468.0/icons/map-pin.svg',
  settings: 'https://cdn.jsdelivr.net/npm/lucide-static@0.468.0/icons/settings.svg',
  logout: 'https://cdn.jsdelivr.net/npm/lucide-static@0.468.0/icons/log-out.svg',
  empty: 'https://cdn.jsdelivr.net/npm/lucide-static@0.468.0/icons/archive-x.svg',
  plus: 'https://cdn.jsdelivr.net/npm/lucide-static@0.468.0/icons/plus-circle.svg',
  leaf: 'https://cdn.jsdelivr.net/npm/lucide-static@0.468.0/icons/sprout.svg',
};

function Icon({ src, size = 22, color = colors.green, style }) {
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
        ...style,
      }}
    />
  );
}

function badgeStyle(status) {
  if (status === 'selesai') {
    return {
      background: 'rgba(70, 171, 104, 0.14)',
      color: colors.green,
      border: `1px solid ${colors.borderStrong}`,
    };
  }

  if (status === 'diproses') {
    return {
      background: 'rgba(245, 158, 11, 0.12)',
      color: '#b45309',
      border: '1px solid rgba(245, 158, 11, 0.22)',
    };
  }

  return {
    background: 'rgba(6, 78, 46, 0.08)',
    color: colors.greenDark,
    border: `1px solid ${colors.border}`,
  };
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
    <div style={s.shell}>
      <style>{css}</style>

      <aside style={s.sidebar}>
        <div>
          <div style={s.logoBox}>
            <img src={LOGO_SRC} alt="Monitoring Hara" style={s.logo} />
            <div>
              <div style={s.logoText}>Monitoring</div>
              <div style={s.logoText}>Hara</div>
            </div>
          </div>

          <nav style={s.nav}>
            <NavItem
              label="Dashboard"
              icon={ICONS.dashboard}
              active
              onClick={() => onNavigate('user-dashboard')}
            />

            <NavItem
              label="Digitasi"
              icon={ICONS.digitasi}
              onClick={() => onNavigate('digitasi')}
            />

            <NavItem
              label="Laporan"
              icon={ICONS.laporan}
              onClick={() => onNavigate('laporan')}
            />

            <NavItem
              label="Analisis Tanah"
              icon={ICONS.analisis}
              onClick={() => onNavigate('analisis-tanah')}
            />
          </nav>
        </div>

        <div style={s.sidebarBottom}>
          <button style={s.newBtn} onClick={() => onNavigate('digitasi')}>
            <Icon src={ICONS.plus} size={18} color={colors.greenDark} />
            Buat Titik Baru
          </button>

          <button style={s.sideSmallBtn}>
            <Icon src={ICONS.settings} size={18} color="rgba(255,255,255,0.82)" />
            Pengaturan
          </button>

          <button style={s.sideSmallBtn} onClick={onLogout}>
            <Icon src={ICONS.logout} size={18} color="rgba(255,255,255,0.82)" />
            Keluar
          </button>
        </div>
      </aside>

      <main style={s.main}>
        <section style={s.header}>
          <div>
            <h1 style={s.title}>Halo, {currentUser?.name || 'User'}</h1>
            <p style={s.subtitle}>
              Pantau titik lahan, aktivitas digitasi, dan laporan terbaru dalam satu dashboard.
            </p>
          </div>

          <button style={s.primaryBtn} onClick={() => onNavigate('analisis-tanah')}>
            <Icon src={ICONS.analisis} size={18} color={colors.white} />
            Analisis Tanah
          </button>
        </section>

        <section style={s.summaryGrid}>
          <MetricCard
            label="Total Titik Lahan"
            value={data.totalPoints}
            hint="Data digitasi yang sudah tersimpan"
          />

          <MetricCard
            label="Total Laporan"
            value={data.totalReports}
            hint="Laporan yang sudah dikirim"
          />
        </section>

        <section style={s.contentGrid}>
          <div style={s.panel}>
            <div style={s.panelHeader}>
              <div>
                <div style={s.panelTag}>DATA LAHAN</div>
                <h3 style={s.panelTitle}>Titik Terbaru</h3>
              </div>

              <button style={s.panelBtn} onClick={() => onNavigate('digitasi')}>
                Lihat Semua
              </button>
            </div>

            {data.latestPoints.length === 0 ? (
              <EmptyState
                title="Belum Ada Titik"
                text="Belum ada titik digitasi. Buat titik atau polygon lahan terlebih dahulu."
              />
            ) : (
              <div style={s.list}>
                {data.latestPoints.map((p) => (
                  <div key={p.id} style={s.row}>
                    <div style={s.rowIcon}>
                      <Icon src={ICONS.titik} size={26} color={colors.green} />
                    </div>

                    <div style={s.rowContent}>
                      <div style={s.rowTitle}>{p.nama}</div>
                      <div style={s.rowMeta}>
                        {p.jenis || '-'} · {p.lokasi || '-'} · {p.daerah || '-'}
                      </div>
                      <div style={s.rowSub}>
                        {p.tanah_user
                          ? `Tanah: ${p.tanah_user}`
                          : `Radius: ${p.radius || 0} m`}
                      </div>
                    </div>

                    <span style={s.radiusBadge}>{p.radius || 0} m</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={s.sideColumn}>
            <div style={s.panelSmall}>
              <div style={s.panelHeader}>
                <div>
                  <div style={s.panelTag}>ANALISIS</div>
                  <h3 style={s.panelTitleSmall}>Akses Cepat</h3>
                </div>
              </div>

              <div style={s.quickBox}>
                <div style={s.quickIconBox}>
                  <Icon src={ICONS.analisis} size={42} color={colors.green} />
                </div>

                <div style={s.quickTitle}>Analisis Tanah Siap</div>

                <div style={s.quickText}>
                  Pilih titik lahan dan hitung dosis pupuk berdasarkan data kandungan daun.
                </div>

                <button style={s.primaryBtnFull} onClick={() => onNavigate('analisis-tanah')}>
                  Mulai Analisis
                </button>
              </div>
            </div>

            <div style={s.panelSmall}>
              <div style={s.panelHeader}>
                <div>
                  <div style={s.panelTag}>LAPORAN</div>
                  <h3 style={s.panelTitleSmall}>Laporan Terbaru</h3>
                </div>

                <button style={s.panelBtn} onClick={() => onNavigate('laporan')}>
                  Kelola
                </button>
              </div>

              {data.latestReports.length === 0 ? (
                <EmptyState
                  title="Belum Ada Laporan"
                  text="Belum ada laporan yang dikirim."
                  compact
                />
              ) : (
                <div style={s.compactList}>
                  {data.latestReports.map((r) => (
                    <div key={r.id} style={s.compactRow}>
                      <div>
                        <div style={s.rowTitle}>{r.title}</div>
                        <div style={s.rowMeta}>{r.category}</div>
                      </div>

                      <span style={{ ...s.statusBadge, ...badgeStyle(r.status) }}>
                        {r.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        <footer style={s.footer}>
          <span>© 2026 Sistem Monitoring Hara</span>
          <span>Kebijakan Privasi</span>
          <span>Syarat Layanan</span>
          <span>Bantuan Sistem</span>
        </footer>
      </main>
    </div>
  );
}

function NavItem({ icon, label, active, onClick }) {
  return (
    <button
      style={{
        ...s.navItem,
        ...(active ? s.navItemActive : {}),
      }}
      onClick={onClick}
    >
      <span style={s.navIcon}>
        <Icon
          src={icon}
          size={24}
          color={active ? colors.greenDark : 'rgba(255,255,255,0.78)'}
        />
      </span>
      <span>{label}</span>
    </button>
  );
}

function MetricCard({ label, value, hint }) {
  return (
    <div style={s.metricCard}>
      <div style={s.metricValue}>{value}</div>
      <div style={s.metricLabel}>{label}</div>
      <div style={s.metricHint}>{hint}</div>
    </div>
  );
}

function EmptyState({ title, text, compact }) {
  return (
    <div style={compact ? s.emptyCompact : s.empty}>
      <Icon src={ICONS.empty} size={42} color={colors.green} />
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
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    padding: 22,
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
    alignItems: 'center',
    gap: 13,
    border: 'none',
    background: 'transparent',
    color: 'rgba(255,255,255,0.72)',
    padding: '13px 12px',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 900,
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    textAlign: 'left',
    borderRadius: 14,
  },

  navItemActive: {
    background: colors.cream2,
    color: colors.greenDark,
  },

  navIcon: {
    width: 32,
    height: 32,
    display: 'inline-grid',
    placeItems: 'center',
    flex: '0 0 32px',
  },

  sidebarBottom: {
    display: 'grid',
    gap: 14,
  },

  newBtn: {
    width: '100%',
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
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },

  sideSmallBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 9,
    border: 'none',
    background: 'transparent',
    color: 'rgba(255,255,255,0.78)',
    textAlign: 'left',
    cursor: 'pointer',
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
    fontWeight: 700,
  },

  main: {
    background: colors.cream,
    padding: '28px 32px',
    minWidth: 0,
  },

  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 16,
    marginBottom: 34,
  },

  title: {
    margin: 0,
    fontSize: 36,
    color: colors.greenDeep,
    letterSpacing: '-1px',
    lineHeight: 1.1,
  },

  subtitle: {
    marginTop: 10,
    color: colors.muted,
    fontSize: 14,
    lineHeight: 1.7,
  },

  primaryBtn: {
    border: 'none',
    background: colors.greenDark,
    color: colors.white,
    padding: '12px 16px',
    cursor: 'pointer',
    fontWeight: 900,
    fontSize: 12,
    textTransform: 'uppercase',
    borderRadius: 14,
    boxShadow: '0 12px 24px rgba(6,78,46,0.22)',
    whiteSpace: 'nowrap',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
  },

  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: 14,
    marginBottom: 18,
  },

  metricCard: {
    background: colors.white,
    border: `1px solid ${colors.border}`,
    padding: 22,
    minHeight: 132,
    borderRadius: 22,
    boxShadow: '0 14px 36px rgba(6,78,46,0.08)',
  },

  metricValue: {
    fontSize: 42,
    lineHeight: 1,
    fontWeight: 900,
    color: colors.green,
  },

  metricLabel: {
    marginTop: 18,
    color: colors.greenDeep,
    fontWeight: 900,
    fontSize: 14,
  },

  metricHint: {
    marginTop: 6,
    color: colors.muted,
    fontSize: 13,
  },

  contentGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 330px',
    gap: 18,
  },

  panel: {
    background: colors.white,
    border: `1px solid ${colors.border}`,
    padding: 20,
    minHeight: 440,
    borderRadius: 24,
    boxShadow: '0 14px 36px rgba(6,78,46,0.08)',
  },

  sideColumn: {
    display: 'grid',
    gap: 18,
  },

  panelSmall: {
    background: colors.white,
    border: `1px solid ${colors.border}`,
    padding: 20,
    minHeight: 215,
    borderRadius: 24,
    boxShadow: '0 14px 36px rgba(6,78,46,0.08)',
  },

  panelHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'flex-start',
    marginBottom: 16,
  },

  panelTag: {
    color: colors.green,
    fontSize: 11,
    fontWeight: 900,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 5,
  },

  panelTitle: {
    margin: 0,
    color: colors.greenDeep,
    fontSize: 24,
    letterSpacing: '-0.5px',
  },

  panelTitleSmall: {
    margin: 0,
    color: colors.greenDeep,
    fontSize: 18,
  },

  panelBtn: {
    border: `1px solid ${colors.border}`,
    background: colors.cream2,
    color: colors.green,
    cursor: 'pointer',
    padding: '9px 11px',
    fontSize: 11,
    fontWeight: 900,
    textTransform: 'uppercase',
    borderRadius: 12,
  },

  list: {
    display: 'grid',
    gap: 12,
  },

  row: {
    display: 'grid',
    gridTemplateColumns: '54px 1fr auto',
    gap: 12,
    alignItems: 'start',
    background: colors.cream2,
    border: `1px solid ${colors.border}`,
    padding: 14,
    borderRadius: 18,
  },

  rowIcon: {
    width: 44,
    height: 44,
    display: 'grid',
    placeItems: 'center',
    border: `1px solid ${colors.border}`,
    background: colors.white,
    borderRadius: 14,
  },

  rowContent: {
    minWidth: 0,
  },

  rowTitle: {
    color: colors.greenDeep,
    fontWeight: 900,
    fontSize: 15,
  },

  rowMeta: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 4,
  },

  rowSub: {
    color: colors.text,
    fontSize: 12,
    marginTop: 6,
  },

  radiusBadge: {
    color: colors.greenDark,
    background: colors.greenPale,
    border: `1px solid ${colors.border}`,
    fontSize: 11,
    fontWeight: 900,
    padding: '7px 9px',
    borderRadius: 999,
  },

  statusBadge: {
    padding: '7px 9px',
    fontSize: 11,
    fontWeight: 900,
    textTransform: 'capitalize',
    borderRadius: 999,
  },

  quickBox: {
    border: `1px dashed ${colors.borderStrong}`,
    minHeight: 150,
    display: 'grid',
    placeItems: 'center',
    textAlign: 'center',
    padding: 18,
    background: colors.cream2,
    borderRadius: 18,
  },

  quickIconBox: {
    marginBottom: 8,
  },

  quickTitle: {
    color: colors.greenDeep,
    fontWeight: 900,
    marginTop: 4,
  },

  quickText: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 1.6,
    maxWidth: 230,
  },

  primaryBtnFull: {
    marginTop: 12,
    border: 'none',
    background: colors.greenDark,
    color: colors.white,
    padding: '11px 13px',
    fontSize: 11,
    fontWeight: 900,
    cursor: 'pointer',
    textTransform: 'uppercase',
    borderRadius: 12,
  },

  compactList: {
    display: 'grid',
    gap: 10,
  },

  compactRow: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 12,
    background: colors.cream2,
    border: `1px solid ${colors.border}`,
    padding: 12,
    borderRadius: 16,
  },

  empty: {
    border: `1px dashed ${colors.borderStrong}`,
    minHeight: 270,
    display: 'grid',
    placeItems: 'center',
    textAlign: 'center',
    padding: 20,
    background: colors.cream2,
    borderRadius: 18,
  },

  emptyCompact: {
    border: `1px dashed ${colors.borderStrong}`,
    minHeight: 130,
    display: 'grid',
    placeItems: 'center',
    textAlign: 'center',
    padding: 16,
    background: colors.cream2,
    borderRadius: 18,
  },

  emptyTitle: {
    color: colors.greenDeep,
    fontWeight: 900,
  },

  emptyText: {
    color: colors.muted,
    fontSize: 12,
    maxWidth: 260,
    lineHeight: 1.6,
  },

  footer: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 14,
    flexWrap: 'wrap',
    marginTop: 28,
    paddingTop: 18,
    borderTop: `1px solid ${colors.border}`,
    color: 'rgba(18,53,31,0.48)',
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
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
  input {
    font-family: inherit;
  }

  button {
    transition: transform .15s ease, opacity .15s ease, background .15s ease;
  }

  button:hover {
    transform: translateY(-1px);
    opacity: .96;
  }

  @media (max-width: 1000px) {
    div[style*="grid-template-columns: 250px 1fr"] {
      grid-template-columns: 1fr !important;
    }

    aside {
      min-height: auto !important;
      position: static !important;
    }

    nav {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 900px) {
    div[style*="grid-template-columns: repeat(2, minmax(0, 1fr))"],
    div[style*="grid-template-columns: 1fr 330px"] {
      grid-template-columns: 1fr !important;
    }

    section[style*="justify-content: space-between"],
    div[style*="justify-content: space-between"] {
      flex-direction: column;
    }
  }

  @media (max-width: 560px) {
    div[style*="grid-template-columns: 54px 1fr auto"] {
      grid-template-columns: 1fr !important;
    }
  }
`;