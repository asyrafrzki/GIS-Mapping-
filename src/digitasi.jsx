import React, { useEffect, useMemo, useState } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polygon,
  Polyline,
  Circle,
  useMapEvents,
} from 'react-leaflet';
import L from 'leaflet';
import { apiRequest } from './services/api';
import 'leaflet/dist/leaflet.css';

const DEFAULT_CENTER = [-6.9175, 107.6191];
const DEFAULT_ZOOM = 9;
const MAX_RADIUS = 100;

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
  dangerDark: '#991b1b',
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

const EMPTY_FORM = {
  jenis: 'sampel',
  nama: '',
  tanahUser: '',
  tanggal: '',
  lokasi: '',
  daerah: '',
  deskripsi: '',
  statusTindakLanjut: '',
  manualLat: '',
  manualLng: '',
};

function makeIcon(color, label = '') {
  return L.divIcon({
    className: '',
    html: `
      <div style="
        width:${label ? '30px' : '22px'};
        height:${label ? '30px' : '22px'};
        border-radius:50%;
        background:${color};
        color:white;
        border:3px solid white;
        box-shadow:0 4px 14px rgba(0,0,0,.35);
        display:flex;
        align-items:center;
        justify-content:center;
        font-size:12px;
        font-weight:900;
      ">
        ${label}
      </div>
    `,
    iconSize: label ? [30, 30] : [22, 22],
    iconAnchor: label ? [15, 15] : [11, 11],
  });
}

function getJenisColor(jenis) {
  if (jenis === 'sampel') return '#028739';
  if (jenis === 'observasi') return '#46AB68';
  if (jenis === 'masalah') return '#b91c1c';
  return '#f59e0b';
}

function getJenisLabel(jenis) {
  return JENIS_OPTIONS.find((item) => item.value === jenis)?.label || jenis;
}

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function distanceMeter(a, b) {
  const R = 6371000;

  const lat1 = Number(a.lat) * Math.PI / 180;
  const lat2 = Number(b.lat) * Math.PI / 180;
  const dLat = (Number(b.lat) - Number(a.lat)) * Math.PI / 180;
  const dLng = (Number(b.lng) - Number(a.lng)) * Math.PI / 180;

  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(dLng / 2) ** 2;

  return 2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function sortPointsAroundCenter(points, center) {
  if (!center || points.length < 3) return points;

  return [...points].sort((a, b) => {
    const angleA = Math.atan2(a.lat - center.lat, a.lng - center.lng);
    const angleB = Math.atan2(b.lat - center.lat, b.lng - center.lng);
    return angleA - angleB;
  });
}

function getPolygonCenter(points) {
  if (!points.length) return null;

  const total = points.reduce(
    (acc, point) => ({
      lat: acc.lat + Number(point.lat),
      lng: acc.lng + Number(point.lng),
    }),
    { lat: 0, lng: 0 }
  );

  return {
    lat: total.lat / points.length,
    lng: total.lng / points.length,
  };
}

function normalizePolygon(value) {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value
      .map((p) => ({
        lat: Number(p.lat),
        lng: Number(p.lng),
      }))
      .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
  }

  if (typeof value === 'string') {
    try {
      return normalizePolygon(JSON.parse(value));
    } catch {
      return [];
    }
  }

  return [];
}

async function reverseGeocode(lat, lng) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`,
      { headers: { Accept: 'application/json' } }
    );

    if (!res.ok) throw new Error('reverse geocode failed');

    const data = await res.json();
    const a = data.address || {};

    return {
      lokasi:
        a.village ||
        a.suburb ||
        a.hamlet ||
        a.neighbourhood ||
        a.road ||
        a.town ||
        a.city_district ||
        '',
      daerah:
        a.city ||
        a.county ||
        a.state_district ||
        a.state ||
        '',
    };
  } catch {
    return { lokasi: '', daerah: '' };
  }
}

function MapClick({ enabled, onClick }) {
  useMapEvents({
    click(e) {
      if (enabled) {
        onClick({
          lat: e.latlng.lat,
          lng: e.latlng.lng,
        });
      }
    },
  });

  return null;
}

export default function Digitasi({ token, onNavigate }) {
  const [points, setPoints] = useState([]);
  const [addMode, setAddMode] = useState(false);
  const [centerPoint, setCenterPoint] = useState(null);
  const [polygonPoints, setPolygonPoints] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const isMasalah = form.jenis === 'masalah';

  const allDraftPoints = useMemo(() => {
    if (!centerPoint) return [];
    return [centerPoint, ...polygonPoints];
  }, [centerPoint, polygonPoints]);

  const sortedDraftPolygon = useMemo(() => {
    if (!centerPoint) return [];
    return sortPointsAroundCenter([centerPoint, ...polygonPoints], centerPoint);
  }, [centerPoint, polygonPoints]);

  const maxDistance = useMemo(() => {
    if (!centerPoint || polygonPoints.length === 0) return 0;

    return polygonPoints.reduce((max, point) => {
      return Math.max(max, distanceMeter(centerPoint, point));
    }, 0);
  }, [centerPoint, polygonPoints]);

  const polygonReady = centerPoint && polygonPoints.length >= 2;

  const loadPoints = async () => {
    try {
      const data = await apiRequest('/points', { token });
      setPoints(data);
    } catch (err) {
      console.error(err);
      alert(err.message);
    }
  };

  useEffect(() => {
    loadPoints();
  }, [token]);

  const resetAll = () => {
    setForm(EMPTY_FORM);
    setCenterPoint(null);
    setPolygonPoints([]);
    setEditingId(null);
  };

  const addPoint = async (point) => {
    const cleanPoint = {
      lat: Number(point.lat),
      lng: Number(point.lng),
    };

    if (!Number.isFinite(cleanPoint.lat) || !Number.isFinite(cleanPoint.lng)) {
      alert('Latitude dan longitude tidak valid.');
      return;
    }

    if (cleanPoint.lat < -90 || cleanPoint.lat > 90) {
      alert('Latitude harus antara -90 sampai 90.');
      return;
    }

    if (cleanPoint.lng < -180 || cleanPoint.lng > 180) {
      alert('Longitude harus antara -180 sampai 180.');
      return;
    }

    if (!centerPoint) {
      setCenterPoint(cleanPoint);

      setLoadingLocation(true);
      const geo = await reverseGeocode(cleanPoint.lat, cleanPoint.lng);

      setForm((prev) => ({
        ...prev,
        tanggal: prev.tanggal || new Date().toISOString().slice(0, 10),
        lokasi: geo.lokasi || prev.lokasi,
        daerah: geo.daerah || prev.daerah,
      }));

      setLoadingLocation(false);
      return;
    }

    const distance = distanceMeter(centerPoint, cleanPoint);

    if (distance > MAX_RADIUS) {
      alert(`Titik berada di luar radius maksimal ${MAX_RADIUS} meter dari Titik 1.`);
      return;
    }

    setPolygonPoints((prev) => [...prev, cleanPoint]);
  };

  const addManualPoint = async () => {
    const lat = toNumber(form.manualLat);
    const lng = toNumber(form.manualLng);

    if (lat === null || lng === null) {
      alert('Isi latitude dan longitude terlebih dahulu.');
      return;
    }

    await addPoint({ lat, lng });

    setForm((prev) => ({
      ...prev,
      manualLat: '',
      manualLng: '',
    }));
  };

  const removeCenterPoint = () => {
    setCenterPoint(null);
    setPolygonPoints([]);
  };

  const removePolygonPoint = (index) => {
    setPolygonPoints((prev) => prev.filter((_, i) => i !== index));
  };

  const submit = async (e) => {
    e.preventDefault();

    if (!form.nama.trim()) {
      alert('Nama area wajib diisi.');
      return;
    }

    if (!form.tanggal) {
      alert('Tanggal wajib diisi.');
      return;
    }

    if (!form.lokasi.trim() || !form.daerah.trim()) {
      alert('Lokasi dan daerah wajib diisi.');
      return;
    }

    if (!centerPoint) {
      alert('Tentukan Titik 1 terlebih dahulu.');
      return;
    }

    if (polygonPoints.length < 2) {
      alert('Minimal total 3 titik diperlukan untuk membentuk polygon.');
      return;
    }

    if (!isMasalah && !form.tanahUser.trim()) {
      alert('Nama tanah user wajib diisi.');
      return;
    }

    const sortedPolygonForSave = sortPointsAroundCenter(polygonPoints, centerPoint);

    const payload = {
      jenis: form.jenis,
      nama: form.nama,
      tanggal: form.tanggal,
      tanahUser: isMasalah ? '' : form.tanahUser,
      lokasi: form.lokasi,
      daerah: form.daerah,
      kondisiTanah: '',
      deskripsi: isMasalah ? form.deskripsi : '',
      statusTindakLanjut: isMasalah ? form.statusTindakLanjut : '',
      radius: MAX_RADIUS,
      lat: centerPoint.lat,
      lng: centerPoint.lng,
      areaType: 'polygon',
      polygonPoints: sortedPolygonForSave,
      polygon_points: sortedPolygonForSave,
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
      resetAll();
      alert(editingId ? 'Area berhasil diupdate.' : 'Area berhasil disimpan.');
    } catch (err) {
      alert(err.message);
    }
  };

  const editPoint = (point) => {
    const savedPolygon = normalizePolygon(point.polygon_points || point.polygonPoints);

    setEditingId(point.id);
    setCenterPoint({
      lat: Number(point.lat),
      lng: Number(point.lng),
    });
    setPolygonPoints(savedPolygon);

    setForm({
      jenis: point.jenis || 'sampel',
      nama: point.nama || '',
      tanahUser: point.tanah_user || '',
      tanggal: point.tanggal?.slice(0, 10) || '',
      lokasi: point.lokasi || '',
      daerah: point.daerah || '',
      deskripsi: point.deskripsi || '',
      statusTindakLanjut: point.status_tindak_lanjut || 'belum ditindaklanjuti',
      manualLat: '',
      manualLng: '',
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deletePoint = async (id) => {
    const ok = window.confirm('Hapus area ini?');
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

  return (
    <div style={s.page}>
      <style>{css}</style>

      <div style={s.header}>
        <div>
          <div style={s.kicker}>DIGITASI LAHAN</div>
          <h1 style={s.title}>Digitasi Area Lahan</h1>
          <p style={s.subtitle}>
            Titik pertama menjadi acuan radius 100 meter. Tambahkan titik berikutnya
            untuk membentuk polygon area lahan.
          </p>
        </div>

        <button style={s.backBtn} onClick={() => onNavigate('user-dashboard')}>
          ← Dashboard User
        </button>
      </div>

      <div style={s.statsGrid}>
        <StatCard value={points.length} label="Total Area" />
      </div>

      <div style={s.layout}>
        <div style={s.left}>
          <div style={s.card}>
            <div style={s.actionTop}>
              <button
                type="button"
                style={addMode ? s.greenBtn : s.darkBtn}
                onClick={() => setAddMode((prev) => !prev)}
              >
                {addMode ? 'Mode Tambah Aktif' : 'Aktifkan Mode Tambah'}
              </button>

              <button type="button" style={s.darkBtn} onClick={removeCenterPoint}>
                Reset Titik
              </button>

              <button type="button" style={s.darkBtn} onClick={resetAll}>
                Reset Form
              </button>
            </div>

            <div style={s.notice}>
              {!centerPoint
                ? 'Klik peta atau input koordinat manual untuk membuat Titik 1.'
                : `Titik 1 sudah dibuat. Tambahkan minimal 2 titik berikutnya dalam radius ${MAX_RADIUS} meter dari Titik 1.`}
            </div>

            <form onSubmit={submit}>
              <h2 style={s.sectionTitle}>{editingId ? 'Edit Area' : 'Form Area'}</h2>

              <label style={s.label}>Jenis Area</label>
              <select
                style={s.input}
                value={form.jenis}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    jenis: e.target.value,
                    tanahUser: e.target.value === 'masalah' ? '' : prev.tanahUser,
                    statusTindakLanjut:
                      e.target.value === 'masalah'
                        ? prev.statusTindakLanjut || 'belum ditindaklanjuti'
                        : '',
                  }))
                }
              >
                {JENIS_OPTIONS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>

              <label style={s.label}>Nama Area</label>
              <input
                style={s.input}
                placeholder="Contoh: Lahan Blok A"
                value={form.nama}
                onChange={(e) => setForm({ ...form, nama: e.target.value })}
              />

              {!isMasalah && (
                <>
                  <label style={s.label}>Nama Tanah User</label>
                  <input
                    style={s.input}
                    placeholder="Contoh: Tanah kebun blok A"
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

              <div style={s.manualBox}>
                <div style={s.manualTitle}>Input Koordinat Manual</div>

                <div style={s.manualHint}>
                  {!centerPoint
                    ? 'Koordinat pertama akan menjadi Titik 1.'
                    : 'Koordinat berikutnya akan menjadi Titik 2, 3, 4, dan seterusnya.'}
                </div>

                <div style={s.manualGrid}>
                  <input
                    style={s.input}
                    type="number"
                    step="any"
                    placeholder="Latitude"
                    value={form.manualLat}
                    onChange={(e) => setForm({ ...form, manualLat: e.target.value })}
                  />

                  <input
                    style={s.input}
                    type="number"
                    step="any"
                    placeholder="Longitude"
                    value={form.manualLng}
                    onChange={(e) => setForm({ ...form, manualLng: e.target.value })}
                  />
                </div>

                <button type="button" style={s.fullDarkBtn} onClick={addManualPoint}>
                  + Tambah Titik dari Koordinat
                </button>
              </div>

              <label style={s.label}>Lokasi</label>
              <input
                style={s.input}
                placeholder={loadingLocation ? 'Mengambil lokasi otomatis...' : 'Lokasi'}
                value={form.lokasi}
                onChange={(e) => setForm({ ...form, lokasi: e.target.value })}
              />

              <label style={s.label}>Daerah</label>
              <input
                style={s.input}
                placeholder={loadingLocation ? 'Mengambil daerah otomatis...' : 'Daerah'}
                value={form.daerah}
                onChange={(e) => setForm({ ...form, daerah: e.target.value })}
              />

              {isMasalah && (
                <>
                  <label style={s.label}>Status Tindak Lanjut</label>
                  <select
                    style={s.input}
                    value={form.statusTindakLanjut}
                    onChange={(e) =>
                      setForm({ ...form, statusTindakLanjut: e.target.value })
                    }
                  >
                    {STATUS_OPTIONS.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>

                  <label style={s.label}>Deskripsi Masalah</label>
                  <textarea
                    style={s.textarea}
                    placeholder="Deskripsi masalah lahan..."
                    value={form.deskripsi}
                    onChange={(e) => setForm({ ...form, deskripsi: e.target.value })}
                  />
                </>
              )}

              <div style={s.polygonInfo}>
                <strong>Status Area</strong>
                <div>
                  Titik 1:{' '}
                  {centerPoint
                    ? `${centerPoint.lat.toFixed(6)}, ${centerPoint.lng.toFixed(6)}`
                    : '-'}
                </div>
                <div>Total titik area: {allDraftPoints.length}</div>
                <div>Titik tambahan: {polygonPoints.length}</div>
                <div>Minimal total titik: 3</div>
                <div>Batas radius: {MAX_RADIUS} meter dari Titik 1</div>
                <div>Jarak terjauh dari Titik 1: {maxDistance.toFixed(2)} meter</div>
                <div>Status: {polygonReady ? 'Polygon siap disimpan' : 'Belum cukup titik'}</div>
              </div>

              {allDraftPoints.length > 0 && (
                <div style={s.pointList}>
                  <strong>Daftar Titik Area</strong>

                  {centerPoint && (
                    <div style={s.pointDraft}>
                      <div>
                        <div style={s.pointDraftTitle}>Titik 1</div>
                        <div style={s.smallText}>
                          {centerPoint.lat.toFixed(6)}, {centerPoint.lng.toFixed(6)}
                        </div>
                      </div>

                      <button
                        type="button"
                        style={s.redSmallBtn}
                        onClick={removeCenterPoint}
                      >
                        Hapus
                      </button>
                    </div>
                  )}

                  {polygonPoints.map((point, index) => (
                    <div key={`${point.lat}-${point.lng}-${index}`} style={s.pointDraft}>
                      <div>
                        <div style={s.pointDraftTitle}>Titik {index + 2}</div>
                        <div style={s.smallText}>
                          {point.lat.toFixed(6)}, {point.lng.toFixed(6)}
                        </div>
                      </div>

                      <button
                        type="button"
                        style={s.redSmallBtn}
                        onClick={() => removePolygonPoint(index)}
                      >
                        Hapus
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <button type="submit" style={s.saveBtn}>
                {editingId ? 'Update Area' : 'Simpan Area Polygon'}
              </button>
            </form>
          </div>
        </div>

        <div style={s.right}>
          <div style={s.card}>
            <MapContainer
              center={DEFAULT_CENTER}
              zoom={DEFAULT_ZOOM}
              style={{ height: 540, width: '100%', borderRadius: 18 }}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution="© OpenStreetMap"
              />

              <MapClick enabled={addMode} onClick={addPoint} />

              {points.map((point) => {
                const polygon = normalizePolygon(point.polygon_points || point.polygonPoints);
                const firstPoint = {
                  lat: Number(point.lat),
                  lng: Number(point.lng),
                };
                const color = getJenisColor(point.jenis);

                const savedAllPoints =
                  Number.isFinite(firstPoint.lat) && Number.isFinite(firstPoint.lng)
                    ? [firstPoint, ...polygon]
                    : polygon;

                const sortedSavedPolygon = sortPointsAroundCenter(savedAllPoints, firstPoint);
                const totalPointCount = sortedSavedPolygon.length;
                const markerPoint = getPolygonCenter(sortedSavedPolygon);

                return (
                  <React.Fragment key={point.id}>
                    {sortedSavedPolygon.length >= 3 && (
                      <Polygon
                        positions={sortedSavedPolygon.map((p) => [p.lat, p.lng])}
                        pathOptions={{
                          color,
                          fillColor: color,
                          fillOpacity: 0.22,
                          weight: 2,
                        }}
                      />
                    )}

                    {markerPoint && (
                      <Marker
                        position={[markerPoint.lat, markerPoint.lng]}
                        icon={makeIcon(color, '')}
                      >
                        <Popup>
                          <div style={{ minWidth: 230 }}>
                            <strong>{point.nama}</strong>
                            <br />
                            {getJenisLabel(point.jenis)}
                            <br />
                            {point.lokasi || '-'} - {point.daerah || '-'}
                            <br />
                            Jumlah titik area: {totalPointCount}
                            <br />
                            Radius input: {point.radius || MAX_RADIUS} m
                          </div>
                        </Popup>
                      </Marker>
                    )}
                  </React.Fragment>
                );
              })}

              {centerPoint && (
                <>
                  <Circle
                    center={[centerPoint.lat, centerPoint.lng]}
                    radius={MAX_RADIUS}
                    pathOptions={{
                      color: '#f59e0b',
                      fillColor: '#f59e0b',
                      fillOpacity: 0.05,
                      dashArray: '8 6',
                    }}
                  />

                  <Marker
                    position={[centerPoint.lat, centerPoint.lng]}
                    icon={makeIcon('#f59e0b', '1')}
                  >
                    <Popup>
                      <strong>Titik 1</strong>
                      <br />
                      Pusat radius {MAX_RADIUS} meter
                      <br />
                      {centerPoint.lat.toFixed(6)}, {centerPoint.lng.toFixed(6)}
                    </Popup>
                  </Marker>
                </>
              )}

              {sortedDraftPolygon.length >= 2 && (
                <Polyline
                  positions={sortedDraftPolygon.map((p) => [p.lat, p.lng])}
                  pathOptions={{
                    color: '#f59e0b',
                    weight: 2,
                    dashArray: '6 6',
                  }}
                />
              )}

              {sortedDraftPolygon.length >= 3 && (
                <Polygon
                  positions={sortedDraftPolygon.map((p) => [p.lat, p.lng])}
                  pathOptions={{
                    color: '#f59e0b',
                    fillColor: '#f59e0b',
                    fillOpacity: 0.24,
                    weight: 2,
                  }}
                />
              )}

              {polygonPoints.map((point, index) => (
                <Marker
                  key={`draft-${index}`}
                  position={[point.lat, point.lng]}
                  icon={makeIcon('#f59e0b', index + 2)}
                >
                  <Popup>
                    <strong>Titik {index + 2}</strong>
                    <br />
                    {point.lat.toFixed(6)}, {point.lng.toFixed(6)}
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>

          <div style={{ ...s.card, ...s.areaListCard }}>
            <div style={s.areaListHeader}>
              <h2 style={s.sectionTitle}>Daftar Area Saya</h2>
              <span style={s.areaCount}>{points.length} area</span>
            </div>

            <div style={s.areaScroll}>
              {points.length === 0 ? (
                <div style={s.empty}>Belum ada area.</div>
              ) : (
                points.map((point) => {
                  const polygon = normalizePolygon(point.polygon_points || point.polygonPoints);
                  const isPolygon = polygon.length >= 2;

                  return (
                    <div key={point.id} style={s.areaItem}>
                      <div style={s.areaTop}>
                        <div>
                          <div style={s.areaTitle}>{point.nama}</div>
                          <div style={s.areaMeta}>
                            {getJenisLabel(point.jenis)} · {point.lokasi || '-'} ·{' '}
                            {point.daerah || '-'}
                          </div>
                        </div>

                        <span style={s.badge}>
                          {isPolygon ? `${polygon.length + 1} titik area` : 'data lama'}
                        </span>
                      </div>

                      {!point.jenis?.includes('masalah') && point.tanah_user && (
                        <div style={s.infoText}>
                          <strong>Nama Tanah:</strong> {point.tanah_user}
                        </div>
                      )}

                      {point.jenis === 'masalah' && (
                        <>
                          <div style={s.infoText}>
                            <strong>Status:</strong>{' '}
                            {point.status_tindak_lanjut || 'belum ditindaklanjuti'}
                          </div>
                          {point.deskripsi && <div style={s.descBox}>{point.deskripsi}</div>}
                        </>
                      )}

                      <div style={s.infoText}>
                        <strong>Titik 1:</strong>{' '}
                        {Number(point.lat).toFixed(6)}, {Number(point.lng).toFixed(6)}
                      </div>

                      <div style={s.infoText}>
                        <strong>Radius input:</strong> {point.radius || MAX_RADIUS} m
                      </div>

                      <div style={s.areaActions}>
                        <button type="button" style={s.darkBtn} onClick={() => editPoint(point)}>
                          Edit
                        </button>

                        {point.jenis === 'masalah' && (
                          <button
                            type="button"
                            style={s.greenBtn}
                            onClick={() => sendReport(point.id)}
                          >
                            Kirim Laporan
                          </button>
                        )}

                        <button type="button" style={s.redBtn} onClick={() => deletePoint(point.id)}>
                          Hapus
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ value, label }) {
  return (
    <div style={s.statCard}>
      <div style={s.statValue}>{value}</div>
      <div style={s.statLabel}>{label}</div>
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
    alignItems: 'flex-start',
    gap: 18,
    flexWrap: 'wrap',
    marginBottom: 24,
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
    fontWeight: 900,
    letterSpacing: '-1px',
    color: colors.greenDeep,
    lineHeight: 1.1,
  },

  subtitle: {
    color: colors.muted,
    maxWidth: 850,
    lineHeight: 1.8,
    fontSize: 14,
  },

  backBtn: {
    padding: '12px 16px',
    borderRadius: 14,
    border: `1px solid ${colors.borderStrong}`,
    background: colors.white,
    color: colors.greenDark,
    fontWeight: 900,
    cursor: 'pointer',
    boxShadow: '0 10px 24px rgba(6,78,46,0.08)',
  },

  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'minmax(220px, 360px)',
    gap: 14,
    marginBottom: 18,
  },

  statCard: {
    background: colors.white,
    border: `1px solid ${colors.border}`,
    borderRadius: 22,
    padding: 20,
    boxShadow: '0 14px 36px rgba(6,78,46,0.08)',
  },

  statValue: {
    fontSize: 38,
    fontWeight: 900,
    color: colors.green,
    lineHeight: 1,
  },

  statLabel: {
    color: colors.muted,
    marginTop: 8,
    fontWeight: 700,
  },

  layout: {
    display: 'grid',
    gridTemplateColumns: '420px 1fr',
    gap: 18,
    alignItems: 'start',
  },

  left: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },

  right: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },

  card: {
    background: colors.white,
    border: `1px solid ${colors.border}`,
    borderRadius: 24,
    padding: 20,
    boxShadow: '0 14px 36px rgba(6,78,46,0.08)',
  },

  actionTop: {
    display: 'flex',
    gap: 10,
    flexWrap: 'wrap',
    marginBottom: 14,
  },

  greenBtn: {
    padding: '11px 14px',
    borderRadius: 13,
    border: 'none',
    background: colors.greenDark,
    color: colors.white,
    cursor: 'pointer',
    fontWeight: 900,
    boxShadow: '0 12px 24px rgba(6,78,46,0.18)',
  },

  darkBtn: {
    padding: '11px 14px',
    borderRadius: 13,
    border: `1px solid ${colors.border}`,
    background: colors.cream2,
    color: colors.greenDark,
    cursor: 'pointer',
    fontWeight: 900,
  },

  fullDarkBtn: {
    width: '100%',
    padding: '12px 14px',
    borderRadius: 13,
    border: 'none',
    background: colors.greenDark,
    color: colors.white,
    cursor: 'pointer',
    fontWeight: 900,
    boxShadow: '0 12px 24px rgba(6,78,46,0.18)',
  },

  redBtn: {
    padding: '11px 14px',
    borderRadius: 13,
    border: 'none',
    background: colors.dangerDark,
    color: colors.white,
    cursor: 'pointer',
    fontWeight: 900,
  },

  redSmallBtn: {
    padding: '8px 10px',
    borderRadius: 10,
    border: 'none',
    background: colors.dangerDark,
    color: colors.white,
    cursor: 'pointer',
    fontWeight: 800,
  },

  notice: {
    background: colors.cream2,
    border: `1px solid ${colors.border}`,
    borderRadius: 16,
    padding: 14,
    color: colors.text,
    lineHeight: 1.7,
    marginBottom: 16,
  },

  sectionTitle: {
    margin: '0 0 14px',
    fontSize: 24,
    fontWeight: 900,
    color: colors.greenDeep,
  },

  label: {
    display: 'block',
    marginTop: 14,
    marginBottom: 7,
    fontWeight: 900,
    color: colors.greenDeep,
    fontSize: 13,
  },

  input: {
    width: '100%',
    padding: '13px 14px',
    borderRadius: 14,
    border: `1px solid ${colors.border}`,
    background: colors.cream2,
    color: colors.text,
    outline: 'none',
    fontSize: 14,
  },

  textarea: {
    width: '100%',
    minHeight: 110,
    padding: '13px 14px',
    borderRadius: 14,
    border: `1px solid ${colors.border}`,
    background: colors.cream2,
    color: colors.text,
    outline: 'none',
    resize: 'vertical',
    fontFamily: 'inherit',
    fontSize: 14,
  },

  manualBox: {
    marginTop: 14,
    padding: 14,
    borderRadius: 16,
    background: colors.cream2,
    border: `1px solid ${colors.border}`,
  },

  manualTitle: {
    fontWeight: 900,
    marginBottom: 6,
    color: colors.greenDeep,
  },

  manualHint: {
    color: colors.muted,
    fontSize: 13,
    marginBottom: 10,
    lineHeight: 1.6,
  },

  manualGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 10,
    marginBottom: 10,
  },

  polygonInfo: {
    marginTop: 14,
    padding: 14,
    borderRadius: 16,
    background: colors.cream2,
    border: `1px solid ${colors.border}`,
    color: colors.text,
    lineHeight: 1.8,
  },

  pointList: {
    marginTop: 14,
    display: 'grid',
    gap: 10,
    color: colors.greenDeep,
  },

  pointDraft: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 10,
    alignItems: 'center',
    background: colors.white,
    border: `1px solid ${colors.border}`,
    borderRadius: 14,
    padding: 12,
  },

  pointDraftTitle: {
    fontWeight: 900,
    color: colors.greenDeep,
  },

  smallText: {
    color: colors.muted,
    marginTop: 4,
    fontSize: 13,
  },

  saveBtn: {
    width: '100%',
    marginTop: 16,
    padding: '14px 16px',
    borderRadius: 14,
    border: 'none',
    background: colors.greenDark,
    color: colors.white,
    cursor: 'pointer',
    fontWeight: 900,
    boxShadow: '0 12px 24px rgba(6,78,46,0.18)',
  },

  empty: {
    color: colors.muted,
    padding: 16,
    background: colors.cream2,
    borderRadius: 14,
    border: `1px dashed ${colors.borderStrong}`,
  },

  areaListCard: {
    height: 640,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },

  areaListHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
    flexShrink: 0,
  },

  areaCount: {
    padding: '7px 11px',
    borderRadius: 999,
    background: colors.greenPale,
    color: colors.greenDark,
    border: `1px solid ${colors.border}`,
    fontWeight: 900,
    fontSize: 12,
  },

  areaScroll: {
    overflowY: 'auto',
    paddingRight: 8,
  },

  areaItem: {
    padding: '16px 0',
    borderBottom: `1px solid ${colors.border}`,
  },

  areaTop: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 12,
    flexWrap: 'wrap',
  },

  areaTitle: {
    fontSize: 18,
    fontWeight: 900,
    color: colors.greenDeep,
  },

  areaMeta: {
    marginTop: 6,
    color: colors.muted,
    fontSize: 13,
  },

  badge: {
    height: 'fit-content',
    padding: '8px 12px',
    borderRadius: 999,
    background: colors.greenPale,
    border: `1px solid ${colors.border}`,
    color: colors.greenDark,
    fontWeight: 900,
    fontSize: 13,
  },

  infoText: {
    marginTop: 9,
    color: colors.text,
    fontSize: 13,
  },

  descBox: {
    marginTop: 10,
    padding: 12,
    borderRadius: 14,
    background: colors.cream2,
    color: colors.text,
    lineHeight: 1.7,
    border: `1px solid ${colors.border}`,
  },

  areaActions: {
    display: 'flex',
    gap: 10,
    flexWrap: 'wrap',
    marginTop: 14,
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
  select,
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

  select,
  option {
    background: ${colors.cream2};
    color: ${colors.text};
  }

  input::placeholder,
  textarea::placeholder {
    color: rgba(18, 53, 31, 0.36);
  }

  input:focus,
  textarea:focus,
  select:focus {
    border-color: rgba(6, 78, 46, 0.34) !important;
    box-shadow: 0 0 0 3px rgba(70, 171, 104, 0.12);
    background: #ffffff !important;
  }

  div::-webkit-scrollbar {
    width: 8px;
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

  .leaflet-container {
    background: ${colors.cream2};
  }

  .leaflet-popup-content-wrapper,
  .leaflet-popup-tip {
    background: ${colors.white};
    color: ${colors.text};
  }

  @media (max-width: 1100px) {
    div[style*="grid-template-columns: 420px 1fr"],
    div[style*="grid-template-columns: minmax(220px, 360px)"] {
      grid-template-columns: 1fr !important;
    }
  }

  @media (max-width: 620px) {
    div[style*="grid-template-columns: 1fr 1fr"] {
      grid-template-columns: 1fr !important;
    }
  }
`;