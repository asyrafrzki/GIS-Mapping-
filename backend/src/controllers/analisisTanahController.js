import { pool } from '../config/db.js';
import { calculateSoilAnalysis } from '../utils/analisisTanahCalculator.js';
import { getNutrientContextForPoint } from '../utils/nutrientGeojsonService.js';

export async function getMyPoints(req, res) {
  try {
    const result = await pool.query(
      `SELECT id, nama, lokasi, daerah, lat, lng, radius
       FROM field_points
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [req.user.id]
    );

    return res.json(result.rows);
  } catch (err) {
    console.error('getMyPoints error:', err);
    return res.status(500).json({ message: 'Gagal mengambil titik lahan.' });
  }
}

export async function getPointContext(req, res) {
  try {
    const { pointId } = req.params;

    const pointResult = await pool.query(
      `SELECT id, nama, lokasi, daerah, lat, lng, radius
       FROM field_points
       WHERE id = $1 AND user_id = $2
       LIMIT 1`,
      [pointId, req.user.id]
    );

    if (pointResult.rows.length === 0) {
      return res.status(404).json({ message: 'Titik tidak ditemukan.' });
    }

    const point = pointResult.rows[0];
    const radius = Math.min(Number(point.radius || 100), 100);

    const nutrients = await getNutrientContextForPoint(point.lat, point.lng);

    const latestResult = await pool.query(
      `SELECT *
       FROM soil_analysis_results
       WHERE user_id = $1 AND point_id = $2
       ORDER BY created_at DESC
       LIMIT 1`,
      [req.user.id, pointId]
    );

    return res.json({
      point: {
        ...point,
        radius,
      },
      nutrients,
      latestAnalysis: latestResult.rows[0] || null,
    });
  } catch (err) {
    console.error('getPointContext error:', err);
    return res.status(500).json({ message: 'Gagal mengambil konteks titik.' });
  }
}

export async function calculateOnly(req, res) {
  try {
    const result = calculateSoilAnalysis(req.body);
    return res.json(result);
  } catch (err) {
    console.error('calculateOnly error:', err);
    return res.status(400).json({ message: err.message || 'Gagal menghitung analisis tanah.' });
  }
}

export async function saveAnalysis(req, res) {
  try {
    const {
      pointId,
      umur,
      luas,
      protas,
      jumlahPohon,
    } = req.body;

    const pointResult = await pool.query(
      `SELECT id, nama, lokasi, daerah, lat, lng, radius
       FROM field_points
       WHERE id = $1 AND user_id = $2
       LIMIT 1`,
      [pointId, req.user.id]
    );

    if (pointResult.rows.length === 0) {
      return res.status(404).json({ message: 'Titik tidak ditemukan.' });
    }

    const point = pointResult.rows[0];
    const radius = Math.min(Number(point.radius || 100), 100);

    const nutrients = await getNutrientContextForPoint(point.lat, point.lng);

    const result = calculateSoilAnalysis({
      umur,
      luas,
      protas,
      jumlahPohon,
      n: nutrients.n,
      p: nutrients.p,
      k: nutrients.k,
      mg: nutrients.mg,
    });

    const saved = await pool.query(
      `INSERT INTO soil_analysis_results (
        user_id, point_id, point_name, lokasi, daerah, radius,
        n, p, k, mg,
        n_source, p_source, k_source, mg_source,
        umur, luas, protas, jumlah_pohon,
        produksi, prod_per_pohon,
        prod_n, prod_p, prod_k, prod_mg,
        bio_n, bio_p, bio_k, bio_mg,
        urea_awal, tsp_awal, kcl_awal, dolomit_awal,
        urea_akhir, tsp_akhir, kcl_akhir, dolomit_akhir,
        urea_app1, tsp_app1, kcl_app1, dolomit_app1,
        urea_app2, tsp_app2, kcl_app2, dolomit_app2,
        aplikasi1_total, aplikasi2_total, total_rekomendasi
      )
      VALUES (
        $1,$2,$3,$4,$5,$6,
        $7,$8,$9,$10,
        $11,$12,$13,$14,
        $15,$16,$17,$18,
        $19,$20,
        $21,$22,$23,$24,
        $25,$26,$27,$28,
        $29,$30,$31,$32,
        $33,$34,$35,$36,
        $37,$38,$39,$40,
        $41,$42,$43,$44,
        $45,$46,$47
      )
      RETURNING *`,
      [
        req.user.id,
        point.id,
        point.nama,
        point.lokasi,
        point.daerah,
        radius,
        result.input.n,
        result.input.p,
        result.input.k,
        result.input.mg,
        nutrients.sources.n,
        nutrients.sources.p,
        nutrients.sources.k,
        nutrients.sources.mg,
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
        result.summary.aplikasi1_total,
        result.summary.aplikasi2_total,
        result.summary.total_rekomendasi,
      ]
    );

    return res.status(201).json({
      message: 'Analisis berhasil disimpan.',
      result,
      data: saved.rows[0],
    });
  } catch (err) {
    console.error('saveAnalysis error:', err);
    return res.status(400).json({ message: err.message || 'Gagal menyimpan analisis.' });
  }
}

export async function getHistory(req, res) {
  try {
    const result = await pool.query(
      `SELECT
        sar.*,
        fp.lat,
        fp.lng
       FROM soil_analysis_results sar
       JOIN field_points fp ON fp.id = sar.point_id
       WHERE sar.user_id = $1
       ORDER BY sar.created_at DESC`,
      [req.user.id]
    );

    return res.json(result.rows);
  } catch (err) {
    console.error('getHistory error:', err);
    return res.status(500).json({ message: 'Gagal mengambil riwayat analisis.' });
  }
}