import { pool } from '../config/db.js';

const MAX_RADIUS_METER = 100;

function normalizePolygonPoints(value) {
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
      const parsed = JSON.parse(value);
      return normalizePolygonPoints(parsed);
    } catch {
      return [];
    }
  }

  return [];
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

function validatePolygonRadius(points, center) {
  if (!points.length) return true;
  if (!center) return false;

  return points.every((point) => {
    const distance = distanceMeter(center, point);
    return distance <= MAX_RADIUS_METER;
  });
}

export async function getMyPoints(req, res) {
  try {
    const result = await pool.query(
      `
      SELECT
        id,
        user_id,
        jenis,
        nama,
        tanggal,
        tanah_user,
        lokasi,
        daerah,
        kondisi_tanah,
        deskripsi,
        status_tindak_lanjut,
        radius,
        lat,
        lng,
        polygon_points,
        area_type,
        created_at,
        updated_at
      FROM field_points
      WHERE user_id = $1
      ORDER BY created_at DESC
      `,
      [req.user.id]
    );

    return res.json(result.rows);
  } catch (err) {
    console.error('getMyPoints error:', err);
    return res.status(500).json({ message: 'Gagal mengambil data titik.' });
  }
}

export async function createPoint(req, res) {
  try {
    const {
      jenis,
      nama,
      tanggal,
      tanahUser,
      lokasi,
      daerah,
      kondisiTanah,
      deskripsi,
      statusTindakLanjut,
      radius,
      lat,
      lng,
      polygonPoints,
      polygon_points,
      areaType,
    } = req.body;

    if (!jenis || !nama || !tanggal) {
      return res.status(400).json({
        message: 'Jenis, nama, dan tanggal wajib diisi.',
      });
    }

    if (!lokasi || !daerah) {
      return res.status(400).json({
        message: 'Lokasi dan daerah wajib diisi.',
      });
    }

    const normalizedPolygon = normalizePolygonPoints(
      polygonPoints || polygon_points
    );

    let finalAreaType = areaType || 'point';
    let finalLat = Number(lat);
    let finalLng = Number(lng);
    let finalRadius = Number(radius) || MAX_RADIUS_METER;

    if (!Number.isFinite(finalLat) || !Number.isFinite(finalLng)) {
      return res.status(400).json({
        message: 'Koordinat Titik 1 tidak valid.',
      });
    }

    if (normalizedPolygon.length > 0) {
      if (normalizedPolygon.length < 2) {
  return res.status(400).json({
    message: 'Minimal total 3 titik diperlukan untuk membentuk polygon.',
  });
}

      const centerPoint = {
        lat: finalLat,
        lng: finalLng,
      };

      if (!validatePolygonRadius(normalizedPolygon, centerPoint)) {
        return res.status(400).json({
          message: `Semua titik polygon harus berada maksimal ${MAX_RADIUS_METER} meter dari Titik 1.`,
        });
      }

      finalRadius = MAX_RADIUS_METER;
      finalAreaType = 'polygon';
    }

    if (finalRadius > MAX_RADIUS_METER) {
      return res.status(400).json({
        message: `Radius maksimal ${MAX_RADIUS_METER} meter.`,
      });
    }

    const result = await pool.query(
      `
      INSERT INTO field_points (
        user_id,
        jenis,
        nama,
        tanggal,
        tanah_user,
        lokasi,
        daerah,
        kondisi_tanah,
        deskripsi,
        status_tindak_lanjut,
        radius,
        lat,
        lng,
        polygon_points,
        area_type
      )
      VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15
      )
      RETURNING *
      `,
      [
        req.user.id,
        jenis,
        nama,
        tanggal,
        tanahUser || '',
        lokasi,
        daerah,
        kondisiTanah || '',
        deskripsi || '',
        statusTindakLanjut || '',
        finalRadius,
        finalLat,
        finalLng,
        normalizedPolygon.length ? JSON.stringify(normalizedPolygon) : null,
        finalAreaType,
      ]
    );

    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('createPoint error:', err);
    return res.status(500).json({ message: 'Gagal menyimpan titik.' });
  }
}

export async function updatePoint(req, res) {
  try {
    const { id } = req.params;

    const {
      jenis,
      nama,
      tanggal,
      tanahUser,
      lokasi,
      daerah,
      kondisiTanah,
      deskripsi,
      statusTindakLanjut,
      radius,
      lat,
      lng,
      polygonPoints,
      polygon_points,
      areaType,
    } = req.body;

    const existing = await pool.query(
      `
      SELECT *
      FROM field_points
      WHERE id = $1 AND user_id = $2
      `,
      [id, req.user.id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({
        message: 'Titik tidak ditemukan.',
      });
    }

    if (!jenis || !nama || !tanggal) {
      return res.status(400).json({
        message: 'Jenis, nama, dan tanggal wajib diisi.',
      });
    }

    if (!lokasi || !daerah) {
      return res.status(400).json({
        message: 'Lokasi dan daerah wajib diisi.',
      });
    }

    const normalizedPolygon = normalizePolygonPoints(
      polygonPoints || polygon_points
    );

    let finalAreaType = areaType || 'point';
    let finalLat = Number(lat);
    let finalLng = Number(lng);
    let finalRadius = Number(radius) || MAX_RADIUS_METER;

    if (!Number.isFinite(finalLat) || !Number.isFinite(finalLng)) {
      return res.status(400).json({
        message: 'Koordinat Titik 1 tidak valid.',
      });
    }

    if (normalizedPolygon.length > 0) {
      if (normalizedPolygon.length < 3) {
        return res.status(400).json({
          message: 'Minimal harus ada 3 titik tambahan untuk membentuk polygon.',
        });
      }

      const centerPoint = {
        lat: finalLat,
        lng: finalLng,
      };

      if (!validatePolygonRadius(normalizedPolygon, centerPoint)) {
        return res.status(400).json({
          message: `Semua titik polygon harus berada maksimal ${MAX_RADIUS_METER} meter dari Titik 1.`,
        });
      }

      finalRadius = MAX_RADIUS_METER;
      finalAreaType = 'polygon';
    }

    if (finalRadius > MAX_RADIUS_METER) {
      return res.status(400).json({
        message: `Radius maksimal ${MAX_RADIUS_METER} meter.`,
      });
    }

    const result = await pool.query(
      `
      UPDATE field_points
      SET
        jenis = $1,
        nama = $2,
        tanggal = $3,
        tanah_user = $4,
        lokasi = $5,
        daerah = $6,
        kondisi_tanah = $7,
        deskripsi = $8,
        status_tindak_lanjut = $9,
        radius = $10,
        lat = $11,
        lng = $12,
        polygon_points = $13,
        area_type = $14,
        updated_at = NOW()
      WHERE id = $15 AND user_id = $16
      RETURNING *
      `,
      [
        jenis,
        nama,
        tanggal,
        tanahUser || '',
        lokasi,
        daerah,
        kondisiTanah || '',
        deskripsi || '',
        statusTindakLanjut || '',
        finalRadius,
        finalLat,
        finalLng,
        normalizedPolygon.length ? JSON.stringify(normalizedPolygon) : null,
        finalAreaType,
        id,
        req.user.id,
      ]
    );

    return res.json(result.rows[0]);
  } catch (err) {
    console.error('updatePoint error:', err);
    return res.status(500).json({ message: 'Gagal mengubah titik.' });
  }
}

export async function deletePoint(req, res) {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
      DELETE FROM field_points
      WHERE id = $1 AND user_id = $2
      RETURNING id
      `,
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: 'Titik tidak ditemukan.',
      });
    }

    return res.json({
      message: 'Titik berhasil dihapus.',
    });
  } catch (err) {
    console.error('deletePoint error:', err);
    return res.status(500).json({ message: 'Gagal menghapus titik.' });
  }
}

export const getPoints = getMyPoints;