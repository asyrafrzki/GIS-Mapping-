import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  useMapEvents,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const STORAGE_KEY = 'soilmap_digitasi_points';

const DEFAULT_CENTER = [-6.9175, 107.6191];
const DEFAULT_ZOOM = 9;

const EMPTY_FORM = {
  jenis: 'sampel',
  nama: '',
  tanggal: '',
  deskripsi: '',
  kondisiTanah: '',
  statusTindakLanjut: 'belum ditindaklanjuti',
  radius: 100,
};

const JENIS_OPTIONS = [
  { value: 'sampel', label: 'Titik Sampel Tanah' },
  { value: 'observasi', label: 'Titik Observasi' },
  { value: 'masalah', label: 'Titik Masalah Lahan' },
];

const STATUS_OPTIONS = [
  'belum ditindaklanjuti',
  'perlu validasi',
  'dalam proses',
  'selesai',
];

const RADIUS_OPTIONS = [50, 100, 250];

function createColoredIcon(color) {
  return L.divIcon({
    className: '',
    html: `
      <div style="
        width:18px;
        height:18px;
        border-radius:999px;
        background:${color};
        border:3px solid white;
        box-shadow:0 2px 10px rgba(0,0,0,0.35);
      "></div>
    `,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    popupAnchor: [0, -10],
  });
}

const ICONS = {
  sampel: createColoredIcon('#52b96a'),
  observasi: createColoredIcon('#60a5fa'),
  masalah: createColoredIcon('#ef4444'),
};

function getJenisLabel(jenis) {
  return JENIS_OPTIONS.find((j) => j.value === jenis)?.label || jenis;
}

function getJenisColor(jenis) {
  if (jenis === 'sampel') return '#52b96a';
  if (jenis === 'observasi') return '#60a5fa';
  if (jenis === 'masalah') return '#ef4444';
  return '#a78bfa';
}

function MapClickHandler({ onAddPointMode, onMapClick }) {
  useMapEvents({
    click(e) {
      if (onAddPointMode) {
        onMapClick(e.latlng);
      }
    },
  });
  return null;
}

function FlyToPoint({ target }) {
  const map = useMapEvents({});
  useEffect(() => {
    if (target) {
      map.flyTo([target.lat, target.lng], 15, { duration: 1.2 });
    }
  }, [target, map]);
  return null;
}

export default function Digitasi({ onNavigate }) {
  const [points, setPoints] = useState([]);
  const [addMode, setAddMode] = useState(false);
  const [selectedLatLng, setSelectedLatLng] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [filterJenis, setFilterJenis] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [search, setSearch] = useState('');
  const [flyTarget, setFlyTarget] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [mapStyle, setMapStyle] = useState('osm');

  const formRef = useRef(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setPoints(parsed);
      }
    } catch (err) {
      console.error('Gagal membaca titik digitasi:', err);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(points));
    } catch (err) {
      console.error('Gagal menyimpan titik digitasi:', err);
      alert('Gagal menyimpan data titik.');
    }
  }, [points]);

  const filteredPoints = useMemo(() => {
    return points.filter((p) => {
      const matchJenis = filterJenis ? p.jenis === filterJenis : true;
      const matchStatus = filterStatus ? p.statusTindakLanjut === filterStatus : true;
      const q = search.trim().toLowerCase();
      const matchSearch = q
        ? [
            p.nama,
            p.deskripsi,
            p.kondisiTanah,
            p.statusTindakLanjut,
            p.jenis,
            String(p.radius || ''),
          ]
            .join(' ')
            .toLowerCase()
            .includes(q)
        : true;

      return matchJenis && matchStatus && matchSearch;
    });
  }, [points, filterJenis, filterStatus, search]);

  const tileLayers = {
    osm: {
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      attr: '© OpenStreetMap',
    },
    topo: {
      url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
      attr: '© OpenTopoMap',
    },
    satellite: {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      attr: '© Esri',
    },
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setSelectedLatLng(null);
    setEditingId(null);
  };

  const handleMapClick = (latlng) => {
    setSelectedLatLng(latlng);
    setEditingId(null);
    setForm({
      ...EMPTY_FORM,
      tanggal: new Date().toISOString().slice(0, 10),
    });
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!selectedLatLng && !editingId) {
      alert('Klik peta terlebih dahulu untuk menentukan titik.');
      return;
    }

    if (!form.nama.trim() || !form.tanggal || !form.kondisiTanah.trim()) {
      alert('Nama titik, tanggal, dan kondisi tanah wajib diisi.');
      return;
    }

    const radiusValue = Number(form.radius);
    if (Number.isNaN(radiusValue) || radiusValue <= 0) {
      alert('Radius harus lebih dari 0 meter.');
      return;
    }

    if (editingId) {
      setPoints((prev) =>
        prev.map((p) =>
          p.id === editingId
            ? {
                ...p,
                ...form,
                radius: radiusValue,
                updatedAt: new Date().toLocaleString('id-ID'),
              }
            : p
        )
      );
      alert('Titik berhasil diperbarui.');
      resetForm();
      return;
    }

    const newPoint = {
      id: Date.now(),
      ...form,
      radius: radiusValue,
      lat: selectedLatLng.lat,
      lng: selectedLatLng.lng,
      createdAt: new Date().toLocaleString('id-ID'),
    };

    setPoints((prev) => [newPoint, ...prev]);
    alert('Titik berhasil ditambahkan.');
    resetForm();
  };

  const handleEdit = (point) => {
    setEditingId(point.id);
    setSelectedLatLng({ lat: point.lat, lng: point.lng });
    setForm({
      jenis: point.jenis,
      nama: point.nama,
      tanggal: point.tanggal,
      deskripsi: point.deskripsi || '',
      kondisiTanah: point.kondisiTanah,
      statusTindakLanjut: point.statusTindakLanjut,
      radius: point.radius || 100,
    });
    setFlyTarget(point);
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleDelete = (id) => {
    const ok = window.confirm('Hapus titik ini?');
    if (!ok) return;
    setPoints((prev) => prev.filter((p) => p.id !== id));
    if (editingId === id) resetForm();
  };

  const handleDeleteAll = () => {
    if (!points.length) return;
    const ok = window.confirm('Hapus semua titik digitasi?');
    if (!ok) return;
    setPoints([]);
    resetForm();
  };

  const handleZoomTo = (point) => {
    setFlyTarget(point);
  };

  const cardCount = {
    total: points.length,
    sampel: points.filter((p) => p.jenis === 'sampel').length,
    observasi: points.filter((p) => p.jenis === 'observasi').length,
    masalah: points.filter((p) => p.jenis === 'masalah').length,
  };

  return (
    <div style={styles.page}>
      <style>{css}</style>

      <div style={styles.header}>
        <div>
          <div style={styles.kicker}>MODUL DIGITASI</div>
          <h1 style={styles.title}>Penandaan Titik Temuan Lapangan</h1>
          <p style={styles.desc}>
            Modul ini digunakan untuk menambahkan titik sampel tanah, titik observasi,
            dan titik masalah lahan secara manual pada peta interaktif, lengkap dengan
            radius buffer area pengamatan.
          </p>
        </div>

        <div style={styles.headerActions}>
          <button style={styles.ghostBtn} onClick={() => onNavigate('map')}>
            ← Kembali ke Peta
          </button>
        </div>
      </div>

      <div style={styles.summaryGrid}>
        <div className="glass-card" style={styles.summaryCard}>
          <div style={styles.summaryValue}>{cardCount.total}</div>
          <div style={styles.summaryLabel}>Total Titik</div>
        </div>
        <div className="glass-card" style={styles.summaryCard}>
          <div style={{ ...styles.summaryValue, color: '#52b96a' }}>{cardCount.sampel}</div>
          <div style={styles.summaryLabel}>Sampel Tanah</div>
        </div>
        <div className="glass-card" style={styles.summaryCard}>
          <div style={{ ...styles.summaryValue, color: '#60a5fa' }}>{cardCount.observasi}</div>
          <div style={styles.summaryLabel}>Observasi</div>
        </div>
        <div className="glass-card" style={styles.summaryCard}>
          <div style={{ ...styles.summaryValue, color: '#ef4444' }}>{cardCount.masalah}</div>
          <div style={styles.summaryLabel}>Masalah Lahan</div>
        </div>
      </div>

      <div style={styles.layout}>
        <aside style={styles.leftPanel}>
          <section className="glass-card" style={styles.panelBlock}>
            <div style={styles.sectionTitle}>Kontrol Digitasi</div>

            <div style={styles.buttonRow}>
              <button
                style={{
                  ...styles.primaryBtn,
                  background: addMode ? '#16a34a' : '#52b96a',
                }}
                onClick={() => setAddMode((prev) => !prev)}
              >
                {addMode ? '✓ Mode Tambah Aktif' : '+ Aktifkan Mode Tambah'}
              </button>

              <button style={styles.secondaryBtn} onClick={resetForm}>
                Reset Form
              </button>
            </div>

            <div style={styles.tipBox}>
              {addMode
                ? 'Mode tambah aktif. Klik peta untuk menentukan titik baru.'
                : 'Aktifkan mode tambah lalu klik peta untuk menambahkan marker.'}
            </div>

            <label style={styles.label}>Basemap</label>
            <select
              value={mapStyle}
              onChange={(e) => setMapStyle(e.target.value)}
              style={styles.input}
            >
              <option value="osm">OpenStreetMap</option>
              <option value="topo">Topo</option>
              <option value="satellite">Satellite</option>
            </select>
          </section>

          <section className="glass-card" style={styles.panelBlock} ref={formRef}>
            <div style={styles.sectionTitle}>
              {editingId ? 'Edit Titik' : 'Form Titik Baru'}
            </div>

            <form onSubmit={handleSubmit}>
              <label style={styles.label}>Jenis Titik</label>
              <select
                value={form.jenis}
                onChange={(e) => setForm((prev) => ({ ...prev, jenis: e.target.value }))}
                style={styles.input}
              >
                {JENIS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>

              <label style={styles.label}>Nama Titik</label>
              <input
                type="text"
                placeholder="Contoh: Sampel Blok A"
                value={form.nama}
                onChange={(e) => setForm((prev) => ({ ...prev, nama: e.target.value }))}
                style={styles.input}
              />

              <label style={styles.label}>Tanggal</label>
              <input
                type="date"
                value={form.tanggal}
                onChange={(e) => setForm((prev) => ({ ...prev, tanggal: e.target.value }))}
                style={styles.input}
              />

              <label style={styles.label}>Kondisi Tanah</label>
              <input
                type="text"
                placeholder="Contoh: lembap, gembur, warna coklat"
                value={form.kondisiTanah}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, kondisiTanah: e.target.value }))
                }
                style={styles.input}
              />

              <label style={styles.label}>Status Tindak Lanjut</label>
              <select
                value={form.statusTindakLanjut}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    statusTindakLanjut: e.target.value,
                  }))
                }
                style={styles.input}
              >
                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>

              <label style={styles.label}>Radius Buffer</label>
              <div style={styles.radiusRow}>
                {RADIUS_OPTIONS.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, radius: r }))}
                    style={{
                      ...styles.radiusBtn,
                      background:
                        Number(form.radius) === r
                          ? 'rgba(168,85,247,0.18)'
                          : 'rgba(255,255,255,0.04)',
                      borderColor:
                        Number(form.radius) === r
                          ? 'rgba(168,85,247,0.35)'
                          : 'rgba(255,255,255,0.08)',
                      color:
                        Number(form.radius) === r
                          ? '#c084fc'
                          : 'rgba(255,255,255,0.7)',
                    }}
                  >
                    {r} m
                  </button>
                ))}
              </div>

              <label style={styles.label}>Atau Input Radius Manual (meter)</label>
              <input
                type="number"
                min="1"
                placeholder="Contoh: 150"
                value={form.radius}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, radius: e.target.value }))
                }
                style={styles.input}
              />

              <label style={styles.label}>Deskripsi</label>
              <textarea
                rows={4}
                placeholder="Tulis deskripsi temuan lapangan..."
                value={form.deskripsi}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, deskripsi: e.target.value }))
                }
                style={styles.textarea}
              />

              <div style={styles.coordinateBox}>
                {selectedLatLng ? (
                  <>
                    <div>
                      <strong>Lat:</strong> {selectedLatLng.lat.toFixed(6)}
                    </div>
                    <div>
                      <strong>Lng:</strong> {selectedLatLng.lng.toFixed(6)}
                    </div>
                    <div>
                      <strong>Radius:</strong> {Number(form.radius) || 0} meter
                    </div>
                  </>
                ) : editingId ? (
                  <div>
                    Sedang mengedit titik yang sudah ada. Radius saat ini: {Number(form.radius) || 0} meter.
                  </div>
                ) : (
                  <div>Belum ada titik dipilih. Klik peta dulu.</div>
                )}
              </div>

              <div style={styles.buttonRow}>
                <button type="submit" style={styles.primaryBtn}>
                  {editingId ? 'Simpan Perubahan' : 'Simpan Titik'}
                </button>
                <button
                  type="button"
                  style={styles.secondaryBtn}
                  onClick={resetForm}
                >
                  Batal
                </button>
              </div>
            </form>
          </section>
        </aside>

        <section style={styles.mapSection}>
          <div className="glass-card" style={styles.mapCard}>
            <MapContainer
              center={DEFAULT_CENTER}
              zoom={DEFAULT_ZOOM}
              style={styles.map}
            >
              <TileLayer
                url={tileLayers[mapStyle].url}
                attribution={tileLayers[mapStyle].attr}
              />

              <MapClickHandler
                onAddPointMode={addMode}
                onMapClick={handleMapClick}
              />

              <FlyToPoint target={flyTarget} />

              {points.map((point) => {
                const color = getJenisColor(point.jenis);
                return (
                  <React.Fragment key={point.id}>
                    <Circle
                      center={[point.lat, point.lng]}
                      radius={point.radius || 100}
                      pathOptions={{
                        color,
                        weight: 2,
                        fillColor: color,
                        fillOpacity: 0.12,
                      }}
                    />
                    <Marker
                      position={[point.lat, point.lng]}
                      icon={ICONS[point.jenis] || ICONS.observasi}
                    >
                      <Popup>
                        <div style={{ minWidth: 220, fontFamily: 'Inter, sans-serif' }}>
                          <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>
                            {getJenisLabel(point.jenis)}
                          </div>
                          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>
                            {point.nama}
                          </div>
                          <div><strong>Tanggal:</strong> {point.tanggal}</div>
                          <div><strong>Kondisi:</strong> {point.kondisiTanah}</div>
                          <div><strong>Status:</strong> {point.statusTindakLanjut}</div>
                          <div><strong>Radius:</strong> {point.radius || 100} meter</div>
                          {point.deskripsi && (
                            <div style={{ marginTop: 8 }}>
                              <strong>Deskripsi:</strong> {point.deskripsi}
                            </div>
                          )}
                        </div>
                      </Popup>
                    </Marker>
                  </React.Fragment>
                );
              })}

              {selectedLatLng && !editingId && (
                <>
                  <Circle
                    center={[selectedLatLng.lat, selectedLatLng.lng]}
                    radius={Number(form.radius) || 100}
                    pathOptions={{
                      color: '#f59e0b',
                      weight: 2,
                      fillColor: '#f59e0b',
                      fillOpacity: 0.12,
                      dashArray: '6 4',
                    }}
                  />
                  <Marker
                    position={[selectedLatLng.lat, selectedLatLng.lng]}
                    icon={createColoredIcon('#f59e0b')}
                  >
                    <Popup>Titik baru dipilih</Popup>
                  </Marker>
                </>
              )}
            </MapContainer>
          </div>

          <div className="glass-card" style={styles.listCard}>
            <div style={styles.listHeader}>
              <div>
                <div style={styles.sectionTitle}>Daftar Titik Temuan</div>
                <div style={styles.metaText}>
                  Klik “Lihat di Peta” untuk zoom ke titik
                </div>
              </div>
              <button style={styles.deleteBtn} onClick={handleDeleteAll}>
                Hapus Semua
              </button>
            </div>

            <div style={styles.filterGrid}>
              <input
                type="text"
                placeholder="Cari nama / deskripsi / kondisi..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={styles.input}
              />

              <select
                value={filterJenis}
                onChange={(e) => setFilterJenis(e.target.value)}
                style={styles.input}
              >
                <option value="">Semua Jenis</option>
                {JENIS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                style={styles.input}
              >
                <option value="">Semua Status</option>
                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>

            <div style={styles.resetFilterRow}>
              <button
                style={styles.secondaryBtn}
                onClick={() => {
                  setSearch('');
                  setFilterJenis('');
                  setFilterStatus('');
                }}
              >
                Reset Filter
              </button>
            </div>

            <div style={styles.listWrap}>
              {filteredPoints.length === 0 ? (
                <div style={styles.emptyState}>Belum ada titik yang cocok.</div>
              ) : (
                filteredPoints.map((point) => (
                  <div key={point.id} style={styles.itemCard}>
                    <div style={styles.itemTop}>
                      <div>
                        <div style={styles.itemTitle}>{point.nama}</div>
                        <div style={styles.itemMeta}>
                          {getJenisLabel(point.jenis)} · {point.tanggal}
                        </div>
                      </div>
                      <span
                        style={{
                          ...styles.badge,
                          background:
                            point.jenis === 'sampel'
                              ? 'rgba(82,185,106,0.14)'
                              : point.jenis === 'observasi'
                              ? 'rgba(96,165,250,0.14)'
                              : 'rgba(239,68,68,0.14)',
                          color:
                            point.jenis === 'sampel'
                              ? '#52b96a'
                              : point.jenis === 'observasi'
                              ? '#60a5fa'
                              : '#ef4444',
                        }}
                      >
                        {point.jenis}
                      </span>
                    </div>

                    <div style={styles.itemInfo}><strong>Kondisi:</strong> {point.kondisiTanah}</div>
                    <div style={styles.itemInfo}><strong>Status:</strong> {point.statusTindakLanjut}</div>
                    <div style={styles.itemInfo}>
                      <strong>Koordinat:</strong> {point.lat.toFixed(5)}, {point.lng.toFixed(5)}
                    </div>
                    <div style={styles.itemInfo}>
                      <strong>Radius Buffer:</strong> {point.radius || 100} meter
                    </div>

                    {point.deskripsi && (
                      <div style={styles.descBox}>{point.deskripsi}</div>
                    )}

                    <div style={styles.actionRow}>
                      <button
                        style={styles.primaryBtn}
                        onClick={() => handleZoomTo(point)}
                      >
                        Lihat di Peta
                      </button>
                      <button
                        style={styles.secondaryBtn}
                        onClick={() => handleEdit(point)}
                      >
                        Edit
                      </button>
                      <button
                        style={styles.deleteBtn}
                        onClick={() => handleDelete(point.id)}
                      >
                        Hapus
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    background: '#0a0a12',
    color: '#fff',
    padding: 20,
    fontFamily: 'Inter, system-ui, sans-serif',
  },
  header: {
    maxWidth: 1500,
    margin: '0 auto 18px',
    display: 'flex',
    justifyContent: 'space-between',
    gap: 16,
    flexWrap: 'wrap',
    alignItems: 'flex-start',
  },
  kicker: {
    fontSize: 11,
    letterSpacing: 2,
    color: 'rgba(255,255,255,0.35)',
    marginBottom: 8,
  },
  title: {
    margin: 0,
    fontSize: 34,
    letterSpacing: '-1px',
  },
  desc: {
    marginTop: 10,
    maxWidth: 760,
    color: 'rgba(255,255,255,0.58)',
    lineHeight: 1.8,
  },
  headerActions: {
    display: 'flex',
    gap: 10,
    flexWrap: 'wrap',
  },
  summaryGrid: {
    maxWidth: 1500,
    margin: '0 auto 18px',
    display: 'grid',
    gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
    gap: 14,
  },
  summaryCard: {
    padding: 18,
    borderRadius: 16,
  },
  summaryValue: {
    fontSize: 28,
    fontWeight: 800,
    color: '#fff',
  },
  summaryLabel: {
    marginTop: 6,
    color: 'rgba(255,255,255,0.45)',
    fontSize: 13,
  },
  layout: {
    maxWidth: 1500,
    margin: '0 auto',
    display: 'grid',
    gridTemplateColumns: '380px 1fr',
    gap: 18,
    alignItems: 'start',
  },
  leftPanel: {
    display: 'flex',
    flexDirection: 'column',
    gap: 18,
  },
  panelBlock: {
    padding: 18,
    borderRadius: 18,
  },
  mapSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: 18,
  },
  mapCard: {
    padding: 12,
    borderRadius: 18,
  },
  map: {
    width: '100%',
    height: 520,
    borderRadius: 14,
    overflow: 'hidden',
  },
  listCard: {
    padding: 18,
    borderRadius: 18,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 700,
    marginBottom: 14,
  },
  label: {
    display: 'block',
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 14,
    marginBottom: 8,
  },
  input: {
    width: '100%',
    padding: '12px 14px',
    borderRadius: 10,
    border: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(255,255,255,0.04)',
    color: '#fff',
    outline: 'none',
  },
  textarea: {
    width: '100%',
    minHeight: 110,
    resize: 'vertical',
    padding: '12px 14px',
    borderRadius: 10,
    border: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(255,255,255,0.04)',
    color: '#fff',
    outline: 'none',
    fontFamily: 'inherit',
  },
  radiusRow: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
  },
  radiusBtn: {
    padding: '9px 12px',
    borderRadius: 999,
    border: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(255,255,255,0.04)',
    cursor: 'pointer',
    fontWeight: 600,
  },
  coordinateBox: {
    marginTop: 14,
    padding: 12,
    borderRadius: 10,
    background: 'rgba(255,255,255,0.035)',
    border: '1px solid rgba(255,255,255,0.06)',
    color: 'rgba(255,255,255,0.68)',
    fontSize: 13,
    lineHeight: 1.7,
  },
  tipBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 10,
    background: 'rgba(96,165,250,0.08)',
    border: '1px solid rgba(96,165,250,0.15)',
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 1.7,
    fontSize: 13,
  },
  listHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 12,
    flexWrap: 'wrap',
    alignItems: 'center',
    marginBottom: 12,
  },
  metaText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.45)',
  },
  filterGrid: {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr 1fr',
    gap: 12,
  },
  resetFilterRow: {
    marginTop: 12,
    marginBottom: 14,
  },
  listWrap: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  itemCard: {
    padding: 16,
    borderRadius: 14,
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.06)',
  },
  itemTop: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 12,
    flexWrap: 'wrap',
    alignItems: 'flex-start',
  },
  itemTitle: {
    fontSize: 18,
    fontWeight: 700,
    marginBottom: 4,
  },
  itemMeta: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.45)',
  },
  itemInfo: {
    marginTop: 10,
    color: 'rgba(255,255,255,0.75)',
    fontSize: 14,
  },
  descBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 10,
    background: 'rgba(255,255,255,0.035)',
    border: '1px solid rgba(255,255,255,0.06)',
    color: 'rgba(255,255,255,0.72)',
    lineHeight: 1.7,
  },
  badge: {
    padding: '6px 10px',
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 700,
    textTransform: 'capitalize',
  },
  actionRow: {
    marginTop: 14,
    display: 'flex',
    gap: 10,
    flexWrap: 'wrap',
  },
  buttonRow: {
    display: 'flex',
    gap: 10,
    flexWrap: 'wrap',
  },
  primaryBtn: {
    padding: '11px 14px',
    borderRadius: 10,
    border: 'none',
    background: '#52b96a',
    color: '#fff',
    cursor: 'pointer',
    fontWeight: 700,
  },
  secondaryBtn: {
    padding: '11px 14px',
    borderRadius: 10,
    border: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(255,255,255,0.04)',
    color: '#fff',
    cursor: 'pointer',
    fontWeight: 600,
  },
  ghostBtn: {
    padding: '12px 16px',
    borderRadius: 12,
    border: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(255,255,255,0.04)',
    color: '#fff',
    cursor: 'pointer',
    fontWeight: 600,
  },
  deleteBtn: {
    padding: '11px 14px',
    borderRadius: 10,
    border: '1px solid rgba(239,68,68,0.25)',
    background: 'rgba(239,68,68,0.12)',
    color: '#fca5a5',
    cursor: 'pointer',
    fontWeight: 700,
  },
  emptyState: {
    padding: '26px 16px',
    borderRadius: 14,
    border: '1px dashed rgba(255,255,255,0.12)',
    color: 'rgba(255,255,255,0.35)',
    textAlign: 'center',
  },
};

const css = `
  * { box-sizing: border-box; }

  .glass-card {
    background: rgba(255,255,255,0.025);
    border: 1px solid rgba(255,255,255,0.06);
    backdrop-filter: blur(10px);
  }

  button {
    transition: 0.2s ease;
  }

  button:hover {
    transform: translateY(-1px);
    opacity: 0.96;
  }

  @media (max-width: 1200px) {
    div[style*="grid-template-columns: 380px 1fr"] {
      grid-template-columns: 1fr !important;
    }

    div[style*="grid-template-columns: repeat(4, minmax(0, 1fr))"] {
      grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
    }
  }

  @media (max-width: 760px) {
    div[style*="grid-template-columns: repeat(2, minmax(0, 1fr))"] {
      grid-template-columns: 1fr !important;
    }

    div[style*="grid-template-columns: 2fr 1fr 1fr"] {
      grid-template-columns: 1fr !important;
    }

    button:hover {
      transform: none;
    }
  }
`;