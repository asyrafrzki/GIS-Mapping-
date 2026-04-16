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
import { apiRequest } from './services/api';
import 'leaflet/dist/leaflet.css';

const DEFAULT_CENTER = [-6.9175, 107.6191];
const DEFAULT_ZOOM = 9;

const EMPTY_FORM = {
  jenis: 'sampel',
  nama: '',
  tanggal: '',
  tanahUser: '',
  lokasi: '',
  daerah: '',
  deskripsi: '',
  statusTindakLanjut: '',
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
    html: `<div style="width:18px;height:18px;border-radius:999px;background:${color};border:3px solid white;box-shadow:0 2px 10px rgba(0,0,0,0.35);"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    popupAnchor: [0, -10],
  });
}

const ICONS = {
  sampel: createColoredIcon('#22c55e'),
  observasi: createColoredIcon('#60a5fa'),
  masalah: createColoredIcon('#ef4444'),
};

function getJenisColor(jenis) {
  if (jenis === 'sampel') return '#22c55e';
  if (jenis === 'observasi') return '#60a5fa';
  if (jenis === 'masalah') return '#ef4444';
  return '#a78bfa';
}

function getJenisLabel(jenis) {
  const found = JENIS_OPTIONS.find((item) => item.value === jenis);
  return found ? found.label : jenis;
}

async function reverseGeocode(lat, lng) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`,
      {
        headers: {
          Accept: 'application/json',
        },
      }
    );

    if (!res.ok) {
      throw new Error('Gagal mengambil lokasi');
    }

    const data = await res.json();
    const addr = data.address || {};

    const lokasi =
      addr.village ||
      addr.suburb ||
      addr.hamlet ||
      addr.road ||
      addr.neighbourhood ||
      addr.town ||
      addr.city_district ||
      '';

    const daerah =
      addr.city ||
      addr.county ||
      addr.state_district ||
      addr.state ||
      '';

    return {
      lokasi,
      daerah,
    };
  } catch (err) {
    console.error('reverseGeocode error:', err);
    return {
      lokasi: '',
      daerah: '',
    };
  }
}

function MapClickHandler({ addMode, onMapClick }) {
  useMapEvents({
    click(e) {
      if (addMode) onMapClick(e.latlng);
    },
  });
  return null;
}

export default function Digitasi({ onNavigate, token }) {
  const [points, setPoints] = useState([]);
  const [addMode, setAddMode] = useState(false);
  const [selectedLatLng, setSelectedLatLng] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const formRef = useRef(null);

  const isMasalah = form.jenis === 'masalah';

  const loadPoints = async () => {
    try {
      const data = await apiRequest('/points', { token });
      setPoints(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadPoints();
  }, [token]);

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setSelectedLatLng(null);
    setEditingId(null);
    setLoadingLocation(false);
  };

  const onMapClick = async (latlng) => {
    setSelectedLatLng(latlng);
    setEditingId(null);
    setLoadingLocation(true);

    const geo = await reverseGeocode(latlng.lat, latlng.lng);

    setForm((prev) => ({
      ...EMPTY_FORM,
      jenis: prev.jenis,
      radius: prev.radius || 100,
      tanggal: new Date().toISOString().slice(0, 10),
      lokasi: geo.lokasi,
      daerah: geo.daerah,
      statusTindakLanjut: prev.jenis === 'masalah' ? 'belum ditindaklanjuti' : '',
    }));

    setLoadingLocation(false);
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  const submit = async (e) => {
    e.preventDefault();

    if (!form.nama.trim()) {
      alert('Nama titik wajib diisi.');
      return;
    }

    if (!form.tanggal) {
      alert('Tanggal wajib diisi.');
      return;
    }

    if (!editingId && !selectedLatLng) {
      alert('Klik peta terlebih dahulu untuk menentukan titik.');
      return;
    }

    if ((form.jenis === 'sampel' || form.jenis === 'observasi') && !form.tanahUser.trim()) {
      alert('Nama tanah user wajib diisi untuk titik sampel atau observasi.');
      return;
    }

    if (!form.lokasi.trim() || !form.daerah.trim()) {
      alert('Lokasi dan daerah wajib terisi.');
      return;
    }

    if (Number(form.radius) <= 0) {
      alert('Radius harus lebih dari 0.');
      return;
    }

    const payload = {
      ...form,
      radius: Number(form.radius),
      kondisiTanah: '',
      statusTindakLanjut: form.jenis === 'masalah' ? form.statusTindakLanjut : '',
      deskripsi: form.jenis === 'masalah' ? form.deskripsi : '',
      tanahUser: form.jenis === 'masalah' ? '' : form.tanahUser,
      lat: editingId ? form.lat : selectedLatLng?.lat,
      lng: editingId ? form.lng : selectedLatLng?.lng,
    };

    try {
      if (editingId) {
        await apiRequest(`/points/${editingId}`, {
          method: 'PUT',
          token,
          body: payload,
        });
      } else {
        await apiRequest('/points', {
          method: 'POST',
          token,
          body: payload,
        });
      }

      await loadPoints();
      resetForm();
    } catch (err) {
      alert(err.message);
    }
  };

  const editPoint = (p) => {
    setEditingId(p.id);
    setSelectedLatLng({ lat: p.lat, lng: p.lng });

    setForm({
      jenis: p.jenis,
      nama: p.nama || '',
      tanggal: p.tanggal?.slice(0, 10) || '',
      tanahUser: p.tanah_user || '',
      lokasi: p.lokasi || '',
      daerah: p.daerah || '',
      deskripsi: p.jenis === 'masalah' ? p.deskripsi || '' : '',
      statusTindakLanjut: p.jenis === 'masalah' ? p.status_tindak_lanjut || 'belum ditindaklanjuti' : '',
      radius: p.radius || 100,
      lat: p.lat,
      lng: p.lng,
    });

    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  const removePoint = async (id) => {
    const ok = window.confirm('Hapus titik ini?');
    if (!ok) return;

    try {
      await apiRequest(`/points/${id}`, {
        method: 'DELETE',
        token,
      });
      await loadPoints();
    } catch (err) {
      alert(err.message);
    }
  };

  const sendReport = async (pointId) => {
    try {
      await apiRequest(`/reports/from-point/${pointId}`, {
        method: 'POST',
        token,
      });
      alert('Laporan berhasil dikirim. Status: menunggu persetujuan.');
    } catch (err) {
      alert(err.message);
    }
  };

  const totalRadius = useMemo(
    () => points.reduce((sum, p) => sum + Number(p.radius || 0), 0),
    [points]
  );

  return (
    <div style={s.page}>
      <style>{css}</style>

      <div style={s.topBar}>
        <div>
          <div style={s.kicker}>DIGITASI USER</div>
          <h1 style={s.title}>Digitasi Lahan Saya</h1>
          <p style={s.desc}>
            Simpan titik lahan lengkap dengan lokasi, daerah, koordinat, dan radius area otomatis dari peta.
          </p>
        </div>

        <button onClick={() => onNavigate('user-dashboard')} style={s.secondaryBtn}>
          ← Dashboard User
        </button>
      </div>

      <div style={s.summaryGrid}>
        <div style={s.summaryCard} className="glass">
          <div style={s.summaryValue}>{points.length}</div>
          <div style={s.summaryLabel}>Total Titik</div>
        </div>

        <div style={s.summaryCard} className="glass">
          <div style={{ ...s.summaryValue, color: '#a78bfa' }}>{totalRadius} m</div>
          <div style={s.summaryLabel}>Total Akumulasi Radius</div>
        </div>
      </div>

      <div style={s.layout}>
        <div style={s.leftCol}>
          <div style={s.card} className="glass">
            <div style={s.controlRow}>
              <button onClick={() => setAddMode((v) => !v)} style={s.primaryBtn}>
                {addMode ? 'Mode Tambah Aktif' : 'Aktifkan Mode Tambah'}
              </button>

              <button onClick={resetForm} style={s.secondaryBtn}>
                Reset
              </button>
            </div>

            <div style={s.helperBox}>
              {addMode
                ? 'Klik pada peta untuk menambahkan titik. Lokasi dan daerah akan terisi otomatis.'
                : 'Aktifkan mode tambah lalu klik peta untuk membuat titik baru.'}
            </div>

            <div ref={formRef} />
            <h3 style={s.cardTitle}>{editingId ? 'Edit Titik' : 'Form Titik'}</h3>

            <form onSubmit={submit}>
              <label style={s.label}>Jenis Titik</label>
              <select
                style={s.input}
                value={form.jenis}
                onChange={(e) =>
                  setForm((prev) => {
                    const newJenis = e.target.value;
                    return {
                      ...prev,
                      jenis: newJenis,
                      tanahUser: newJenis === 'masalah' ? '' : prev.tanahUser,
                      statusTindakLanjut: newJenis === 'masalah' ? 'belum ditindaklanjuti' : '',
                      deskripsi: newJenis === 'masalah' ? prev.deskripsi : '',
                    };
                  })
                }
              >
                {JENIS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>

              <label style={s.label}>Nama Titik</label>
              <input
                style={s.input}
                placeholder="Nama titik"
                value={form.nama}
                onChange={(e) => setForm({ ...form, nama: e.target.value })}
              />

              {!isMasalah && (
                <>
                  <label style={s.label}>Nama Tanah User</label>
                  <input
                    style={s.input}
                    placeholder="Contoh: Lahan kebun blok A"
                    value={form.tanahUser}
                    onChange={(e) => setForm({ ...form, tanahUser: e.target.value })}
                  />
                </>
              )}

              <label style={s.label}>Tanggal</label>
              <input
                style={s.input}
                type="date"
                value={form.tanggal}
                onChange={(e) => setForm({ ...form, tanggal: e.target.value })}
              />

              <label style={s.label}>Lokasi</label>
              <input
                style={s.input}
                placeholder={loadingLocation ? 'Mengambil lokasi otomatis...' : 'Lokasi otomatis dari peta'}
                value={form.lokasi}
                onChange={(e) => setForm({ ...form, lokasi: e.target.value })}
              />

              <label style={s.label}>Daerah</label>
              <input
                style={s.input}
                placeholder={loadingLocation ? 'Mengambil daerah otomatis...' : 'Daerah otomatis dari peta'}
                value={form.daerah}
                onChange={(e) => setForm({ ...form, daerah: e.target.value })}
              />

              {isMasalah && (
                <>
                  <label style={s.label}>Status Tindak Lanjut</label>
                  <select
                    style={s.input}
                    value={form.statusTindakLanjut}
                    onChange={(e) => setForm({ ...form, statusTindakLanjut: e.target.value })}
                  >
                    {STATUS_OPTIONS.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>

                  <label style={s.label}>Deskripsi</label>
                  <textarea
                    style={s.textarea}
                    placeholder="Deskripsi masalah lahan..."
                    value={form.deskripsi}
                    onChange={(e) => setForm({ ...form, deskripsi: e.target.value })}
                  />
                </>
              )}

              <label style={s.label}>Radius Buffer</label>
              <div style={s.radiusRow}>
                {RADIUS_OPTIONS.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setForm({ ...form, radius: r })}
                    style={{
                      ...s.radiusBtn,
                      background:
                        Number(form.radius) === r
                          ? 'rgba(168,85,247,0.18)'
                          : 'rgba(255,255,255,0.04)',
                      color: Number(form.radius) === r ? '#c084fc' : '#fff',
                      borderColor:
                        Number(form.radius) === r
                          ? 'rgba(168,85,247,0.3)'
                          : 'rgba(255,255,255,0.08)',
                    }}
                  >
                    {r} m
                  </button>
                ))}
              </div>

              <input
                style={s.input}
                type="number"
                placeholder="Radius manual"
                value={form.radius}
                onChange={(e) => setForm({ ...form, radius: e.target.value })}
              />

              <div style={s.coordBox}>
                {selectedLatLng ? (
                  <>
                    <div style={s.coordTitle}>Koordinat Titik</div>
                    <div>Lat: {selectedLatLng.lat.toFixed(6)}</div>
                    <div>Lng: {selectedLatLng.lng.toFixed(6)}</div>
                  </>
                ) : (
                  <div>Klik peta untuk menentukan koordinat titik.</div>
                )}
              </div>

              <button type="submit" style={s.primaryBtn}>
                {editingId ? 'Update Titik' : 'Simpan Titik'}
              </button>
            </form>
          </div>
        </div>

        <div style={s.rightCol}>
          <div style={s.card} className="glass">
            <MapContainer
              center={DEFAULT_CENTER}
              zoom={DEFAULT_ZOOM}
              style={{ height: 500, width: '100%', borderRadius: 18 }}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution="© OpenStreetMap"
              />

              <MapClickHandler addMode={addMode} onMapClick={onMapClick} />

              {points.map((p) => (
                <React.Fragment key={p.id}>
                  <Circle
                    center={[p.lat, p.lng]}
                    radius={p.radius}
                    pathOptions={{
                      color: getJenisColor(p.jenis),
                      weight: 2,
                      fillColor: getJenisColor(p.jenis),
                      fillOpacity: 0.12,
                    }}
                  />
                  <Marker position={[p.lat, p.lng]} icon={ICONS[p.jenis]}>
                    <Popup>
                      <div style={{ minWidth: 250 }}>
                        <strong>{p.nama}</strong>
                        <div>{getJenisLabel(p.jenis)}</div>

                        {(p.jenis === 'sampel' || p.jenis === 'observasi') && p.tanah_user && (
                          <div>Nama Tanah: {p.tanah_user}</div>
                        )}

                        <div>Lokasi: {p.lokasi || '-'}</div>
                        <div>Daerah: {p.daerah || '-'}</div>
                        <div>Lat: {Number(p.lat).toFixed(6)}</div>
                        <div>Lng: {Number(p.lng).toFixed(6)}</div>
                        <div>Radius: {p.radius} m</div>

                        {p.jenis === 'masalah' && p.status_tindak_lanjut?.trim() && (
                          <div>Status: {p.status_tindak_lanjut}</div>
                        )}

                        {p.jenis === 'masalah' && p.deskripsi && (
                          <div>Deskripsi: {p.deskripsi}</div>
                        )}
                      </div>
                    </Popup>
                  </Marker>
                </React.Fragment>
              ))}

              {selectedLatLng && !editingId && (
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
              )}
            </MapContainer>
          </div>

          <div style={s.card} className="glass">
            <h3 style={s.cardTitle}>Daftar Titik Saya</h3>

            {points.length === 0 ? (
              <div style={s.empty}>Belum ada titik.</div>
            ) : (
              points.map((p) => (
                <div key={p.id} style={s.pointItem}>
                  <div style={s.pointTop}>
                    <div>
                      <div style={s.pointTitle}>{p.nama}</div>
                      <div style={s.pointMeta}>
                        <span style={s.typeBadge}>{getJenisLabel(p.jenis)}</span>
                        <span>{p.lokasi || '-'} · {p.daerah || '-'}</span>
                      </div>
                    </div>

                    <span style={s.simpleBadge}>{p.radius} m</span>
                  </div>

                  {(p.jenis === 'sampel' || p.jenis === 'observasi') && p.tanah_user && (
                    <div style={s.pointInfo}>
                      <strong>Nama Tanah:</strong> {p.tanah_user}
                    </div>
                  )}

                  {p.jenis === 'masalah' && p.status_tindak_lanjut?.trim() && (
                    <div style={s.pointInfo}>
                      <strong>Status Tindak Lanjut:</strong> {p.status_tindak_lanjut}
                    </div>
                  )}

                  <div style={s.pointInfo}>
                    <strong>Koordinat:</strong> {Number(p.lat).toFixed(6)}, {Number(p.lng).toFixed(6)}
                  </div>

                  {p.jenis === 'masalah' && p.deskripsi && (
                    <div style={s.descBox}>{p.deskripsi}</div>
                  )}

                  <div style={s.actionRow}>
                    <button onClick={() => editPoint(p)} style={s.secondaryBtn}>
                      Edit
                    </button>

                    {p.jenis === 'masalah' && (
                      <button onClick={() => sendReport(p.id)} style={s.primaryBtn}>
                        Kirim Laporan
                      </button>
                    )}

                    <button onClick={() => removePoint(p.id)} style={s.dangerBtn}>
                      Hapus
                    </button>
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
  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0,1fr))',
    gap: 16,
    marginBottom: 18,
  },
  summaryCard: {
    padding: 20,
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
  cardTitle: {
    marginTop: 0,
    marginBottom: 14,
    fontSize: 24,
  },
  controlRow: {
    display: 'flex',
    gap: 10,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  helperBox: {
    padding: 14,
    borderRadius: 16,
    background: 'rgba(96,165,250,0.08)',
    border: '1px solid rgba(96,165,250,0.14)',
    color: 'rgba(255,255,255,0.72)',
    lineHeight: 1.8,
    marginBottom: 16,
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
    background: 'rgba(255,255,255,0.045)',
    color: '#fff',
    outline: 'none',
  },
  textarea: {
    width: '100%',
    minHeight: 120,
    resize: 'vertical',
    padding: '14px 16px',
    borderRadius: 16,
    border: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(255,255,255,0.045)',
    color: '#fff',
    outline: 'none',
    fontFamily: 'inherit',
  },
  radiusRow: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  radiusBtn: {
    padding: '9px 12px',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 999,
    cursor: 'pointer',
    fontWeight: 700,
  },
  coordBox: {
    marginTop: 14,
    marginBottom: 16,
    padding: 14,
    borderRadius: 16,
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.06)',
    color: 'rgba(255,255,255,0.74)',
    lineHeight: 1.8,
  },
  coordTitle: {
    fontWeight: 700,
    marginBottom: 6,
  },
  pointItem: {
    padding: '14px 0',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
  },
  pointTop: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 14,
    flexWrap: 'wrap',
    alignItems: 'flex-start',
  },
  pointTitle: {
    fontWeight: 700,
    fontSize: 17,
  },
  pointMeta: {
    marginTop: 6,
    color: 'rgba(255,255,255,0.56)',
    fontSize: 14,
    lineHeight: 1.8,
  },
  typeBadge: {
    display: 'inline-block',
    padding: '5px 10px',
    borderRadius: 999,
    background: 'rgba(96,165,250,0.12)',
    border: '1px solid rgba(96,165,250,0.2)',
    color: '#93c5fd',
    fontSize: 12,
    fontWeight: 700,
    marginRight: 8,
  },
  pointInfo: {
    marginTop: 8,
    color: 'rgba(255,255,255,0.78)',
  },
  descBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 14,
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.06)',
    color: 'rgba(255,255,255,0.72)',
    lineHeight: 1.8,
  },
  actionRow: {
    display: 'flex',
    gap: 10,
    marginTop: 14,
    flexWrap: 'wrap',
  },
  simpleBadge: {
    minWidth: 86,
    textAlign: 'center',
    padding: '10px 14px',
    borderRadius: 999,
    background: 'linear-gradient(135deg, rgba(124,58,237,0.22) 0%, rgba(168,85,247,0.16) 100%)',
    color: '#d8b4fe',
    border: '1px solid rgba(168,85,247,0.22)',
    fontSize: 13,
    fontWeight: 800,
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
  },
  empty: {
    color: 'rgba(255,255,255,0.38)',
    padding: '20px 0',
  },
  primaryBtn: {
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

  input::placeholder,
  textarea::placeholder {
    color: rgba(255,255,255,0.28);
  }

  select,
  option {
    background: #101a2d;
    color: #ffffff;
  }

  select:focus,
  input:focus,
  textarea:focus {
    border-color: rgba(96,165,250,0.35);
    box-shadow: 0 0 0 3px rgba(96,165,250,0.08);
  }

  @media (max-width: 980px) {
    div[style*="grid-template-columns: repeat(2, minmax(0,1fr))"],
    div[style*="grid-template-columns: 430px 1fr"] {
      grid-template-columns: 1fr !important;
    }
  }
`;