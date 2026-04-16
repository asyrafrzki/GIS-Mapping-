import { pool } from '../config/db.js';

export async function getMyPoints(req, res) {
  try {
    const result = await pool.query(
      `SELECT *
       FROM field_points
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [req.user.id]
    );

    return res.json(result.rows);
  } catch (err) {
    console.error('getMyPoints error:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
}

export async function createPoint(req, res) {
  try {
    const {
      jenis,
      nama,
      tanggal,
      deskripsi,
      kondisiTanah,
      statusTindakLanjut,
      radius,
      lat,
      lng,
      tanahUser,
      lokasi,
      daerah,
    } = req.body;

    const result = await pool.query(
      `INSERT INTO field_points
       (
         user_id, jenis, nama, tanggal, deskripsi, kondisi_tanah,
         status_tindak_lanjut, radius, lat, lng, tanah_user, lokasi, daerah
       )
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       RETURNING *`,
      [
        req.user.id,
        jenis,
        nama,
        tanggal,
        deskripsi || '',
        kondisiTanah || '',
        statusTindakLanjut || '',
        radius,
        lat,
        lng,
        tanahUser || '',
        lokasi || '',
        daerah || '',
      ]
    );

    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('createPoint error:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
}

export async function updatePoint(req, res) {
  try {
    const { id } = req.params;
    const {
      jenis,
      nama,
      tanggal,
      deskripsi,
      kondisiTanah,
      statusTindakLanjut,
      radius,
      lat,
      lng,
      tanahUser,
      lokasi,
      daerah,
    } = req.body;

    const ownerCheck = await pool.query(
      'SELECT id FROM field_points WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );

    if (ownerCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Titik tidak ditemukan.' });
    }

    const result = await pool.query(
      `UPDATE field_points
       SET jenis = $1,
           nama = $2,
           tanggal = $3,
           deskripsi = $4,
           kondisi_tanah = $5,
           status_tindak_lanjut = $6,
           radius = $7,
           lat = $8,
           lng = $9,
           tanah_user = $10,
           lokasi = $11,
           daerah = $12,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $13
       RETURNING *`,
      [
        jenis,
        nama,
        tanggal,
        deskripsi || '',
        kondisiTanah || '',
        statusTindakLanjut || '',
        radius,
        lat,
        lng,
        tanahUser || '',
        lokasi || '',
        daerah || '',
        id,
      ]
    );

    return res.json(result.rows[0]);
  } catch (err) {
    console.error('updatePoint error:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
}

export async function deletePoint(req, res) {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM field_points WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Titik tidak ditemukan.' });
    }

    return res.json({ message: 'Titik berhasil dihapus.' });
  } catch (err) {
    console.error('deletePoint error:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
}