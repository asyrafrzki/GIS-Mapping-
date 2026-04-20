import { pool } from '../config/db.js';
import { calculateSoilAnalysis } from '../utils/analisisTanahCalculator.js';

export async function calculateOnly(req, res) {
  try {
    const result = calculateSoilAnalysis(req.body);
    return res.json(result);
  } catch (err) {
    console.error('calculateOnly error:', err);
    return res.status(400).json({ message: err.message || 'Gagal menghitung analisis tanah.' });
  }
}

export async function getMyPointsForAnalysis(req, res) {
  try {
    const result = await pool.query(
      `SELECT id, nama, jenis, lokasi, daerah, lat, lng, radius
       FROM field_points
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [req.user.id]
    );

    return res.json(result.rows);
  } catch (err) {
    console.error('getMyPointsForAnalysis error:', err);
    return res.status(500).json({ message: 'Gagal mengambil titik lahan.' });
  }
}

export async function saveAnalysis(req, res) {
  try {
    const {
      pointId = null,
      n,
      p,
      k,
      mg,
      umur,
      luas,
      protas,
      jumlahPohon,
    } = req.body;

    let pointMeta = {
      point_name: null,
      lokasi: null,
      daerah: null,
      radius: null,
    };

    if (pointId) {
      const pointResult = await pool.query(
        `SELECT id, nama, lokasi, daerah, radius
         FROM field_points
         WHERE id = $1 AND user_id = $2`,
        [pointId, req.user.id]
      );

      if (pointResult.rows.length === 0) {
        return res.status(404).json({ message: 'Titik tidak ditemukan.' });
      }

      const point = pointResult.rows[0];
      pointMeta = {
        point_name: point.nama,
        lokasi: point.lokasi,
        daerah: point.daerah,
        radius: point.radius,
      };
    }

    const result = calculateSoilAnalysis({
      n,
      p,
      k,
      mg,
      umur,
      luas,
      protas,
      jumlahPohon,
    });

    const saved = await pool.query(
      `INSERT INTO soil_analysis_results (
        user_id, point_id, point_name, lokasi, daerah, radius,
        n, p, k, mg,
        umur, luas, protas, jumlah_pohon,
        produksi, prod_per_pohon,
        prod_n, prod_p, prod_k, prod_mg,
        bio_n, bio_p, bio_k, bio_mg,
        urea_awal, tsp_awal, kcl_awal, dolomit_awal,
        urea_akhir, tsp_akhir, kcl_akhir, dolomit_akhir,
        urea_app1, tsp_app1, kcl_app1, dolomit_app1,
        urea_app2, tsp_app2, kcl_app2, dolomit_app2
      )
      VALUES (
        $1,$2,$3,$4,$5,$6,
        $7,$8,$9,$10,
        $11,$12,$13,$14,
        $15,$16,
        $17,$18,$19,$20,
        $21,$22,$23,$24,
        $25,$26,$27,$28,
        $29,$30,$31,$32,
        $33,$34,$35,$36,
        $37,$38,$39,$40
      )
      RETURNING *`,
      [
        req.user.id,
        pointId,
        pointMeta.point_name,
        pointMeta.lokasi,
        pointMeta.daerah,
        pointMeta.radius,
        result.input.n,
        result.input.p,
        result.input.k,
        result.input.mg,
        result.input.umur,
        result.input.luas,
        result.input.protas,
        result.input.jumlahPohon,
        result.produksi,
        result.prodPerPohon,
        result.prod_n,
        result.prod_p,
        result.prod_k,
        result.prod_mg,
        result.bio_n,
        result.bio_p,
        result.bio_k,
        result.bio_mg,
        result.urea_awal,
        result.tsp_awal,
        result.kcl_awal,
        result.dolomit_awal,
        result.urea_akhir,
        result.tsp_akhir,
        result.kcl_akhir,
        result.dolomit_akhir,
        result.aplikasi1.urea,
        result.aplikasi1.tsp,
        result.aplikasi1.kcl,
        result.aplikasi1.dolomit,
        result.aplikasi2.urea,
        result.aplikasi2.tsp,
        result.aplikasi2.kcl,
        result.aplikasi2.dolomit,
      ]
    );

    return res.status(201).json({
      message: 'Analisis tanah berhasil disimpan.',
      result,
      data: saved.rows[0],
    });
  } catch (err) {
    console.error('saveAnalysis error:', err);
    return res.status(400).json({ message: err.message || 'Gagal menyimpan analisis.' });
  }
}

export async function getLatestAnalysisByPoint(req, res) {
  try {
    const { pointId } = req.params;

    const result = await pool.query(
      `SELECT *
       FROM soil_analysis_results
       WHERE user_id = $1 AND point_id = $2
       ORDER BY created_at DESC
       LIMIT 1`,
      [req.user.id, pointId]
    );

    if (result.rows.length === 0) {
      return res.json(null);
    }

    return res.json(result.rows[0]);
  } catch (err) {
    console.error('getLatestAnalysisByPoint error:', err);
    return res.status(500).json({ message: 'Gagal mengambil analisis titik.' });
  }
}

export async function getHistory(req, res) {
  try {
    const result = await pool.query(
      `SELECT *
       FROM soil_analysis_results
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [req.user.id]
    );

    return res.json(result.rows);
  } catch (err) {
    console.error('getHistory error:', err);
    return res.status(500).json({ message: 'Gagal mengambil riwayat analisis.' });
  }
}