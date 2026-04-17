import { pool } from '../config/db.js';

export async function createReportFromPoint(req, res) {
  try {
    const { pointId } = req.params;

    const pointResult = await pool.query(
      `SELECT *
       FROM field_points
       WHERE id = $1 AND user_id = $2`,
      [pointId, req.user.id]
    );

    if (pointResult.rows.length === 0) {
      return res.status(404).json({ message: 'Titik tidak ditemukan.' });
    }

    const point = pointResult.rows[0];

    if (point.jenis !== 'masalah') {
      return res.status(400).json({ message: 'Laporan hanya bisa dibuat dari titik masalah lahan.' });
    }

    const existing = await pool.query(
      `SELECT id
       FROM reports
       WHERE point_id = $1 AND user_id = $2
       LIMIT 1`,
      [pointId, req.user.id]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({ message: 'Laporan untuk titik ini sudah pernah dikirim.' });
    }

    const title = `Laporan Masalah Lahan - ${point.nama}`;
    const category = 'masalah-lahan';
    const message =
      `Lokasi: ${point.lokasi || '-'}\n` +
      `Daerah: ${point.daerah || '-'}\n` +
      `Koordinat: ${point.lat}, ${point.lng}\n` +
      `Radius: ${point.radius} m\n` +
      `Status Tindak Lanjut: ${point.status_tindak_lanjut || '-'}\n` +
      `Deskripsi: ${point.deskripsi || '-'}`;

    const result = await pool.query(
      `INSERT INTO reports (user_id, point_id, title, category, message, status, admin_note)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        req.user.id,
        point.id,
        title,
        category,
        message,
        'menunggu persetujuan',
        '',
      ]
    );

    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('createReportFromPoint error:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
}

export async function getMyReports(req, res) {
  try {
    const result = await pool.query(
      `SELECT r.*, fp.nama AS point_name, fp.lokasi, fp.daerah, fp.lat, fp.lng
       FROM reports r
       LEFT JOIN field_points fp ON fp.id = r.point_id
       WHERE r.user_id = $1
       ORDER BY r.created_at DESC`,
      [req.user.id]
    );

    return res.json(result.rows);
  } catch (err) {
    console.error('getMyReports error:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
}

export async function deleteMyReport(req, res) {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `DELETE FROM reports
       WHERE id = $1 AND user_id = $2
       RETURNING id`,
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Laporan tidak ditemukan.' });
    }

    return res.json({ message: 'Laporan berhasil dihapus.' });
  } catch (err) {
    console.error('deleteMyReport error:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
}

export async function getAllReports(req, res) {
  try {
    const result = await pool.query(
      `SELECT
         r.*,
         u.name AS user_name,
         u.email AS user_email,
         fp.nama AS point_name,
         fp.lokasi,
         fp.daerah,
         fp.lat,
         fp.lng,
         fp.radius,
         fp.status_tindak_lanjut,
         fp.deskripsi
       FROM reports r
       JOIN users u ON u.id = r.user_id
       LEFT JOIN field_points fp ON fp.id = r.point_id
       ORDER BY
         CASE
           WHEN r.status = 'menunggu persetujuan' THEN 1
           WHEN r.status = 'diproses' THEN 2
           WHEN r.status = 'selesai' THEN 3
           WHEN r.status = 'ditolak' THEN 4
           ELSE 5
         END,
         r.created_at DESC`
    );

    return res.json(result.rows);
  } catch (err) {
    console.error('getAllReports error:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
}

export async function updateReportStatus(req, res) {
  try {
    const { id } = req.params;
    const { status, adminNote } = req.body;

    const allowedStatus = [
      'menunggu persetujuan',
      'diproses',
      'selesai',
      'ditolak',
    ];

    if (!allowedStatus.includes(status)) {
      return res.status(400).json({ message: 'Status tidak valid.' });
    }

    const result = await pool.query(
      `UPDATE reports
       SET status = $1,
           admin_note = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [status, adminNote || '', id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Laporan tidak ditemukan.' });
    }

    return res.json(result.rows[0]);
  } catch (err) {
    console.error('updateReportStatus error:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
}